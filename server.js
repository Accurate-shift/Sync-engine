const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");
const QRCode = require("qrcode");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/* ---------------------------
   STATE
----------------------------*/
const rooms = new Map(); // roomCode -> { clients:Set, events:[] }
const socketRoomMap = new Map();

/* ---------------------------
   ROOM CODE
----------------------------*/
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/* ---------------------------
   LAN QR
----------------------------*/
function getLanInterfaces(port) {
  const nets = os.networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        results.push({
          name,
          url: `http://${net.address}:${port}`,
        });
      }
    }
  }
  return results;
}

async function buildQrData(port) {
  const interfaces = getLanInterfaces(port);

  return Promise.all(
    interfaces.map(async (iface) => ({
      ...iface,
      qr: await QRCode.toDataURL(iface.url),
    }))
  );
}

/* ---------------------------
   SOCKET.IO
----------------------------*/
io.on("connection", (socket) => {
  let currentRoom = null;

  /* ---- TIME SYNC ---- */
  socket.on("requestTimeSync", () => {
    socket.emit("timeSync", { serverTime: Date.now() });
  });

  /* ---- CREATE ROOM ---- */
  socket.on("createRoom", (cb) => {
    const code = generateRoomCode();

    rooms.set(code, {
      clients: new Set(),
      events: [],
    });

    socket.join(code);
    currentRoom = code;

    rooms.get(code).clients.add(socket.id);
    socketRoomMap.set(socket.id, code);

    cb?.({ success: true, roomCode: code });

    io.to(code).emit("clientList", [...rooms.get(code).clients]);
  });

  /* ---- JOIN ROOM ---- */
  socket.on("joinRoom", (code, cb) => {
    const room = rooms.get(code);

    if (!room) return cb?.({ success: false, error: "Room not found" });

    socket.join(code);
    currentRoom = code;

    room.clients.add(socket.id);
    socketRoomMap.set(socket.id, code);

    cb?.({
      success: true,
      roomCode: code,
      eventQueue: room.events,
    });

    io.to(code).emit("clientList", [...room.clients]);
  });

  /* ---- LEAVE ROOM (NEW) ---- */
  socket.on("leaveRoom", () => {
    const roomCode = socketRoomMap.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    socket.leave(roomCode);
    room.clients.delete(socket.id);
    socketRoomMap.delete(socket.id);

    io.to(roomCode).emit("clientList", [...room.clients]);

    if (room.clients.size === 0) {
      rooms.delete(roomCode);
    }

    currentRoom = null;
  });

  /* ---- EVENTS ---- */
  socket.on("scheduleEvent", (data) => {
    if (!currentRoom) return;

    const room = rooms.get(currentRoom);
    if (!room) return;

    const event = {
      id: `${Date.now()}-${Math.random()}`,
      type: data.type,
      payload: data.payload || {},
      executeAt: Date.now() + (data.delayMs || 0),
    };

    room.events.push(event);

    io.to(currentRoom).emit("eventScheduled", event);
  });

  /* ---- DISCONNECT (FIXED) ---- */
  socket.on("disconnect", () => {
    const roomCode = socketRoomMap.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    room.clients.delete(socket.id);
    socketRoomMap.delete(socket.id);

    io.to(roomCode).emit("clientList", [...room.clients]);

    if (room.clients.size === 0) {
      rooms.delete(roomCode);
    }
  });
});

/* ---------------------------
   API
----------------------------*/
app.get("/api/connection-info", async (req, res) => {
  try {
    const port = server.address().port;
    const interfaces = await buildQrData(port);
    res.json({ interfaces });
  } catch {
    res.json({ interfaces: [] });
  }
});

/* ---------------------------
   START
----------------------------*/
const PORT = 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Sync Engine running at http://localhost:${PORT}`);
});