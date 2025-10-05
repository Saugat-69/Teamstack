const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Upload config
function resolveRoomFromReq(req) {
  const raw = ((req.query && req.query.room) || req.body?.room || "world").toString();
  const trimmed = raw.trim();
  // Sanitize: allow letters, numbers, dash, underscore and dot; fallback to world
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "");
  return safe || "world";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const room = resolveRoomFromReq(req);
    const roomPath = path.join(uploadDir, room);
    try {
      if (!fs.existsSync(roomPath)) fs.mkdirSync(roomPath, { recursive: true });
      cb(null, roomPath);
    } catch (e) {
      console.error("Failed to ensure room folder for", room, e);
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.use(express.static("public"));
app.use("/uploads", express.static(uploadDir));

let roomData = {}; // Stores: { text, files, password, isPrivate, isLAN, lanIPs, createdAt, connectors:Set, users: Map<socketId,{name,role,muted?:boolean}>, adminSocketId?: string, adminToken?: string }

function hydrateRoomFilesFromDisk(room) {
  try {
    const dir = path.join(uploadDir, room);
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);
    return entries.map((fname) => {
      const dashIdx = fname.indexOf("-");
      const originalName = dashIdx > -1 ? fname.slice(dashIdx + 1) : fname;
      return { filename: fname, originalName, timestamp: Date.now() };
    });
  } catch (e) {
    console.error("Failed to hydrate files for room", room, e);
    return [];
  }
}

function listRooms() {
  try {
    const diskRooms = new Set(
      fs.readdirSync(uploadDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    );
    const memoryRooms = Object.keys(roomData || {});
    for (const r of memoryRooms) diskRooms.add(r);
    return Array.from(diskRooms).map((name) => ({
      name,
      isPrivate: Boolean(roomData[name]?.isPrivate && roomData[name]?.password),
    }));
  } catch (e) {
    console.error("listRooms error", e);
    return [];
  }
}

function pruneRoomUsers(room) {
  try {
    const info = roomData[room];
    if (!info || !info.users) return;
    for (const socketId of Array.from(info.users.keys())) {
      const sock = io.sockets.sockets.get(socketId);
      const inThisRoom = !!(sock && sock.rooms && sock.rooms.has(room));
      if (!inThisRoom) info.users.delete(socketId);
    }
  } catch {}
}

function ensureSingleAdmin(room) {
  const info = roomData[room];
  if (!info || !info.users) return;
  const adminId = info.adminSocketId;
  for (const [sid, usr] of info.users.entries()) {
    if (sid === adminId) {
      if (usr.role !== 'admin') info.users.set(sid, { ...usr, role: 'admin' });
    } else {
      if (usr.role === 'admin') info.users.set(sid, { ...usr, role: 'member' });
    }
  }
}

const CLEAN_INTERVAL = 60 * 1000; // 1 minute
const NEVER_USED_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
const EXPIRE_PUBLIC = 15 * 60 * 1000; // 15 minutes
const EXPIRE_PRIVATE = 30 * 60 * 1000; // 30 minutes

// Clean expired files periodically
setInterval(() => {
  const now = Date.now();
  for (const room in roomData) {
    if (!roomData[room].files) continue;
    roomData[room].files = roomData[room].files.filter((file) => {
      const expired =
        now - file.timestamp >
        (roomData[room].isPrivate ? EXPIRE_PRIVATE : EXPIRE_PUBLIC);
      if (expired) {
        const filePath = path.join(uploadDir, room, file.filename);
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }
      return !expired;
    });
    // Remove empty room folders that were never used by more than one connector in 24h
    try {
      const info = roomData[room];
      if (
        info && info.connectors && info.connectors.size <= 1 &&
        Date.now() - info.createdAt > NEVER_USED_WINDOW &&
        (info.files?.length || 0) === 0
      ) {
        const dir = path.join(uploadDir, room);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
        delete roomData[room];
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }
}, CLEAN_INTERVAL);

// Helpers to detect IP and compare subnets
const getIp = (socket) => {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  return (forwarded ? forwarded.split(",")[0] : socket.handshake.address || "").replace("::ffff:", "");
};

const sameSubnet = (ip1, ip2) => {
  const a = ip1.split(".").slice(0, 3).join(".");
  const b = ip2.split(".").slice(0, 3).join(".");
  return a === b;
};

io.on("connection", (socket) => {
  let joinedRoom = "";

  // Rooms listing via socket
  socket.on("get-rooms", () => {
    socket.emit("rooms", listRooms());
  });
  // Send current user list for joined room
  socket.on("who", () => {
    if (!joinedRoom) return;
    pruneRoomUsers(joinedRoom);
    const users = roomData[joinedRoom]?.users;
    if (users) {
      socket.emit("user-list", Array.from(users.entries()).map(([id,u]) => ({ id, name: u.name, role: u.role, muted: !!u.muted })));
      const me = users.get(socket.id);
      if (me) socket.emit('you', { id: socket.id, name: me.name, role: me.role, muted: !!me.muted });
    }
  });

  socket.on("join", ({ room, password, private: isPrivate, adminToken: clientAdminToken }) => {
    const ip = getIp(socket);
    console.log(`Socket ${socket.id} (${ip}) trying to join: ${room} (private: ${isPrivate})`);

    // LAN Room Access Control
    if (room.startsWith("lan_")) {
      const allowedIPs = roomData[room]?.lanIPs || [];
      const matched = allowedIPs.some(existingIP => sameSubnet(existingIP, ip));

      if (allowedIPs.length > 0 && !matched) {
        socket.emit("unauthorized", "Access denied. Not on same Wi-Fi.");
        console.log(`Denied: ${ip} not in same subnet as ${allowedIPs}`);
        return;
      }

      if (!allowedIPs.includes(ip)) {
        roomData[room] ||= {
          text: "",
          files: [],
          password: null,
          isPrivate: false,
          isLAN: true,
          lanIPs: [],
          createdAt: Date.now(),
          connectors: new Set(),
        };
        roomData[room].lanIPs.push(ip);
      }
    }

    // Leave previous room and update its user list
    if (joinedRoom) {
      const prev = joinedRoom;
      socket.leave(prev);
      const prevUsers = roomData[prev]?.users;
      if (prevUsers) {
        prevUsers.delete(socket.id);
        io.to(prev).emit("user-list", Array.from(prevUsers.values()).map(u => u.name));
      }
      console.log(`Socket ${socket.id} left room: ${prev}`);
    }

    // Private room check
    if (roomData[room]) {
      if (roomData[room].isPrivate && roomData[room].password !== password) {
        socket.emit("unauthorized", "Incorrect password.");
        return;
      }
    } else {
      roomData[room] = {
        text: "",
        files: [],
        password: isPrivate ? password : null,
        isPrivate,
        isLAN: room.startsWith("lan_"),
        lanIPs: room.startsWith("lan_") ? [ip] : [],
        createdAt: Date.now(),
        connectors: new Set(),
        users: new Map(),
        adminSocketId: undefined,
        adminToken: undefined,
      };
    }

    joinedRoom = room;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);

    // Track unique connectors for the room
    try {
      roomData[room].connectors.add(getIp(socket));
    } catch {}

    // Register user as Guest N
    try {
      const existingUsers = roomData[room].users || new Map();
      roomData[room].users = existingUsers;
      pruneRoomUsers(room);
      const currentNames = new Set(Array.from(existingUsers.values()).map(u => u.name));
      let guestNumber = 1;
      while (currentNames.has(`Guest ${guestNumber}`)) guestNumber++;
      const userName = `Guest ${guestNumber}`;
      const isFirstUser = existingUsers.size === 0 && !roomData[room].adminSocketId;
      let role = 'member';
      if (isFirstUser) {
        role = 'admin';
        roomData[room].adminToken = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        roomData[room].adminSocketId = socket.id;
      } else if (clientAdminToken && clientAdminToken === roomData[room].adminToken) {
        // Transfer admin to this socket; demote previous admin if present
        role = 'admin';
        const prevAdminId = roomData[room].adminSocketId;
        if (prevAdminId && existingUsers.has(prevAdminId) && prevAdminId !== socket.id) {
          const prev = existingUsers.get(prevAdminId);
          existingUsers.set(prevAdminId, { ...prev, role: 'member' });
        }
        roomData[room].adminSocketId = socket.id;
      }
      existingUsers.set(socket.id, { name: userName, role });
      ensureSingleAdmin(room);
      io.to(room).emit("user-list", Array.from(existingUsers.entries()).map(([id,u]) => ({ id, name: u.name, role: u.role, muted: !!u.muted })));
      socket.emit('you', { room, id: socket.id, name: userName, role, muted: false, adminToken: role === 'admin' ? roomData[room].adminToken : undefined });
    } catch (e) { console.error('user add error', e); }

    // Ensure files list reflects disk on first join after restart
    if (!roomData[room].files || roomData[room].files.length === 0) {
      roomData[room].files = hydrateRoomFilesFromDisk(room);
    }

    socket.emit("text", roomData[room].text);
    socket.emit(
      "file-list",
      roomData[room].files.map((f) => ({
        link: `/uploads/${room}/${f.filename}`,
        name: f.originalName,
        filename: f.filename,
      }))
    );
  });

  socket.on("text", ({ text }) => {
    if (!joinedRoom) return;
    const info = roomData[joinedRoom];
    if (info?.users?.get(socket.id)?.muted) return;
    info.text = text;
    socket.to(joinedRoom).emit("text", { text });
  });

  socket.on("typing", (user) => {
    if (!joinedRoom) return;
    const info = roomData[joinedRoom];
    if (info?.users?.get(socket.id)?.muted) return;
    socket.to(joinedRoom).emit("typing", user);
  });

  socket.on('set-name', ({ name, room }, ack) => {
    const targetRoom = room || joinedRoom;
    if (!targetRoom) { if (ack) ack(false); return; }
    const safe = (name || '').toString().trim().replace(/[^a-zA-Z0-9 _.-]/g, '').slice(0, 24);
    if (!safe) { if (ack) ack(false); return; }
    pruneRoomUsers(targetRoom);
    const users = roomData[targetRoom]?.users;
    if (!users) { if (ack) ack(false); return; }
    const existing = users.get(socket.id) || { role: (roomData[targetRoom].adminSocketId === socket.id ? 'admin' : 'member') };
    users.set(socket.id, { name: safe, role: existing.role });
    io.to(targetRoom).emit('user-list', Array.from(users.entries()).map(([id,u]) => ({ id, name: u.name, role: u.role, muted: !!u.muted })));
    socket.emit('you', { id: socket.id, name: safe, role: existing.role, muted: !!existing.muted });
    if (ack) ack(true);
  });

  // Admin: mute/unmute a user
  socket.on('mute-user', ({ room, targetId, muted }, ack) => {
    try {
      const info = roomData[room];
      if (!info || info.adminSocketId !== socket.id) { if (ack) ack(false); return; }
      if (!info.users || !info.users.has(targetId)) { if (ack) ack(false); return; }
      const u = info.users.get(targetId);
      u.muted = Boolean(muted);
      io.to(room).emit('user-list', Array.from(info.users.entries()).map(([id,usr]) => ({ id, name: usr.name, role: usr.role, muted: !!usr.muted })));
      io.to(targetId).emit('muted', { room, muted: u.muted });
      if (ack) ack(true);
    } catch (e) { if (ack) ack(false); }
  });

  // Admin: kick user from room
  socket.on('kick-user', ({ room, targetId }, ack) => {
    try {
      const info = roomData[room];
      if (!info || info.adminSocketId !== socket.id) { if (ack) ack(false); return; }
      if (!info.users || !info.users.has(targetId)) { if (ack) ack(false); return; }
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) targetSocket.leave(room);
      info.users.delete(targetId);
      io.to(targetId).emit('kicked', { room });
      io.to(room).emit('user-list', Array.from(info.users.entries()).map(([id,usr]) => ({ id, name: usr.name, role: usr.role, muted: !!usr.muted })));
      if (ack) ack(true);
    } catch (e) { if (ack) ack(false); }
  });

  socket.on("disconnect", () => {
    if (!joinedRoom) return;
    const users = roomData[joinedRoom]?.users;
    if (users) {
      users.delete(socket.id);
      if (roomData[joinedRoom].adminSocketId === socket.id) roomData[joinedRoom].adminSocketId = undefined;
      io.to(joinedRoom).emit("user-list", Array.from(users.entries()).map(([id,u]) => ({ id, name: u.name, role: u.role, muted: !!u.muted })));
    }
  });

// Periodically prune users for all rooms (handles abrupt reloads/network drops)
setInterval(() => {
  try {
    for (const room of Object.keys(roomData)) {
      const before = roomData[room]?.users?.size || 0;
      pruneRoomUsers(room);
      const after = roomData[room]?.users?.size || 0;
      if (before !== after) {
        io.to(room).emit('user-list', Array.from(roomData[room].users.entries()).map(([id,u]) => ({ id, name: u.name, role: u.role, muted: !!u.muted })));
      }
    }
  } catch {}
}, 10000); // every 10s

  socket.on("file-uploaded", ({ filename, originalName, room }) => {
    if (!roomData[room]) return;

    const fileEntry = {
      filename,
      originalName,
      timestamp: Date.now(),
    };
    roomData[room].files.push(fileEntry);

    const payload = {
      link: `/uploads/${room}/${filename}`,
      name: originalName,
      filename,
    };

    io.to(room).emit("file-uploaded", payload);
  });
});

// File upload handler
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.json({ success: false });
  const room = resolveRoomFromReq(req);
  console.log("Uploaded file to room:", room, req.file.filename);
  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    room,
  });
});

// List available rooms (memory + disk folders)
app.get("/rooms", (req, res) => {
  try {
    const rooms = listRooms();
    res.json({ success: true, rooms });
  } catch (e) {
    console.error("/rooms error", e);
    res.status(500).json({ success: false, rooms: [] });
  }
});

// Delete a file in a room
app.delete("/upload", (req, res) => {
  const room = resolveRoomFromReq(req);
  const filename = (req.query.filename || "").toString();
  const filePath = path.join(uploadDir, room, filename);
  if (!filename) return res.status(400).json({ success: false, error: "filename required" });
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      if (roomData[room]) {
        roomData[room].files = (roomData[room].files || []).filter((f) => f.filename !== filename);
        io.to(room).emit("file-deleted", { filename });
      }
      return res.json({ success: true });
    } else {
      return res.status(404).json({ success: false, error: "not_found" });
    }
  } catch (e) {
    console.error("Delete error:", e);
    return res.status(500).json({ success: false });
  }
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
