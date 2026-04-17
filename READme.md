# ⚡ Sync Engine

A real-time LAN-based synchronization system for multi-device event execution with millisecond precision.

---

## 🚀 Overview

Sync Engine allows multiple devices connected on the same local network (WiFi or hotspot) to:

- Join shared “rooms”
- Sync their clocks to a server
- Schedule timed events
- Execute actions simultaneously (audio, UI effects, game events)
- Maintain accurate client tracking in real time

It is designed for **offline-first multiplayer synchronization** without relying on cloud infrastructure.

---

## 🧠 Key Features

### ⏱ Clock Synchronization
- Server-based time authority
- Round-trip latency compensation
- Continuous drift correction

### 🧩 Room System
- Create and join rooms with 5-character codes
- Auto cleanup when empty
- Real-time client tracking

### 📡 LAN QR Connection
- Auto-detects local network interfaces
- Generates QR codes for instant mobile joining
- Works over hotspot without internet

### 🎯 Event Scheduling
Supported event types:
- `SYNC_TEST` → UI flash test
- `PLAY_AUDIO` → synchronized audio playback
- Custom extensible event system

### 🃏 Sync UI Card
- Animated flip card showing real-time offset
- Visual sync heartbeat indicator

---

## 🏗 Tech Stack

- Node.js
- Express
- Socket.IO
- QRCode (LAN pairing)
- Vanilla HTML/CSS/JS frontend

---

## 📁 Project Structure
Sync Engine/
│
├── server.js
├── package.json
│
├── public/
│ ├── index.html
│ ├── style1.css
│ ├── script1.js
│
└── README.md

---

## ⚙️ Installation

### 1. Clone project
```bash
git clone <repo-url>
cd sync-engine
2. Install dependencies
npm install
3. Start server
node server.js

or for auto-reload:

npx nodemon server.js
📱 Usage
Step 1: Start server

Run on your laptop or host device.

Step 2: Connect devices
Open the app on multiple devices
Scan QR code OR enter room code
Ensure same WiFi / hotspot network
Step 3: Create or join room
Create a room → generates sync environment
Join room → connects to existing session
Step 4: Trigger events
Sync Test → visual flash across devices
Play Song → synchronized audio playback
Sync Now → recalibrates clocks
🔄 How Sync Works
Client requests server time
Server responds with timestamp
Client calculates round-trip delay

Offset is computed:

offset = serverTime - (clientTime + RTT/2)

All future events use adjusted clock:

syncedNow = Date.now() + offset
🎵 Use Cases
Synchronized music playback across phones
LAN party game systems
Live DJ multi-device output
Classroom or presentation syncing tools
Experimental distributed UI systems
⚠️ Limitations
Requires same network (WiFi/hotspot)
Audio sync depends on browser autoplay policies
Not yet peer-to-peer (server required)
🚀 Future Upgrades

Planned improvements:

WebRTC peer-to-peer sync mode
Beat-based audio synchronization engine
Drift correction AI smoothing
Host “DJ control mode”
Offline mesh networking support
👨‍💻 Author

Built as an experimental real-time synchronization engine focused on low-latency multi-device coordination.

📜 License

MIT