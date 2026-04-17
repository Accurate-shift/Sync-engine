const socket = io({
  reconnectionDelayMax: 3000,
  reconnectionAttempts: Infinity,
});

let clockOffset = 0;

function syncedNow() {
  return Date.now() + clockOffset;
}

const pendingEvents = new Map();

/* ---------------------------
   ELEMENTS
----------------------------*/
const lobbyScreen      = document.getElementById("lobbyScreen");
const roomScreen       = document.getElementById("roomScreen");
const createRoomBtn    = document.getElementById("createRoomBtn");
const joinRoomBtn      = document.getElementById("joinRoomBtn");
const roomCodeInput    = document.getElementById("roomCodeInput");
const lobbyError       = document.getElementById("lobbyError");
const connectPanel     = document.getElementById("connectPanel");
const qrList           = document.getElementById("qrList");
const noLan            = document.getElementById("noLan");
const refreshLanBtn    = document.getElementById("refreshLanBtn");

const roomCodeDisplay  = document.getElementById("roomCodeDisplay");
const clientCountEl    = document.getElementById("clientCount");

const showConnectBtn   = document.getElementById("showConnectBtn");
const qrSheet          = document.getElementById("qrSheet");
const qrSheetList      = document.getElementById("qrSheetList");
const closeQrBtn       = document.getElementById("closeQrBtn");

const statusDot        = document.getElementById("statusDot");
const statusText       = document.getElementById("statusText");

const serverTimeClock  = document.getElementById("serverTimeClock");
const clockOffsetEl    = document.getElementById("clockOffset");
const localTimeClockEl = document.getElementById("localTimeClock");

const testEventBtn     = document.getElementById("testEventBtn");
const audioEventBtn    = document.getElementById("audioEventBtn");
const syncNowBtn       = document.getElementById("syncNowBtn");

const eventQueueEl     = document.getElementById("eventQueue");
const activityLogEl    = document.getElementById("activityLog");

/* ---------------------------
   STATUS
----------------------------*/
function setStatus(state, text) {
  statusDot.className = "status-dot " + state;
  statusText.textContent = text;
}

socket.on("connect", () => setStatus("connected", "Connected"));
socket.on("disconnect", () => setStatus("disconnected", "Disconnected"));
socket.on("reconnecting", () => setStatus("reconnecting", "Reconnecting..."));
socket.on("reconnect", () => {
  setStatus("connected", "Reconnected");
  requestSync();
});

/* ---------------------------
   CLOCK SYNC
----------------------------*/
let _syncSentAt = 0;

function requestSync() {
  _syncSentAt = Date.now();
  socket.emit("requestTimeSync");
}

socket.on("timeSync", ({ serverTime }) => {
  const rtt = Date.now() - _syncSentAt;
  clockOffset = Math.round((serverTime + rtt / 2) - Date.now());

  // update card
  syncOffsetDisplay.textContent =
    (clockOffset >= 0 ? "+" : "") + clockOffset + " ms";

  // flip animation
  syncCard.classList.add("flipped");

  setTimeout(() => {
    syncCard.classList.remove("flipped");
  }, 800);
});

setInterval(() => {
  serverTimeClock.textContent  = formatTime(syncedNow());
  localTimeClockEl.textContent = formatTime(Date.now());
  clockOffsetEl.textContent    = (clockOffset >= 0 ? "+" : "") + clockOffset + " ms";
  refreshCountdowns();
}, 100);

/* ---------------------------
   ROOM
----------------------------*/
function enterRoom(roomCode, existingEvents = []) {
  roomCodeDisplay.textContent = roomCode;

  lobbyScreen.classList.add("hidden");
  roomScreen.classList.remove("hidden");

  addLog(`Joined room ${roomCode}`);

  existingEvents.forEach(handleIncomingEvent);

  requestSync();
}

/* CREATE */
createRoomBtn.addEventListener("click", () => {
  socket.emit("createRoom", (res) => {
    if (!res.success) {
      lobbyError.textContent = "Failed to create room";
      return;
    }

    enterRoom(res.roomCode);
    connectPanel.classList.remove("hidden");
    loadConnectionInfo(qrList);
  });
});

/* JOIN */
joinRoomBtn.addEventListener("click", () => {
  const code = roomCodeInput.value.trim();

  socket.emit("joinRoom", code, (res) => {
    if (!res.success) {
      lobbyError.textContent = res.error || "Join failed";
      return;
    }

    enterRoom(res.roomCode, res.eventQueue || []);
  });
});

/* LEAVE (NEW) */
const leaveRoomBtn = document.getElementById("leaveRoomBtn");

leaveRoomBtn?.addEventListener("click", () => {
  socket.emit("leaveRoom");
  location.reload();
});

/* CLIENT COUNT */
socket.on("clientList", (clients) => {
  clientCountEl.textContent =
    `${clients.length} client${clients.length !== 1 ? "s" : ""}`;
});

/* ---------------------------
   EVENTS
----------------------------*/
socket.on("eventScheduled", handleIncomingEvent);

function handleIncomingEvent(event) {
  if (pendingEvents.has(event.id)) return;

  const delay = event.executeAt - syncedNow();

  const entry = { event, fired: false, timerId: null };
  pendingEvents.set(event.id, entry);

  if (delay <= 0) fireEvent(event.id);
  else entry.timerId = setTimeout(() => fireEvent(event.id), delay);

  renderEventList();
}

function fireEvent(id) {
  const entry = pendingEvents.get(id);
  if (!entry || entry.fired) return;

  entry.fired = true;

  const event = entry.event;

  addLog(`Executed ${event.type}`, true);

  if (event.type === "SYNC_TEST") flashScreen("#7c6ff755");
  if (event.type === "PLAY_AUDIO") {
    playSong();
    flashScreen("#4ea8de44");
  }

  setTimeout(() => {
    pendingEvents.delete(id);
    renderEventList();
  }, 3000);

  renderEventList();
}

/* ---------------------------
   UI HELPERS
----------------------------*/
function addLog(msg, ok = false) {
  const el = document.createElement("div");
  el.className = "log-entry" + (ok ? " ok" : "");
  el.innerHTML = `<span class="ts">${formatTime(syncedNow())}</span> ${msg}`;
  activityLogEl.prepend(el);
}

function formatTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", { hour12: false }) +
    "." + String(d.getMilliseconds()).padStart(3, "0");
}

function flashScreen(color) {
  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "fixed",
    inset: 0,
    background: color,
    zIndex: 999,
    pointerEvents: "none",
    transition: "opacity .6s"
  });

  document.body.appendChild(div);

  requestAnimationFrame(() => {
    div.style.opacity = 0;
    setTimeout(() => div.remove(), 600);
  });
}

/* AUDIO */
const audio = new Audio("public\audio\Beethoven - Symphony No. 5.mp3");

function playSong() {
  audio.currentTime = 0;
  audio.play().catch(() => addLog("Tap screen to enable audio"));
}

/* SYNC */
syncNowBtn.addEventListener("click", () => {
  requestSync();
  addLog("Manual sync");
});