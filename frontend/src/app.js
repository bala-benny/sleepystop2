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

      <div class="field">
        <label>Alert Style</label>
        <select id="alertMode">
          <option value="normal">Normal</option>
          <option value="funny">Funny</option>
          <option value="aggressive">Aggressive</option>
        </select>
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

function notify(message, mode = "normal") {

  let finalMessage = message

  if (mode === "funny") {
    finalMessage = "🚀 Wake up sleepy head! " + message
  }

  if (mode === "aggressive") {
    finalMessage = "🚨 WAKE UP!!! " + message
  }

  // Notification popup
  try {
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('SleepyStop', { body: finalMessage })
    }
  } catch (e) {}

  // Title flash
  const prev = document.title
  document.title = `${finalMessage} — ${prev}`
  setTimeout(() => (document.title = prev), 3000)

  // 🎧 ADVANCED ALARM SOUND
  try {
    const ctx = window.__sleepy_audio_ctx || null
    if (!ctx) return

    function playTone(freq, time, length,volume=0.6) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()

      o.type = 'sine'
      o.frequency.value = freq

      o.connect(g)
      g.connect(ctx.destination)

      g.gain.setValueAtTime(0.0001, ctx.currentTime + time)
      g.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + time + 0.01)

      o.start(ctx.currentTime + time)
      o.stop(ctx.currentTime + time + length)
    }

    if (mode === "normal") {
      playTone(700, 0, 0.15,0.6)
      playTone(700, 0.25, 0.15,0.6)
    }

    if (mode === "funny") {
      playTone(500, 0, 0.15,0.7)
      playTone(700, 0.2, 0.15,0.7)
      playTone(900, 0.4, 0.2,0.7)
    }

    if (mode === "aggressive") {
      for (let i = 0; i < 4; i++) {
        playTone(1200, i * 0.3, 0.2,1.0)
      }
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
  const alertModeSelect = document.getElementById('alertMode')
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
  const cur = {
    lat: p.coords.latitude,
    lon: p.coords.longitude
  }

  const dist = haversine(cur.lat, cur.lon, lat, lon)

  console.log("Current:", cur.lat, cur.lon)
  console.log("Distance:", dist)

  distanceEl.textContent = `${(dist / 1000).toFixed(2)} km`
  coordsEl.textContent = `lat: ${cur.lat.toFixed(5)} lon: ${cur.lon.toFixed(5)}`

  // --------------------------------------------------
  // SPEED CALCULATION (Robust Version)
  // --------------------------------------------------

  let speed = (typeof p.coords.speed === 'number' && isFinite(p.coords.speed))
    ? p.coords.speed
    : null

  // If browser doesn't provide speed, calculate manually
  if ((speed === null || isNaN(speed)) && lastPos && lastTime) {

    const d = haversine(lastPos.lat, lastPos.lon, cur.lat, cur.lon)
    const dt = (now - lastTime) / 1000 // seconds

    console.log("Delta distance:", d)
    console.log("Delta time:", dt)

    // Allow small movements (less strict than before)
    if (dt >= 1 && d > 1) {
      speed = d / dt // meters per second
    }
  }

  // Smooth speed (running average)
  if (speed !== null && isFinite(speed) && speed > 0.2 && speed < 50) {
    avgSpeed = avgSpeed
      ? (avgSpeed * 0.7 + speed * 0.3)
      : speed
  }

  const usedSpeed =
    (avgSpeed && avgSpeed > 0.2)
      ? avgSpeed
      : (speed && speed > 0.2)
        ? speed
        : null

  console.log("Raw speed:", p.coords.speed)
  console.log("Used speed:", usedSpeed)

  // --------------------------------------------------
  // ETA
  // --------------------------------------------------

  const eta = usedSpeed ? dist / usedSpeed : Infinity

  etaEl.textContent = usedSpeed ? fmtTime(eta) : '—'

  speedEl.textContent = usedSpeed
    ? `Speed: ${(usedSpeed * 3.6).toFixed(1)} km/h`
    : `Speed: —`

  // --------------------------------------------------
  // PROGRESS BAR
  // --------------------------------------------------

  if (initialDistance === null) initialDistance = dist

  if (initialDistance && initialDistance > 10) {
    const progress = Math.max(
      0,
      Math.min(1, (initialDistance - dist) / initialDistance)
    )
    progressEl.style.width = `${(progress * 100).toFixed(1)}%`
  }

  trackLabel.textContent = 'Tracking'

  // --------------------------------------------------
  // ALERT THRESHOLDS
  // --------------------------------------------------

  for (const t of thresholds) {
    if (!fired[t] && eta <= t) {

      fired[t] = true

      const minutes = t >= 60 ? `${t / 60}m` : `${t}s`
      const msg = `Arriving in ${minutes}`

      notify(msg, alertModeSelect.value)
      showToast(msg)

      try {
        if (navigator.vibrate) navigator.vibrate(200)
      } catch (e) {}

      const entry = document.createElement('div')
      entry.className = 'log-entry'
      entry.textContent = `${new Date().toLocaleTimeString()} — ${msg}`
      log.prepend(entry)

      updateAlertsList()
    }
  }

  // --------------------------------------------------
  // ARRIVAL CHECK
  // --------------------------------------------------

  if (dist <= 25) {

    notify('You have arrived', alertModeSelect.value)
    showToast('You have arrived')

    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    } catch (e) {}

    const entry = document.createElement('div')
    entry.className = 'log-entry'
    entry.textContent = `${new Date().toLocaleTimeString()} — Arrived`
    log.prepend(entry)

    resetState()
  }

  // --------------------------------------------------
  // STORE LAST POSITION
  // --------------------------------------------------

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
window.notify = notify