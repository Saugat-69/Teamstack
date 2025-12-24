// Load environment variables from .env file
require('dotenv').config();

const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");

// File sharing system imports
const { createCleanupMiddleware } = require('./utils/cleanup-middleware');
const RedisClient = require('./utils/redis-client');
const CloudinaryService = require('./utils/cloudinary-service');

// Initialize file sharing services (will be initialized after env check)
let cleanupMiddleware = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.CLOUDINARY_CLOUD_NAME) {
    const redisClient = new RedisClient(
      process.env.UPSTASH_REDIS_REST_URL,
      process.env.UPSTASH_REDIS_REST_TOKEN
    );
    const cloudinaryService = new CloudinaryService(
      process.env.CLOUDINARY_CLOUD_NAME,
      process.env.CLOUDINARY_API_KEY,
      process.env.CLOUDINARY_API_SECRET
    );
    cleanupMiddleware = createCleanupMiddleware(redisClient, cloudinaryService);
    console.log('✅ File sharing services initialized');
  } else {
    console.warn('⚠️  File sharing disabled: Redis or Cloudinary credentials missing');
  }
} catch (error) {
  console.error('❌ Failed to initialize file sharing services:', error.message);
}

const uploadDir = path.join(__dirname, "uploads");

// Ensure upload directory exists
(async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
    console.log(`📁 Created upload directory: ${uploadDir}`);
  }
})();

// Upload config
function resolveRoomFromReq(req) {
  const raw = ((req.query && req.query.room) || req.body?.room || "world").toString();
  const trimmed = raw.trim();
  // Sanitize: allow letters, numbers, dash, underscore and dot; fallback to world
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "");
  return safe || "world";
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const room = resolveRoomFromReq(req);
    const roomPath = path.join(uploadDir, room);
    try {
      await fs.mkdir(roomPath, { recursive: true });
      cb(null, roomPath);
    } catch (e) {
      console.error("❌ Failed to ensure room folder for", room, e);
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${sanitizedName}`);
  },
});
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allow most common file types
    const allowedMimes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Security and performance middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static file serving with caching
app.use(express.static("public", {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true
}));

app.use("/uploads", express.static(uploadDir, {
  maxAge: '7d',
  etag: true,
  lastModified: true
}));

// Lazy cleanup middleware for file sharing (runs on every request)
if (cleanupMiddleware) {
  app.use(cleanupMiddleware);
}

// Mount file sharing API routes
try {
  const fileSharingRoutes = require('./routes/file-sharing');
  app.use('/api/room', fileSharingRoutes);
  console.log('✅ File sharing routes mounted at /api/room');
} catch (error) {
  console.error('❌ Failed to load file sharing routes:', error.message);
}

let roomData = {}; // Stores: { text, files, password, isPrivate, isLAN, lanIPs, createdAt, connectors:Set, users: Map<socketId,{name,role,muted?:boolean}>, adminSocketId?: string, adminToken?: string, typingLock?: {lockedBy: string, lockedAt: number, isActive: boolean} }

async function hydrateRoomFilesFromDisk(room) {
  try {
    const dir = path.join(uploadDir, room);

    try {
      await fs.access(dir);
    } catch {
      return [];
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => e.name);

    return files.map((fname) => {
      const dashIdx = fname.indexOf("-");
      const originalName = dashIdx > -1 ? fname.slice(dashIdx + 1).replace(/_/g, ' ') : fname;

      // Extract timestamp from filename
      const timestampMatch = fname.match(/^(\d+)-/);
      const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();

      return { filename: fname, originalName, timestamp };
    });
  } catch (e) {
    console.error("❌ Failed to hydrate files for room", room, e);
    return [];
  }
}

async function listRooms() {
  try {
    const diskRooms = new Set();

    try {
      const entries = await fs.readdir(uploadDir, { withFileTypes: true });
      entries
        .filter((e) => e.isDirectory())
        .forEach((e) => diskRooms.add(e.name));
    } catch (e) {
      console.warn("⚠️ Could not read upload directory:", e.message);
    }

    const memoryRooms = Object.keys(roomData || {});
    memoryRooms.forEach(r => diskRooms.add(r));

    return Array.from(diskRooms)
      .filter(name => name && name.length > 0)
      .map((name) => ({
        name,
        isPrivate: Boolean(roomData[name]?.isPrivate && roomData[name]?.password),
        userCount: roomData[name]?.users?.size || 0,
        isLAN: Boolean(roomData[name]?.isLAN),
        createdAt: roomData[name]?.createdAt || Date.now()
      }))
      .sort((a, b) => b.userCount - a.userCount || b.createdAt - a.createdAt);
  } catch (e) {
    console.error("❌ listRooms error", e);
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
  } catch { }
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
setInterval(async () => {
  const now = Date.now();
  const cleanupPromises = [];

  for (const room in roomData) {
    if (!roomData[room].files) continue;

    const expiredFiles = [];
    roomData[room].files = roomData[room].files.filter((file) => {
      const expired = now - file.timestamp >
        (roomData[room].isPrivate ? EXPIRE_PRIVATE : EXPIRE_PUBLIC);

      if (expired) {
        expiredFiles.push(file);
      }

      return !expired;
    });

    // Delete expired files
    expiredFiles.forEach(file => {
      const filePath = path.join(uploadDir, room, file.filename);
      cleanupPromises.push(
        fs.unlink(filePath).catch(err =>
          console.warn(`⚠️ Could not delete file ${filePath}:`, err.message)
        )
      );
    });

    // Remove empty room folders that were never used by more than one connector in 24h
    try {
      const info = roomData[room];
      if (
        info && info.connectors && info.connectors.size <= 1 &&
        now - info.createdAt > NEVER_USED_WINDOW &&
        (info.files?.length || 0) === 0
      ) {
        const dir = path.join(uploadDir, room);
        cleanupPromises.push(
          fs.rmdir(dir, { recursive: true }).then(() => {
            delete roomData[room];
            console.log(`🧹 Cleaned up unused room: ${room}`);
          }).catch(err =>
            console.warn(`⚠️ Could not remove room directory ${dir}:`, err.message)
          )
        );
      }
    } catch (e) {
      console.error("❌ Cleanup error:", e);
    }
  }

  // Wait for all cleanup operations to complete
  await Promise.allSettled(cleanupPromises);
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
  console.log(`🔗 New client connected: ${socket.id}`);
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
      socket.emit("user-list", Array.from(users.entries()).map(([id, u]) => ({ id, name: u.name, role: u.role, muted: !!u.muted })));
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
    } catch { }

    // Register user as Guest N
    try {
      const existingUsers = roomData[room].users || new Map();
      roomData[room].users = existingUsers;
      pruneRoomUsers(room);
      const currentNames = new Set(Array.from(existingUsers.values()).map(u => u.name));
      let guestNumber = 1;
      while (currentNames.has(`Guest ${guestNumber}`)) guestNumber++;
      const userName = `Guest ${guestNumber}`;
      // Admin assignment logic: first user to join the room becomes admin
      let role = 'member';
      if (!roomData[room].adminSocketId) {
        // No admin assigned yet, make this user the admin
        role = 'admin';
        roomData[room].adminToken = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
      io.to(room).emit("user-list", Array.from(existingUsers.entries()).map(([id, u]) => ({ id, name: u.name, role: u.role, muted: !!u.muted })));
      socket.emit('you', { room, id: socket.id, name: userName, role, muted: false, adminToken: role === 'admin' ? roomData[room].adminToken : undefined });
    } catch (e) { console.error('user add error', e); }

    // Ensure files list reflects disk on first join after restart
    if (!roomData[room].files || roomData[room].files.length === 0) {
      hydrateRoomFilesFromDisk(room).then(files => {
        roomData[room].files = files;
      }).catch(err => {
        console.error('Failed to hydrate files:', err);
        roomData[room].files = [];
      });
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

  // Typing lock management
  socket.on("request-typing-lock", () => {
    if (!joinedRoom) return;
    const info = roomData[joinedRoom];
    if (!info || info?.users?.get(socket.id)?.muted) return;

    const now = Date.now();
    const lockTimeout = 30000; // 30 seconds timeout

    // Check if lock is available or expired
    if (!info.typingLock || (now - info.typingLock.lockedAt) > lockTimeout) {
      info.typingLock = {
        lockedBy: socket.id,
        lockedAt: now,
        isActive: true
      };
      socket.emit("typing-lock-acquired");
      socket.to(joinedRoom).emit("typing-lock-changed", {
        lockedBy: socket.id,
        lockedAt: now,
        lockedByUser: info.users.get(socket.id)?.name || "Unknown"
      });
    } else {
      socket.emit("typing-lock-denied", {
        lockedBy: info.typingLock.lockedBy,
        lockedAt: info.typingLock.lockedAt,
        lockedByUser: info.users.get(info.typingLock.lockedBy)?.name || "Unknown"
      });
    }
  });

  socket.on("release-typing-lock", () => {
    if (!joinedRoom) return;
    const info = roomData[joinedRoom];
    if (!info || !info.typingLock || info.typingLock.lockedBy !== socket.id) return;

    delete info.typingLock;
    socket.to(joinedRoom).emit("typing-lock-released");
  });

  socket.on("get-typing-lock-status", () => {
    if (!joinedRoom) return;
    const info = roomData[joinedRoom];
    if (!info) return;

    const now = Date.now();
    const lockTimeout = 30000; // 30 seconds timeout

    if (info.typingLock && (now - info.typingLock.lockedAt) <= lockTimeout) {
      socket.emit("typing-lock-status", {
        isLocked: true,
        lockedBy: info.typingLock.lockedBy,
        lockedAt: info.typingLock.lockedAt,
        lockedByUser: info.users.get(info.typingLock.lockedBy)?.name || "Unknown",
        isActive: info.typingLock.isActive || false
      });
    } else {
      // Clean up expired lock
      if (info.typingLock) {
        delete info.typingLock;
      }
      socket.emit("typing-lock-status", { isLocked: false });
    }
  });

  // Handle typing activity signals
  socket.on("typing-activity", ({ isTyping }) => {
    if (!joinedRoom) return;
    const info = roomData[joinedRoom];
    if (!info || !info.typingLock || info.typingLock.lockedBy !== socket.id) return;

    info.typingLock.isActive = isTyping;

    // If user stopped typing, set a timeout to release the lock
    if (!isTyping) {
      setTimeout(() => {
        const currentInfo = roomData[joinedRoom];
        if (currentInfo && currentInfo.typingLock &&
          currentInfo.typingLock.lockedBy === socket.id &&
          !currentInfo.typingLock.isActive) {
          delete currentInfo.typingLock;
          io.to(joinedRoom).emit("typing-lock-released");
        }
      }, 3000); // 3 seconds delay before releasing
    }
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
    io.to(targetRoom).emit('user-list', Array.from(users.entries()).map(([id, u]) => ({ id, name: u.name, role: u.role, muted: !!u.muted })));
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
      io.to(room).emit('user-list', Array.from(info.users.entries()).map(([id, usr]) => ({ id, name: usr.name, role: usr.role, muted: !!usr.muted })));
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
      if (targetSocket) {
        // Remove user from current room
        targetSocket.leave(room);
        info.users.delete(targetId);

        // Auto-join user to "world" room
        const worldRoom = "world";
        if (!roomData[worldRoom]) {
          roomData[worldRoom] = {
            text: "",
            files: [],
            password: null,
            isPrivate: false,
            isLAN: false,
            lanIPs: [],
            createdAt: Date.now(),
            connectors: new Set(),
            users: new Map(),
            adminSocketId: undefined,
            adminToken: undefined,
          };
        }

        // Add user to world room
        targetSocket.join(worldRoom);
        const userInfo = info.users.get(targetId);
        if (userInfo) {
          roomData[worldRoom].users.set(targetId, { ...userInfo, role: 'member' });
        }

        // Notify user they were kicked and moved to world room
        targetSocket.emit('kicked', { room, movedTo: worldRoom });

        // Send world room data to kicked user
        targetSocket.emit("text", roomData[worldRoom].text);
        targetSocket.emit("file-list", roomData[worldRoom].files.map((f) => ({
          link: `/uploads/${worldRoom}/${f.filename}`,
          name: f.originalName,
          filename: f.filename,
        })));
        targetSocket.emit('user-list', Array.from(roomData[worldRoom].users.entries()).map(([id, usr]) => ({ id, name: usr.name, role: usr.role, muted: !!usr.muted })));
      }

      // Update original room user list
      io.to(room).emit('user-list', Array.from(info.users.entries()).map(([id, usr]) => ({ id, name: usr.name, role: usr.role, muted: !!usr.muted })));

      // Update world room user list
      io.to("world").emit('user-list', Array.from(roomData["world"].users.entries()).map(([id, usr]) => ({ id, name: usr.name, role: usr.role, muted: !!usr.muted })));

      if (ack) ack(true);
    } catch (e) { if (ack) ack(false); }
  });

  // ===== VIDEO SIGNALING HANDLERS =====

  // Enable audio
  socket.on("enable-audio", ({ room }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      const user = info.users.get(socket.id);
      if (!user) return;

      // Update user state
      user.audioEnabled = true;

      // Notify all participants in the room
      io.to(targetRoom).emit("user-audio-enabled", {
        userId: socket.id,
        name: user.name,
        timestamp: Date.now()
      });

      console.log(`🎤 Audio enabled for ${user.name} in room ${targetRoom}`);
    } catch (error) {
      console.error("❌ Enable audio error:", error);
    }
  });

  // Disable audio
  socket.on("disable-audio", ({ room }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      const user = info.users.get(socket.id);
      if (!user) return;

      // Update user state
      user.audioEnabled = false;

      // Notify all participants in the room
      io.to(targetRoom).emit("user-audio-disabled", {
        userId: socket.id,
        name: user.name,
        timestamp: Date.now()
      });

      console.log(`🎤 Audio disabled for ${user.name} in room ${targetRoom}`);
    } catch (error) {
      console.error("❌ Disable audio error:", error);
    }
  });

  // Start voice call
  socket.on("start-voice-call", ({ room }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      const user = info.users.get(socket.id);
      if (!user) return;

      // Update user state
      user.callMode = 'voice';
      user.audioEnabled = true;

      // Notify all participants in the room
      io.to(targetRoom).emit("user-voice-call-started", {
        userId: socket.id,
        name: user.name,
        timestamp: Date.now()
      });

      console.log(`📞 Voice call started for ${user.name} in room ${targetRoom}`);
    } catch (error) {
      console.error("❌ Start voice call error:", error);
    }
  });

  // End call
  socket.on("end-call", ({ room, previousMode }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      const user = info.users.get(socket.id);
      if (!user) return;

      // Update user state
      user.callMode = 'none';
      user.audioEnabled = false;
      user.videoEnabled = false;

      // Notify all participants in the room
      io.to(targetRoom).emit("user-call-ended", {
        userId: socket.id,
        name: user.name,
        previousMode,
        timestamp: Date.now()
      });

      console.log(`📞 Call ended for ${user.name} in room ${targetRoom} (was ${previousMode})`);
    } catch (error) {
      console.error("❌ End call error:", error);
    }
  });

  // Call mode change
  socket.on("call-mode-change", ({ room, mode }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      const user = info.users.get(socket.id);
      if (!user) return;

      const previousMode = user.callMode || 'none';

      // Update user state
      user.callMode = mode;

      // Update media state based on mode
      if (mode === 'voice') {
        user.audioEnabled = true;
        user.videoEnabled = false;
      } else if (mode === 'video') {
        user.audioEnabled = true;
        user.videoEnabled = true;
      } else {
        user.audioEnabled = false;
        user.videoEnabled = false;
      }

      // Notify all participants in the room
      io.to(targetRoom).emit("user-call-mode-changed", {
        userId: socket.id,
        name: user.name,
        mode,
        previousMode,
        timestamp: Date.now()
      });

      console.log(`📞 Call mode changed for ${user.name} in room ${targetRoom}: ${previousMode} -> ${mode}`);
    } catch (error) {
      console.error("❌ Call mode change error:", error);
    }
  });

  // Enable video
  socket.on("enable-video", ({ room }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      const user = info.users.get(socket.id);
      if (!user) return;

      // Update user state
      user.videoEnabled = true;

      // Notify all participants in the room
      io.to(targetRoom).emit("user-video-enabled", {
        userId: socket.id,
        name: user.name,
        timestamp: Date.now()
      });

      console.log(`📹 Video enabled for ${user.name} in room ${targetRoom}`);
    } catch (error) {
      console.error("❌ Enable video error:", error);
    }
  });

  // Disable video
  socket.on("disable-video", ({ room }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      const user = info.users.get(socket.id);
      if (!user) return;

      // Update user state
      user.videoEnabled = false;

      // Notify all participants in the room
      io.to(targetRoom).emit("user-video-disabled", {
        userId: socket.id,
        name: user.name,
        timestamp: Date.now()
      });

      console.log(`📹 Video disabled for ${user.name} in room ${targetRoom}`);
    } catch (error) {
      console.error("❌ Disable video error:", error);
    }
  });

  // Start screen share
  socket.on("start-screen-share", ({ room }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      const user = info.users.get(socket.id);
      if (!user) return;

      // Update user state
      user.screenShareEnabled = true;

      // Track active screen share in room
      if (!info.screenShares) {
        info.screenShares = new Set();
      }
      info.screenShares.add(socket.id);

      // Notify all participants in the room
      io.to(targetRoom).emit("user-screen-share-started", {
        userId: socket.id,
        name: user.name,
        timestamp: Date.now()
      });

      console.log(`🖥️ Screen share started for ${user.name} in room ${targetRoom}`);
    } catch (error) {
      console.error("❌ Start screen share error:", error);
    }
  });

  // Stop screen share
  socket.on("stop-screen-share", ({ room }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      const user = info.users.get(socket.id);
      if (!user) return;

      // Update user state
      user.screenShareEnabled = false;

      // Remove from active screen shares
      if (info.screenShares) {
        info.screenShares.delete(socket.id);
      }

      // Notify all participants in the room
      io.to(targetRoom).emit("user-screen-share-stopped", {
        userId: socket.id,
        name: user.name,
        timestamp: Date.now()
      });

      console.log(`🖥️ Screen share stopped for ${user.name} in room ${targetRoom}`);
    } catch (error) {
      console.error("❌ Stop screen share error:", error);
    }
  });

  // Video quality change
  socket.on("video-quality-change", ({ room, quality }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      const user = info.users.get(socket.id);
      if (!user) return;

      // Update user state
      user.videoQuality = quality;

      // Relay to other participants (they may adjust their sending quality)
      socket.to(targetRoom).emit("user-video-quality-changed", {
        userId: socket.id,
        name: user.name,
        quality,
        timestamp: Date.now()
      });

      console.log(`⚙️ Video quality changed to ${quality} for ${user.name} in room ${targetRoom}`);
    } catch (error) {
      console.error("❌ Video quality change error:", error);
    }
  });

  // Get media participants (video/screen share/voice call state)
  socket.on("get-media-participants", ({ room }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      const info = roomData[targetRoom];
      if (!info || !info.users) return;

      // Build media state for all participants
      const mediaParticipants = Array.from(info.users.entries()).map(([id, user]) => ({
        userId: id,
        name: user.name,
        audioEnabled: user.audioEnabled || false,
        videoEnabled: user.videoEnabled || false,
        screenShareEnabled: user.screenShareEnabled || false,
        callMode: user.callMode || 'none',
        videoQuality: user.videoQuality || 'medium'
      }));

      socket.emit("media-participants", {
        participants: mediaParticipants,
        timestamp: Date.now()
      });

      console.log(`📊 Sent media participants to ${socket.id} in room ${targetRoom}`);
    } catch (error) {
      console.error("❌ Get media participants error:", error);
    }
  });

  // ===== WEBRTC SIGNALING HANDLERS =====

  // WebRTC Offer
  socket.on("webrtc-offer", ({ targetId, offer, room }) => {
    try {
      console.log(`📨 Server received webrtc-offer event`);
      console.log(`   From socket: ${socket.id}`);
      console.log(`   Target socket: ${targetId}`);
      console.log(`   Room: ${room || joinedRoom}`);
      console.log(`   Offer type: ${offer?.type}`);
      console.log(`   Offer SDP length: ${offer?.sdp?.length || 0}`);

      const targetRoom = room || joinedRoom;
      if (!targetRoom) {
        console.log(`   ❌ No target room, aborting`);
        return;
      }

      // Check if target socket exists
      const targetSocket = io.sockets.sockets.get(targetId);
      if (!targetSocket) {
        console.log(`   ❌ Target socket ${targetId} not found`);
        return;
      }

      console.log(`   ✅ Target socket found, relaying offer...`);
      console.log(`🔄 Relaying WebRTC offer from ${socket.id} to ${targetId}`);

      // Forward offer to target peer
      io.to(targetId).emit("webrtc-offer", {
        fromId: socket.id,
        offer: offer
      });

      console.log(`   ✅ Offer relayed successfully`);
    } catch (error) {
      console.error("❌ WebRTC offer relay error:", error);
      console.error("   Error stack:", error.stack);
    }
  });

  // WebRTC Answer
  socket.on("webrtc-answer", ({ targetId, answer, room }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      console.log(`🔄 Relaying WebRTC answer from ${socket.id} to ${targetId}`);

      // Forward answer to target peer
      io.to(targetId).emit("webrtc-answer", {
        fromId: socket.id,
        answer: answer
      });
    } catch (error) {
      console.error("❌ WebRTC answer relay error:", error);
    }
  });

  // WebRTC ICE Candidate
  socket.on("webrtc-ice-candidate", ({ targetId, candidate, room }) => {
    try {
      const targetRoom = room || joinedRoom;
      if (!targetRoom) return;

      console.log(`🧊 Relaying ICE candidate from ${socket.id} to ${targetId}`);

      // Forward ICE candidate to target peer
      io.to(targetId).emit("webrtc-ice-candidate", {
        fromId: socket.id,
        candidate: candidate
      });
    } catch (error) {
      console.error("❌ ICE candidate relay error:", error);
    }
  });

  // Admin: disable user's video
  socket.on("admin-disable-video", ({ room, targetId }, ack) => {
    try {
      const info = roomData[room];
      if (!info || info.adminSocketId !== socket.id) {
        if (ack) ack(false);
        return;
      }

      if (!info.users || !info.users.has(targetId)) {
        if (ack) ack(false);
        return;
      }

      const targetUser = info.users.get(targetId);
      targetUser.videoDisabledByAdmin = true;
      targetUser.videoEnabled = false;

      // Notify the target user
      io.to(targetId).emit("video-disabled-by-admin", {
        room,
        adminName: info.users.get(socket.id)?.name || "Admin",
        timestamp: Date.now()
      });

      // Notify all participants
      io.to(room).emit("user-video-disabled", {
        userId: targetId,
        name: targetUser.name,
        byAdmin: true,
        timestamp: Date.now()
      });

      console.log(`🚫 Admin disabled video for ${targetUser.name} in room ${room}`);

      if (ack) ack(true);
    } catch (error) {
      console.error("❌ Admin disable video error:", error);
      if (ack) ack(false);
    }
  });

  // Admin: enable user's video (remove admin restriction)
  socket.on("admin-enable-video", ({ room, targetId }, ack) => {
    try {
      const info = roomData[room];
      if (!info || info.adminSocketId !== socket.id) {
        if (ack) ack(false);
        return;
      }

      if (!info.users || !info.users.has(targetId)) {
        if (ack) ack(false);
        return;
      }

      const targetUser = info.users.get(targetId);
      targetUser.videoDisabledByAdmin = false;

      // Notify the target user
      io.to(targetId).emit("video-enabled-by-admin", {
        room,
        adminName: info.users.get(socket.id)?.name || "Admin",
        timestamp: Date.now()
      });

      console.log(`✅ Admin enabled video for ${targetUser.name} in room ${room}`);

      if (ack) ack(true);
    } catch (error) {
      console.error("❌ Admin enable video error:", error);
      if (ack) ack(false);
    }
  });

  // Admin: stop user's screen share
  socket.on("admin-stop-screen-share", ({ room, targetId }, ack) => {
    try {
      const info = roomData[room];
      if (!info || info.adminSocketId !== socket.id) {
        if (ack) ack(false);
        return;
      }

      if (!info.users || !info.users.has(targetId)) {
        if (ack) ack(false);
        return;
      }

      const targetUser = info.users.get(targetId);
      targetUser.screenShareEnabled = false;

      // Remove from active screen shares
      if (info.screenShares) {
        info.screenShares.delete(targetId);
      }

      // Notify the target user
      io.to(targetId).emit("screen-share-stopped-by-admin", {
        room,
        adminName: info.users.get(socket.id)?.name || "Admin",
        timestamp: Date.now()
      });

      // Notify all participants
      io.to(room).emit("user-screen-share-stopped", {
        userId: targetId,
        name: targetUser.name,
        byAdmin: true,
        timestamp: Date.now()
      });

      console.log(`🚫 Admin stopped screen share for ${targetUser.name} in room ${room}`);

      if (ack) ack(true);
    } catch (error) {
      console.error("❌ Admin stop screen share error:", error);
      if (ack) ack(false);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    if (!joinedRoom) return;
    const users = roomData[joinedRoom]?.users;
    if (users) {
      // Clean up video/screen share state
      const user = users.get(socket.id);
      if (user) {
        // Notify if user had video or screen share enabled
        if (user.videoEnabled) {
          io.to(joinedRoom).emit("user-video-disabled", {
            userId: socket.id,
            name: user.name,
            timestamp: Date.now()
          });
        }

        if (user.screenShareEnabled) {
          // Remove from active screen shares
          if (roomData[joinedRoom].screenShares) {
            roomData[joinedRoom].screenShares.delete(socket.id);
          }

          io.to(joinedRoom).emit("user-screen-share-stopped", {
            userId: socket.id,
            name: user.name,
            timestamp: Date.now()
          });
        }
      }

      users.delete(socket.id);
      if (roomData[joinedRoom].adminSocketId === socket.id) roomData[joinedRoom].adminSocketId = undefined;

      // Release typing lock if this user had it
      if (roomData[joinedRoom].typingLock && roomData[joinedRoom].typingLock.lockedBy === socket.id) {
        delete roomData[joinedRoom].typingLock;
        io.to(joinedRoom).emit("typing-lock-released");
      }

      io.to(joinedRoom).emit("user-list", Array.from(users.entries()).map(([id, u]) => ({ id, name: u.name, role: u.role, muted: !!u.muted })));
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
          io.to(room).emit('user-list', Array.from(roomData[room].users.entries()).map(([id, u]) => ({ id, name: u.name, role: u.role, muted: !!u.muted })));
        }
      }
    } catch { }
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

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Upload one file at a time.'
      });
    }
  }

  if (error.message === 'File type not allowed') {
    return res.status(400).json({
      success: false,
      error: 'File type not allowed. Please upload documents, images, or videos.'
    });
  }

  console.error('❌ Upload error:', error);
  res.status(500).json({ success: false, error: 'Upload failed' });
});

// File upload handler
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const room = resolveRoomFromReq(req);
    const fileSize = req.file.size;
    const fileSizeKB = Math.round(fileSize / 1024);

    console.log(`📁 Uploaded file to room: ${room}, file: ${req.file.filename} (${fileSizeKB}KB)`);

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      room,
      size: fileSize,
      sizeFormatted: fileSizeKB > 1024 ? `${Math.round(fileSizeKB / 1024)}MB` : `${fileSizeKB}KB`
    });
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process file upload'
    });
  }
});

// List available rooms (memory + disk folders)
app.get("/rooms", async (req, res) => {
  try {
    const rooms = await listRooms();
    res.json({
      success: true,
      rooms,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error("❌ /rooms error", e);
    res.status(500).json({
      success: false,
      rooms: [],
      error: 'Failed to fetch rooms'
    });
  }
});

// Delete a file in a room
app.delete("/upload", async (req, res) => {
  try {
    const room = resolveRoomFromReq(req);
    const filename = (req.query.filename || "").toString().trim();

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: "Filename is required"
      });
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(uploadDir, room, sanitizedFilename);

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);

      if (roomData[room]) {
        roomData[room].files = (roomData[room].files || []).filter(
          (f) => f.filename !== sanitizedFilename
        );
        io.to(room).emit("file-deleted", { filename: sanitizedFilename });
      }

      console.log(`🗑️ Deleted file: ${sanitizedFilename} from room: ${room}`);
      return res.json({ success: true });
    } catch (accessError) {
      return res.status(404).json({
        success: false,
        error: "File not found"
      });
    }
  } catch (e) {
    console.error("❌ Delete error:", e);
    return res.status(500).json({
      success: false,
      error: "Failed to delete file"
    });
  }
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  http.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  http.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

http.listen(PORT, () => {
  console.log('🚀 TeamUp Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
  console.log(`📁 Serving static files from: ${path.resolve(__dirname, 'public')}`);
  console.log(`📂 Upload directory: ${uploadDir}`);
  console.log(`🔌 Socket.IO server ready for connections`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌍 Open your browser and go to: http://${HOST}:${PORT}`);
});

// Log server statistics periodically
setInterval(() => {
  const memUsage = process.memoryUsage();
  const activeRooms = Object.keys(roomData).length;
  const totalUsers = Object.values(roomData).reduce((sum, room) => sum + (room.users?.size || 0), 0);

  console.log(`📊 Stats - Rooms: ${activeRooms}, Users: ${totalUsers}, Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
}, 5 * 60 * 1000); // Every 5 minutes

