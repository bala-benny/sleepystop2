function fmtTime(s) {
  if (s === Infinity) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = n => (n * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function createHeader() {
  return `
    <header class="site-header">
      <h1>SleepyStop</h1>
      <p class="tag">Alert me before my stop — 5m, 3m, 30s</p>
    </header>
  `
}

function createControls() {
  return `
    <div class="controls">
      <div class="field" style="flex:1">
        <label>Destination (place name)</label>
        <input id="destName" placeholder="e.g. Main St & 1st, City" />
      </div>
      <div class="controls-vert">
        <button id="start">Start Trip</button>
        <button id="stop">Stop</button>
      </div>
    </div>
  `
}

function createStatus() {
  return `
    <div class="status">
      <div>Distance: <span id="distance">—</span></div>
      <div>ETA: <span id="eta">—</span></div>
      <div id="alertsFired" class="muted">Alerts: none</div>
    </div>
  `
}

function notify(message) {
  try {
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('SleepyStop', { body: message })
    }
  } catch (e) {}
  // page title flash
  const prev = document.title
  document.title = `${message} — ${prev}`
  setTimeout(() => (document.title = prev), 3000)
  // beep
  try {
    // use a shared AudioContext if available (created on user gesture)
    const ctx = (window && window.__sleepy_audio_ctx) || null
    if (ctx) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      o.connect(g)
      g.connect(ctx.destination)
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.01)
      o.start()
      setTimeout(() => {
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
        try { o.stop(ctx.currentTime + 0.06) } catch(e){}
      }, 200)
    }
  } catch (e) {}
}

export function initApp() {
  const root = document.getElementById('app')
  root.innerHTML = `
    <div class="card">
      ${createHeader()}
      <main class="main">
        ${createControls()}
        <section class="results">
          <div id="toast" aria-live="polite"></div>
          <div class="info-card">
            ${createStatus()}
            <div class="tracking-row">
              <div class="tracking-badge"><span class="dot"></span><span id="trackLabel">Not tracking</span></div>
              <div style="margin-left:auto" class="coords" id="coords">lat: — lon: —</div>
            </div>
            <div class="progress-wrap"><div id="progress" class="progress"></div></div>
            <div id="speed" class="muted" style="margin-top:8px">Speed: —</div>
          </div>
          <div id="log" class="log muted">No trip running</div>
        </section>
      </main>
      <footer class="foot">Built with Vite • Vanilla JS</footer>
    </div>
  `

  const destName = document.getElementById('destName')
  const startBtn = document.getElementById('start')
  const stopBtn = document.getElementById('stop')
  const distanceEl = document.getElementById('distance')
  const etaEl = document.getElementById('eta')
  const trackLabel = document.getElementById('trackLabel')
  const coordsEl = document.getElementById('coords')
  const speedEl = document.getElementById('speed')
  const progressEl = document.getElementById('progress')
  const log = document.getElementById('log')
  const alertsFired = document.getElementById('alertsFired')
  const toast = document.getElementById('toast')

  let watchId = null
  let lastPos = null
  let lastTime = null
  let avgSpeed = null // m/s
  let initialDistance = null
  let audioCtx = null
  const defaultspeed = 8 // m/s ~ 28.8 km/h
  const thresholds = [300, 180, 30]
  const fired = { 300: false, 180: false, 30: false }

  function resetState() {
    if (watchId) navigator.geolocation.clearWatch(watchId)
    watchId = null
    lastPos = null
    lastTime = null
    avgSpeed = null
    initialDistance = null
    for (const k of Object.keys(fired)) fired[k] = false
    distanceEl.textContent = '—'
    etaEl.textContent = '—'
    alertsFired.textContent = 'Alerts: none'
    log.textContent = 'No trip running'
    trackLabel.textContent = 'Not tracking'
    coordsEl.textContent = 'lat: — lon: —'
    speedEl.textContent = 'Speed: —'
    progressEl.style.width = '0%'
  }

  function showToast(message, timeout = 5000) {
    if (!toast) return
    const el = document.createElement('div')
    el.className = 'toast-entry'
    el.textContent = message
    toast.appendChild(el)
    setTimeout(() => {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 300)
    }, timeout)
  }

  function updateAlertsList() {
    const done = thresholds.filter(t => fired[t]).map(t => (t / 60) + 'm').join(', ')
    alertsFired.textContent = done ? `Alerts: ${done}` : 'Alerts: none'
  }

  startBtn.addEventListener('click', async () => {
    const place = destName.value.trim()
    if (!place) return alert('Enter a destination place name')

    // call backend geocoding
    let lat, lon
    try {
      const r = await fetch(`http://localhost:3000/geocode?place=${encodeURIComponent(place)}`)
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        return alert(body.error || 'Place not found')
      }
      const data = await r.json()
      lat = parseFloat(data.lat)
lon = parseFloat(data.lon)

if (isNaN(lat) || isNaN(lon)) {
  return alert('Geocoding returned invalid coordinates')
}
    } catch (e) {
      return alert('Failed to geocode destination: ' + e.message)
    }
    // request notification permission and prepare audio (must be done on user gesture)
    if (window.Notification && Notification.permission !== 'granted') {
      try { await Notification.requestPermission() } catch (e) { console.warn('Notification permission request failed', e) }
    }
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
      if (audioCtx.state === 'suspended') await audioCtx.resume()
      // expose for notify
      window.__sleepy_audio_ctx = audioCtx
    } catch (e) {
      console.warn('AudioContext unavailable', e)
      audioCtx = null
    }

    resetState()
    log.textContent = `Tracking towards: ${place}`

    function onPos(p) {
        console.log("Destination:", lat, lon)
      const now = Date.now()
      const cur = { lat: p.coords.latitude, lon: p.coords.longitude }
      const dist = haversine(cur.lat, cur.lon, lat, lon)
      distanceEl.textContent = `${(dist / 1000).toFixed(2)} km`
      coordsEl.textContent = `lat: ${cur.lat.toFixed(5)} lon: ${cur.lon.toFixed(5)}`

      // estimate speed: use reported speed or derive from delta
      let speed = (typeof p.coords.speed === 'number' && isFinite(p.coords.speed)) ? p.coords.speed : null
      // derive speed from delta only when movement exceeds accuracy and time is reasonable
      if ((speed === null || isNaN(speed)) && lastPos && lastTime) {
        const d = haversine(lastPos.lat, lastPos.lon, cur.lat, cur.lon)
        const dt = (now - lastTime) / 1000
        const accuracy = (p.coords.accuracy && isFinite(p.coords.accuracy)) ? p.coords.accuracy : 0
        if (dt >= 0.8 && d > Math.max(3, accuracy)) { // require >=0.8s and >3m (or accuracy)
          speed = d / dt
        }
      }
      // sanity-check and update running average only for reasonable speeds
      if (speed !== null && isFinite(speed) && speed > 0.2 && speed < 100) {
        avgSpeed = avgSpeed ? (avgSpeed * 0.7 + speed * 0.3) : speed
      }
      const usedSpeed = (avgSpeed && avgSpeed > 0.2) ? avgSpeed : (speed && speed > 0.2) ? speed : null
      const eta = usedSpeed ? dist / usedSpeed : Infinity
      etaEl.textContent = usedSpeed ? fmtTime(eta) : '—'
      speedEl.textContent = `Speed: ${ (usedSpeed*3.6).toFixed(1) } km/h`

      // set initial distance for progress
      if (initialDistance === null) initialDistance = dist
      if (initialDistance && initialDistance > 10) {
        const progress = Math.max(0, Math.min(1, (initialDistance - dist) / initialDistance))
        progressEl.style.width = `${(progress*100).toFixed(1)}%`
      }

      trackLabel.textContent = 'Tracking'

      // check thresholds
      for (const t of thresholds) {
        if (!fired[t] && eta <= t) {
          fired[t] = true
          const minutes = t >= 60 ? `${t/60}m` : `${t}s`
          const msg = `Arriving in ${minutes}`
          notify(msg)
          showToast(msg)
          // short vibration for mobile if available
          try { if (navigator.vibrate) navigator.vibrate(200) } catch(e){}
          const entry = document.createElement('div')
          entry.className = 'log-entry'
          entry.textContent = `${new Date().toLocaleTimeString()} — ${msg}`
          log.prepend(entry)
          updateAlertsList()
        }
      }

      if (dist <= 25) {
        notify('You have arrived')
        showToast('You have arrived')
        try { if (navigator.vibrate) navigator.vibrate([200,100,200]) } catch(e){}
        log.prepend(Object.assign(document.createElement('div'), { className: 'log-entry', textContent: `${new Date().toLocaleTimeString()} — Arrived` }))
        resetState()
      }

      lastPos = cur
      lastTime = now
    }

    if (!navigator.geolocation) return alert('Geolocation not supported')
    function positionError(err) {
      console.warn('Geolocation error', err)
      // Show a friendly message
      const msg = err && err.code === 1 ? 'Permission denied' : 'Location unavailable'
      showToast(msg)
      // Try a single fallback with lower accuracy and longer timeout
      navigator.geolocation.getCurrentPosition(onPos, e => {
        console.error('Fallback getCurrentPosition failed', e)
        showToast('Unable to determine location. Check browser/OS settings.')
      }, { enableHighAccuracy: false, timeout: 20000 })
    }

    watchId = navigator.geolocation.watchPosition(onPos, positionError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 })
  })

  stopBtn.addEventListener('click', () => {
    resetState()
  })

  resetState()
}
