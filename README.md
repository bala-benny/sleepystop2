# 🛑 SleepyStop — Never Miss Your Bus Stop Again

**Stay awake on your commute.** SleepyStop alerts you before your destination with smart geolocation tracking and customizable notifications. Perfect for tired travelers who don't want to oversleep their stop.

---

## 📋 Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Screenshots](#screenshots)
- [Demo Video](#demo-video)
- [Project Structure](#project-structure)
- [Team](#team)
- [License](#license)

---

## 📖 Project Description

**SleepyStop** is a full-stack web application designed to help commuters, travelers, and anyone on public transport avoid missing their destination due to fatigue, distraction, or dozing off.

The app works by:
1. Accepting a destination place name (e.g., "Times Square, NYC")
2. Converting the place name to GPS coordinates via OpenStreetMap Nominatim
3. Continuously tracking the user's real-time location
4. Calculating distance and ETA to the destination
5. **Triggering alerts at 5 minutes, 3 minutes, and 30 seconds before arrival**
6. Providing multi-modal notifications: visual toast, audio beep, browser notification, and haptic vibration

Built with vanilla JavaScript, Vite, Express.js, and the browser's Geolocation & Notifications APIs — **no bloat, just functionality.**

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Vanilla JavaScript** | ES6+ | Core logic (no framework bloat) |
| **Vite** | 5.0.0 | Dev server & build tool |
| **Poppins Font** | Google Fonts | UI typography |
| **CSS3** | — | Responsive styling, gradients, animations |

**Browser APIs Used:**
- `navigator.geolocation.watchPosition()` — Real-time location tracking
- `Notification API` — Browser notifications
- `Web Audio API` — Alert beeps
- `Vibration API` — Haptic feedback (mobile)
- `Fetch API` — HTTP requests to backend

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | v18+ | Runtime environment |
| **Express.js** | 5.2.1 | REST API framework |
| **Axios** | 1.13.5 | HTTP client for external APIs |
| **CORS** | 2.8.6 | Cross-origin request handling |
| **OpenStreetMap Nominatim** | — | Geocoding service (external) |

---

## ✨ Features

1. **🎯 Place-Name Geocoding**
   - Enter a destination name (e.g., "Grand Central Terminal, NYC")
   - Backend converts to precise latitude/longitude via OpenStreetMap Nominatim
   - No need to manually paste coordinates

2. **📍 Real-Time Location Tracking**
   - Continuous GPS tracking using `navigator.geolocation.watchPosition()`
   - Live display of current coordinates, distance, and ETA
   - Automatic speed calculation (averaged over time to reduce jitter)
   - Accuracy-aware: ignores GPS noise and stationary movement

3. **⏰ Smart Multi-Stage Alerts (5m / 3m / 30s)**
   - Distinct notifications at each threshold to give you time to prepare
   - Adaptive alerts for different travel speeds
   - Vibration feedback on mobile devices
   - Audio beep using Web Audio API
   - Browser Notification (if allowed)
   - On-screen toast messages

4. **📊 Visual Progress Tracking**
   - Real-time distance display (km)
   - Estimated Time of Arrival (ETA)
   - Animated progress bar (% of journey complete)
   - Travel speed in km/h
   - Live coordinates display
   - Activity log showing all alerts and arrival event

5. **🎨 Beautiful, Responsive UI**
   - Cute pastel gradient design
   - Mobile-first responsive layout
   - Accessibility features (aria-live regions)
   - Smooth animations and transitions

6. **⚡ Fast & Lightweight**
   - No heavy framework dependencies
   - Minimal build (Vite optimized)
   - Fast startup and responsiveness

---

## 🚀 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Modern browser (Chrome, Firefox, Safari, Edge with geolocation support)

### Clone & Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/SleepyStop-fullstack.git
cd SleepyStop-fullstack

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## ▶️ Running the Application

### Start Backend (Port 3000)

```bash
cd backend
node server.js
```

Expected output:
```
Backend running on port 3000 🚀
```

### Start Frontend Dev Server (Port 5173)

In a **new terminal**:

```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in XX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Access the App

Open your browser and navigate to:
```
http://localhost:5173/
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User Browser                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  SleepyStop Frontend (Vite + Vanilla JS)    │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │ UI Layer (HTML + CSS)                │   │   │
│  │  │ - Input: destination place name      │   │   │
│  │  │ - Output: alerts, progress, toasts   │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │ Logic Layer (app.js)                 │   │   │
│  │  │ - Geolocation tracking               │   │   │
│  │  │ - Distance/ETA calculation           │   │   │
│  │  │ - Alert threshold checking           │   │   │
│  │  │ - Notifications & audio              │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │ Browser APIs                         │   │   │
│  │  │ - Geolocation, Notifications, Audio  │   │   │
│  │  │ - Vibration, Fetch                   │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────┘   │
│                     ↕ (HTTP/Fetch)                 │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│              SleepyStop Backend (Express.js)        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ REST API Endpoints                           │  │
│  │ GET /geocode?place=<place_name>              │  │
│  │ - Input: place name (URL encoded)            │  │
│  │ - Output: {lat, lon, display_name, ...}      │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ External Service Integration                 │  │
│  │ → OpenStreetMap Nominatim API                │  │
│  │   (for geocoding place names to coords)      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 📡 API Documentation

### Backend Endpoints

#### GET `/geocode`

Convert a place name to GPS coordinates.

**Request:**
```http
GET http://localhost:3000/geocode?place=Times%20Square
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `place` | string | ✓ | Place name (URL-encoded) |

**Response (Success - 200):**
```json
{
  "place_id": 333041682,
  "lat": "40.7570095",
  "lon": "-73.9859724",
  "name": "Times Square",
  "display_name": "Times Square, Manhattan, New York, USA",
  "class": "highway",
  "type": "pedestrian",
  "boundingbox": ["40.7558313", "40.7591362", "-73.9870666", "-73.9845108"]
}
```

**Response (Not Found - 404):**
```json
{
  "error": "Place not found"
}
```

**Response (Error - 500):**
```json
{
  "error": "Geocoding failed"
}
```

**Example Usage (Frontend):**
```javascript
const place = "Times Square";
const response = await fetch(
  `http://localhost:3000/geocode?place=${encodeURIComponent(place)}`
);
const data = await response.json();
const { lat, lon } = data; // Use for tracking
```

---

## 📸 Screenshots

*Add screenshots here (3+ required):*

[
](https://drive.google.com/drive/folders/1mU7hCVjDZtrMh4MXW6X1XmB2iIh5IiZB?usp=drive_link)
---

## 🎬 Demo Video

**Demo Link:** [
](https://drive.google.com/drive/folders/1hgmqVlUAfeMkknZfEX-Ko-7DdkMtk_yA?usp=drive_link)
---

## 📁 Project Structure

```
SleepyStop-fullstack/
├── README.md                          # This file
├── LICENSE                            # MIT License
├── .gitignore                         # Git ignore file
│
├── backend/
│   ├── package.json                   # Backend dependencies (Express, Axios, CORS)
│   ├── server.js                      # Express server & /geocode endpoint
│   └── docs/                          # Backend documentation
│
├── frontend/
│   ├── package.json                   # Frontend dependencies (Vite)
│   ├── vite.config.js                 # Vite configuration
│   ├── index.html                     # HTML entry point
│   ├── src/
│   │   ├── main.js                    # Module entry point
│   │   ├── app.js                     # Main app logic (geolocation, alerts, UI)
│   │   └── style.css                  # UI styles (pastel design)
│   ├── .gitignore                     # Frontend gitignore (node_modules, dist)
│   └── README.md                      # Frontend-specific docs
│
└── docs/
    ├── architecture.md                # Architecture & system design
    ├── api.md                         # API documentation
    └── deployment.md                  # Deployment guide (optional)
```

---

## 👨‍💻 Team

**Created by:** Bala Benny  
                Gayathri Santhosh


---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

**You are free to:**
- ✅ Use, modify, and distribute this software
- ✅ Use it for commercial or personal projects
- ✅ Include it in proprietary applications (with attribution)

**You must:**
- 📋 Include the original license and copyright notice

---

## 🎯 Quick Start Recap

```bash
# Terminal 1: Start backend
cd backend
npm install
node server.js

# Terminal 2: Start frontend
cd frontend
npm install
npm run dev

# Browser: Open
http://localhost:5173/
```

---

## 🐛 Troubleshooting

### "Failed to geocode destination"
- Ensure backend is running on port 3000
- Test endpoint: `curl http://localhost:3000/geocode?place=Times%20Square`

### "Location unavailable"
- Allow location permission in browser settings
- Check OS privacy settings (macOS: System Settings → Privacy & Security → Location Services)
- Try disabling High Accuracy mode or increasing timeout

### "Alerts not showing"
- Allow notifications when prompted
- Ensure device supports notifications (works on most modern browsers)
- Check DevTools Console for errors

### Vite port already in use
```bash
# Kill process on port 5173 (macOS/Linux)
lsof -ti:5173 | xargs kill -9

# Or specify a different port
npx vite --port 5174
```

---

## 🚀 Future Enhancements

- [ ] Mobile app (React Native / Flutter)
- [ ] Saved favorite destinations
- [ ] Share trip status with friends
- [ ] Dark mode toggle
- [ ] Map view integration
- [ ] Multiple alerts per trip
- [ ] User authentication & profiles
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)

---


**Made with ❤️ for tired commuters everywhere.** 🛌✨


