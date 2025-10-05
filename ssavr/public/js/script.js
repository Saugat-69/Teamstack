const socket = io();

// Add connection debugging
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  showNotification("Failed to connect to server. Please check if the server is running.", "error");
  updateConnectionStatus("error", "Connection Failed");
  joinBtn.disabled = false;
  joinBtn.innerHTML = '<span class="btn-text">Join Room</span><span class="btn-icon">🚀</span>';
});

const editor = document.getElementById("editor");
const roomInput = document.getElementById("roomInput");
const passwordInput = document.getElementById("passwordInput");
const joinBtn = document.getElementById("joinBtn");
const tabJoin = document.getElementById("tabJoin");
const tabCreate = document.getElementById("tabCreate");
const connectionType = document.getElementById("connectionType");
const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const dropArea = document.getElementById("dropArea");
const connectionStatus = document.getElementById("connectionStatus");
const fileCount = document.getElementById("fileCount");
const controlsPanel = document.getElementById("controlsPanel");
const roomListEl = document.getElementById("roomList");
const userListEl = document.getElementById("userList");
const displayNameInput = document.getElementById('displayNameInput');
const setNameBtn = document.getElementById('setNameBtn');
const rememberToggle = document.getElementById('rememberToggle');
// Track current user identity/role
let currentUserId = null;
let currentUserRole = null;
let isMuted = false;
const toggleShare = document.getElementById('toggleShare');
const toggleDownloads = document.getElementById('toggleDownloads');
const downloadsPanel = document.getElementById('downloadsPanel');

let currentRoom = "";
let isConnected = false;
let fileCountNum = 0;
let mode = "join"; // "join" | "create"
let adminTokens = {};

// Connection status management
function updateConnectionStatus(status, message) {
  connectionStatus.textContent = message;
  connectionStatus.className = `status-indicator ${status}`;
  isConnected = status === "connected";
}

function updateFileCount() {
  fileCountNum = fileList.children.length;
  fileCount.textContent = `${fileCountNum} file${fileCountNum !== 1 ? "s" : ""}`;
}

function updateDefaultRoom() {
  const isLAN = connectionType.value === "lan";

  // Always allow typing; only prefill helpful defaults
  if (mode === "join") {
    if (!roomInput.value) {
      roomInput.value = isLAN ? "lan_world" : "world";
    }
    passwordInput.value = "";
  }

  roomInput.disabled = false;
  passwordInput.disabled = false;
  currentRoom = roomInput.value;
}

function setMode(newMode) {
  mode = newMode;
  if (newMode === "join") {
    tabJoin.classList.add("active");
    tabCreate.classList.remove("active");
    joinBtn.querySelector(".btn-text").textContent = "Join Room";
  } else {
    tabCreate.classList.add("active");
    tabJoin.classList.remove("active");
    joinBtn.querySelector(".btn-text").textContent = "Create Room";
  }
  updateDefaultRoom();
  fetchRooms();
}

function joinRoom() {
  const roomName = roomInput.value.trim();
  const password = passwordInput.value;
  const isLAN = connectionType.value === "lan";

  if (!roomName) {
    showNotification("Please enter a room name", "error");
    return;
  }

  // In join mode: if a room name is provided, always use it; otherwise fallback to defaults
  const finalRoom = mode === "join"
    ? (roomName || (isLAN ? "lan_world" : "world"))
    : roomName || (isLAN ? "lan_world" : "world");
  currentRoom = finalRoom;
  try { localStorage.setItem('lastRoom', finalRoom); } catch {}

  joinBtn.disabled = true;
  joinBtn.innerHTML = '<span class="btn-text">Connecting...</span><span class="btn-icon">⏳</span>';
  updateConnectionStatus("connecting", "Connecting...");

  const connectionTimeout = setTimeout(() => {
    if (joinBtn.disabled) {
      showNotification("Connection timeout. Please try again.", "error");
      updateConnectionStatus("error", "Connection Timeout");
      joinBtn.disabled = false;
      joinBtn.innerHTML = '<span class="btn-text">Join Room</span><span class="btn-icon">🚀</span>';
    }
  }, 10000);

  socket.emit("join", {
    room: finalRoom,
    password,
    private: Boolean(password),
    adminToken: adminTokens[finalRoom] || null,
  });

  socket.connectionTimeout = connectionTimeout;
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️"}</span>
      <span class="notification-message">${message}</span>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add("show"), 100);
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// 🟩 DOMContentLoaded: Auto-join LAN room if selected
document.addEventListener("DOMContentLoaded", () => {
  updateDefaultRoom();
  // Prefill name from previous session
  try {
    const savedName = localStorage.getItem('displayName') || '';
    if (displayNameInput && savedName) displayNameInput.value = savedName;
    try { adminTokens = JSON.parse(localStorage.getItem('adminTokens') || '{}') || {}; } catch { adminTokens = {}; }
    const lastRoom = localStorage.getItem('lastRoom') || '';
    const remember = localStorage.getItem('rememberLastRoom') === 'true';
    if (rememberToggle) rememberToggle.checked = remember;
    if (remember && lastRoom) {
      roomInput.value = lastRoom;
      currentRoom = lastRoom;
      if (socket.connected) {
        joinRoom();
      } else {
        socket.once('connect', () => joinRoom());
      }
    }
  } catch {}
  fetchRooms();

  // Initialize tabs
  if (tabJoin && tabCreate && controlsPanel) {
    const revealControls = () => {
      if (controlsPanel.classList.contains("hidden")) {
        controlsPanel.classList.remove("hidden");
      }
    };
    tabJoin.addEventListener("click", () => { revealControls(); setMode("join"); fetchRooms(); });
    tabCreate.addEventListener("click", () => { revealControls(); setMode("create"); fetchRooms(); });
  }

  if (rememberToggle) {
    rememberToggle.addEventListener('change', () => {
      try { localStorage.setItem('rememberLastRoom', rememberToggle.checked ? 'true' : 'false'); } catch {}
    });
  }

  // Toggle Share/Downloads panels
  if (toggleShare && toggleDownloads && dropArea && downloadsPanel && uploadForm) {
    const setActive = (btn, on) => {
      if (on) btn.classList.add('active'); else btn.classList.remove('active');
    };
    toggleShare.addEventListener('click', () => {
      uploadForm.classList.toggle('hidden');
      const visible = !uploadForm.classList.contains('hidden');
      setActive(toggleShare, visible);
      // Hide other
      downloadsPanel.classList.add('hidden');
      setActive(toggleDownloads, false);
    });
    toggleDownloads.addEventListener('click', () => {
      downloadsPanel.classList.toggle('hidden');
      const visible = !downloadsPanel.classList.contains('hidden');
      setActive(toggleDownloads, visible);
      // Hide other
      uploadForm.classList.add('hidden');
      setActive(toggleShare, false);
    });
  }

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      joinRoom();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      editor.focus();
    }
  });

  if (setNameBtn && displayNameInput) {
    setNameBtn.addEventListener('click', () => {
      const name = (displayNameInput.value || '').trim();
      if (!name) return;
      setNameBtn.classList.add('saving');
      socket.emit('set-name', { name, room: currentRoom }, (ok) => {
        if (ok) {
          showNotification('Name updated', 'success');
          displayNameInput.value = name;
          try { localStorage.setItem('displayName', name); } catch {}
          socket.emit('who');
        } else {
          showNotification('Failed to update name', 'error');
        }
        setNameBtn.classList.remove('saving');
      });
    });
    displayNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setNameBtn.click();
      }
    });
  }

// Fallback: bind immediately too (in case DOMContentLoaded already fired)
if (setNameBtn && displayNameInput && !setNameBtn.__bound) {
  setNameBtn.__bound = true;
  setNameBtn.addEventListener('click', () => {
    const name = (displayNameInput.value || '').trim();
    if (!name) return;
    setNameBtn.classList.add('saving');
    socket.emit('set-name', { name, room: currentRoom }, (ok) => {
      if (ok) {
        showNotification('Name updated', 'success');
        displayNameInput.value = name;
        try { localStorage.setItem('displayName', name); } catch {}
        socket.emit('who');
      } else {
        showNotification('Failed to update name', 'error');
      }
      setNameBtn.classList.remove('saving');
    });
  });
}
});

connectionType.addEventListener("change", updateDefaultRoom);
joinBtn.addEventListener("click", joinRoom);

// Editor typing
editor.addEventListener("input", () => {
  if (currentRoom && isConnected) {
    socket.emit("text", { text: editor.value, user: "You" });
    socket.emit("typing", "You");
  }
});

// Typing indicator
const typingIndicator = document.createElement("div");
typingIndicator.id = "typingIndicator";
typingIndicator.style.marginTop = "4px";
typingIndicator.style.fontStyle = "italic";
typingIndicator.style.color = "#555";
editor.parentNode.insertBefore(typingIndicator, editor.nextSibling);

let typingTimeout;
socket.on("typing", (user) => {
  if (user === "You") return;
  typingIndicator.textContent = `${user} is typing...`;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typingIndicator.textContent = "";
  }, 2000);
});

// Socket events
socket.on("connect", () => {
  updateConnectionStatus("connected", "Connected to Server");
  // ask for users if already in a room
  socket.emit('who');
});

socket.on("disconnect", () => {
  updateConnectionStatus("disconnected", "Disconnected");
  isConnected = false;
});

socket.on("unauthorized", (msg) => {
  if (socket.connectionTimeout) {
    clearTimeout(socket.connectionTimeout);
    socket.connectionTimeout = null;
  }

  showNotification(msg || "Incorrect password. Please try again.", "error");
  updateConnectionStatus("error", "Authentication Failed");
  joinBtn.disabled = false;
  joinBtn.innerHTML = '<span class="btn-text">Join Room</span><span class="btn-icon">🚀</span>';
});

socket.on("text", (payload) => {
  const incomingText = typeof payload === "string" ? payload : payload?.text;
  if (typeof incomingText === "string") {
    editor.value = incomingText;
  }
  if (joinBtn.disabled) {
    if (socket.connectionTimeout) {
      clearTimeout(socket.connectionTimeout);
      socket.connectionTimeout = null;
    }
    showNotification(`Successfully joined room: ${currentRoom}`, "success");
    updateConnectionStatus("connected", "Connected");
    joinBtn.disabled = false;
    joinBtn.innerHTML = '<span class="btn-text">Connected</span><span class="btn-icon">✅</span>';
    if (typeof controlsPanel !== "undefined" && controlsPanel) {
      controlsPanel.classList.add("hidden");
    }
    // ask server for current users list and our own name
    socket.emit('who');
    // Re-apply saved display name on join (so role/name survive reloads)
    try {
      const savedName = localStorage.getItem('displayName');
      if (savedName) socket.emit('set-name', { name: savedName, room: currentRoom });
    } catch {}
  }
});

dropArea.addEventListener("click", () => fileInput.click());
dropArea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("drag-over");
});
dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("drag-over");
});
dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("drag-over");
  if (e.dataTransfer.files.length) {
    uploadFile(e.dataTransfer.files[0]);
  }
});
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) {
    uploadFile(fileInput.files[0]);
  }
});

function uploadFile(file) {
  if (!currentRoom) {
    showNotification("Please join a room first", "error");
    return;
  }
  if (!isConnected) {
    showNotification("Not connected to server", "error");
    return;
  }

  const originalText = dropArea.querySelector("p").textContent;
  dropArea.querySelector("p").textContent = `Uploading ${file.name}...`;
  dropArea.classList.add("uploading");

  const formData = new FormData();
  // Append room first so the server's multer destination can read it
  formData.append("room", currentRoom);
  formData.append("file", file);

  fetch(`/upload?room=${encodeURIComponent(currentRoom)}`, { method: "POST", body: formData })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        socket.emit("file-uploaded", {
          filename: data.filename,
          originalName: data.originalName,
          room: currentRoom,
        });
        showNotification(`File "${data.originalName}" uploaded successfully!`, "success");
        fileInput.value = "";
      } else {
        showNotification("Upload failed. Please try again.", "error");
      }
    })
    .catch((error) => {
      console.error("Upload error:", error);
      showNotification("Upload failed. Please try again.", "error");
    })
    .finally(() => {
      dropArea.querySelector("p").textContent = originalText;
      dropArea.classList.remove("uploading");
    });
}

async function fetchRooms() {
  try {
    const res = await fetch('/rooms', { cache: 'no-store' });
    const data = await res.json();
    if (!data?.success) {
      console.warn('Rooms fetch failed', data);
      return;
    }
    console.debug('Rooms fetched:', data.rooms);
    renderRoomList(data.rooms || []);
  } catch {}
}

function renderRoomList(rooms) {
  if (!roomListEl) return;
  roomListEl.innerHTML = '';
  if (!rooms.length) {
    const li = document.createElement('li');
    li.className = 'room-pill';
    li.textContent = 'No rooms yet';
    li.style.color = '#64748b';
    li.style.justifyContent = 'center';
    roomListEl.appendChild(li);
    return;
  }
  rooms.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'room-pill';
    li.innerHTML = `<span>${r.name}</span><span class="lock">${r.isPrivate ? '🔒' : '🔓'}</span>`;
    li.addEventListener('click', () => handleRoomClick(r));
    roomListEl.appendChild(li);
  });
}

function handleRoomClick(room) {
  roomInput.value = room.name;
  if (room.isPrivate) {
    passwordInput.focus();
  } else {
    joinRoom();
  }
}

function renderFileItem({ link, name, filename }) {
  const li = document.createElement("li");
  li.innerHTML = `
    <a href="${link}" target="_blank" rel="noopener noreferrer">${name}</a>
    <span class="file-actions">
      <a href="${link}" download title="Download" class="icon-btn">⬇️</a>
      <button class="delete-file icon-btn" data-filename="${filename}" title="Delete">🗑️</button>
    </span>`;
  const delBtn = li.querySelector(".delete-file");
  delBtn.addEventListener("click", async () => {
    if (!confirm("Delete this file?")) return;
    try {
      const url = `/upload?room=${encodeURIComponent(currentRoom)}&filename=${encodeURIComponent(filename)}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !data.success) throw new Error("Failed");
    } catch {
      showNotification("Failed to delete file", "error");
    }
  });
  return li;
}

socket.on("file-uploaded", (file) => {
  const li = renderFileItem(file);
  fileList.appendChild(li);
  updateFileCount();
});

socket.on("file-list", (files) => {
  fileList.innerHTML = "";
  files.forEach((file) => {
    const li = renderFileItem(file);
    fileList.appendChild(li);
  });
  updateFileCount();
});

socket.on("file-deleted", ({ filename }) => {
  // Remove matching list item
  const items = Array.from(fileList.children);
  for (const li of items) {
    const btn = li.querySelector(".delete-file");
    if (btn && btn.dataset.filename === filename) {
      li.remove();
    }
  }
  updateFileCount();
});

// Users handling
socket.on('user-list', (users) => {
  if (!userListEl) return;
  userListEl.innerHTML = '';
  (users || []).forEach((u) => {
    const li = document.createElement('li');
    li.textContent = u.role === 'admin' ? `${u.name} (admin)` : u.name;
    if (u.muted) {
      li.title = 'Muted';
      li.style.opacity = '0.7';
    }
    // Admin controls
    if (currentUserRole === 'admin' && u.role !== 'admin' && u.id !== currentUserId) {
      const controls = document.createElement('span');
      controls.style.marginLeft = '8px';
      const muteBtn = document.createElement('button');
      muteBtn.className = 'icon-btn';
      muteBtn.textContent = u.muted ? '🔈' : '🔇';
      muteBtn.title = u.muted ? 'Unmute' : 'Mute';
      muteBtn.style.marginRight = '4px';
      muteBtn.type = 'button';
      muteBtn.addEventListener('click', () => {
        socket.emit('mute-user', { room: currentRoom, targetId: u.id, muted: !u.muted });
      });
      const kickBtn = document.createElement('button');
      kickBtn.className = 'icon-btn';
      kickBtn.textContent = '🗑️';
      kickBtn.title = 'Remove user';
      kickBtn.type = 'button';
      kickBtn.addEventListener('click', () => {
        if (confirm('Remove this user from the room?')) {
          socket.emit('kick-user', { room: currentRoom, targetId: u.id });
        }
      });
      controls.appendChild(muteBtn);
      controls.appendChild(kickBtn);
      li.appendChild(controls);
    }
    userListEl.appendChild(li);
  });
});

socket.on('you', ({ room, id, name, role, muted, adminToken: newAdminToken }) => {
  if (displayNameInput) displayNameInput.value = name || '';
  try { if (name) localStorage.setItem('displayName', name); } catch {}
  currentUserId = id || currentUserId;
  currentUserRole = role || currentUserRole;
  isMuted = Boolean(muted);
  if (typeof isMuted === 'boolean' && editor) {
    editor.disabled = isMuted;
  }
  if (newAdminToken && room) {
    try {
      const map = JSON.parse(localStorage.getItem('adminTokens') || '{}') || {};
      map[room] = newAdminToken;
      localStorage.setItem('adminTokens', JSON.stringify(map));
    } catch {}
  }
});

// Notify on moderation events
socket.on('kicked', ({ room }) => {
  showNotification(`You have been removed from room: ${room}`, 'error');
});

socket.on('muted', ({ room, muted }) => {
  showNotification(muted ? `You were muted in ${room}` : `You were unmuted in ${room}`, muted ? 'error' : 'success');
  // Optional UX: disable editor when muted
  if (typeof muted === 'boolean' && editor) {
    editor.disabled = muted;
    editor.placeholder = muted ? 'You are muted by admin. You cannot type.' : editor.placeholder;
  }
});

// Inject CSS for notifications
const notificationStyles = `
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  max-width: 300px;
}

.notification.show {
  transform: translateX(0);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-icon {
  font-size: 18px;
}

.notification-message {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.notification.error {
  border-left: 4px solid #ef4444;
}

.notification.success {
  border-left: 4px solid #10b981;
}

.notification.info {
  border-left: 4px solid #3b82f6;
}

.drag-over {
  border-color: #667eea !important;
  background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%) !important;
  transform: scale(1.02);
}

.uploading {
  opacity: 0.7;
  pointer-events: none;
  position: relative;
}

.uploading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border: 2px solid #667eea;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
