const socket = io();

// Add comprehensive connection debugging
console.log('🔌 Attempting to connect to server...');
console.log('Socket object:', socket);

socket.on('connect', () => {
  console.log('✅ Connected to server:', socket.id);
  updateConnectionStatus("connected", "Connected");
  
  // Hide loading screen when connected
  if (window.loadingScreen) {
    console.log('Hiding loading screen');
    window.loadingScreen.classList.add('hidden');
  }
  if (window.mainApp) {
    console.log('Showing main app');
    window.mainApp.style.opacity = '1';
  }
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
  updateConnectionStatus("disconnected", "Disconnected");
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error);
  showNotification("Failed to connect to server. Please check if the server is running.", "error");
  updateConnectionStatus("error", "Connection Failed");
  
  // Hide loading screen on error
  if (window.loadingScreen) {
    window.loadingScreen.classList.add('hidden');
  }
  if (window.mainApp) {
    window.mainApp.style.opacity = '1';
  }
  
  joinBtn.disabled = false;
  joinBtn.classList.remove('loading');
  joinBtn.querySelector('.btn-content').style.opacity = '1';
  joinBtn.querySelector('.btn-loading').style.opacity = '0';
});

// Initialize loading screen
function initializeLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  const mainApp = document.getElementById('mainApp');
  
  // Store references for use in connection handlers
  window.loadingScreen = loadingScreen;
  window.mainApp = mainApp;
}

// Enhanced connection status management
function updateConnectionStatus(status, message) {
  const statusIndicator = document.getElementById('connectionStatus');
  const icon = statusIndicator.querySelector('i');
  const text = statusIndicator.querySelector('span');
  
  statusIndicator.className = `status-indicator ${status}`;
  text.textContent = message;
  
  // Update icon based on status
  switch(status) {
    case 'connected':
      icon.className = 'fas fa-circle';
      statusIndicator.style.background = 'var(--success-color)';
      break;
    case 'connecting':
      icon.className = 'fas fa-circle';
      statusIndicator.style.background = 'var(--warning-color)';
      break;
    case 'error':
      icon.className = 'fas fa-exclamation-circle';
      statusIndicator.style.background = 'var(--danger-color)';
      break;
    default:
      icon.className = 'fas fa-circle';
      statusIndicator.style.background = 'var(--gray-400)';
  }
  
  isConnected = status === "connected";
}

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
let typingLockStatus = { isLocked: false, lockedBy: null, lockedByUser: null };
let hasTypingLock = false;
let typingLockTimeout = null;
let typingActivityTimeout = null;
let isCurrentlyTyping = false;

// Room activity messages
function addRoomActivity(message, type = 'info') {
  const activityContent = document.getElementById('activityContent');
  if (!activityContent) return;
  
  const activityMessage = document.createElement('div');
  activityMessage.className = `activity-message ${type}`;
  
  const timestamp = new Date().toLocaleTimeString();
  const icon = getActivityIcon(type);
  
  activityMessage.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <i class="${icon}" style="font-size: 0.8rem;"></i>
      <span style="flex: 1;">${message}</span>
      <small style="color: var(--gray-500); font-size: 0.7rem;">${timestamp}</small>
    </div>
  `;
  
  activityContent.appendChild(activityMessage);
  
  // Auto-scroll to bottom
  activityContent.scrollTop = activityContent.scrollHeight;
  
  // Keep only last 20 messages
  const messages = activityContent.querySelectorAll('.activity-message');
  if (messages.length > 20) {
    messages[0].remove();
  }
}

function getActivityIcon(type) {
  switch(type) {
    case 'success': return 'fas fa-check-circle';
    case 'error': return 'fas fa-exclamation-circle';
    case 'warning': return 'fas fa-exclamation-triangle';
    case 'info': return 'fas fa-info-circle';
    default: return 'fas fa-bell';
  }
}

function clearRoomActivity() {
  const activityContent = document.getElementById('activityContent');
  if (activityContent) {
    activityContent.innerHTML = '<div class="activity-message">Welcome to the room! Activity updates will appear here...</div>';
  }
}

// Room config visibility management
function hideRoomConfig() {
  // Hide only the form and available rooms, not the entire section
  const configFormSection = document.querySelector('.config-form-section');
  const roomListSection = document.querySelector('.room-list-section');
  
  if (configFormSection) {
    configFormSection.style.display = 'none';
  }
  if (roomListSection) {
    roomListSection.style.display = 'none';
  }
}

function showRoomConfig() {
  // Show the form and available rooms
  const configFormSection = document.querySelector('.config-form-section');
  const roomListSection = document.querySelector('.room-list-section');
  
  if (configFormSection) {
    configFormSection.style.display = 'block';
  }
  if (roomListSection) {
    roomListSection.style.display = 'block';
  }
}

function showLeaveRoomButton() {
  const currentRoomDisplay = document.getElementById('currentRoomDisplay');
  const currentRoomName = document.getElementById('currentRoomName');
  
  if (currentRoomDisplay) {
    currentRoomDisplay.style.display = 'flex';
  }
  if (currentRoomName && currentRoom) {
    currentRoomName.textContent = currentRoom;
  }
}

function hideLeaveRoomButton() {
  const currentRoomDisplay = document.getElementById('currentRoomDisplay');
  if (currentRoomDisplay) {
    currentRoomDisplay.style.display = 'none';
  }
}

function leaveRoom() {
  if (currentRoom) {
    addRoomActivity(`Left room: ${currentRoom}`, 'warning');
    socket.emit('leave', { room: currentRoom });
    currentRoom = '';
    
    // Show room config form and hide leave button
    showRoomConfig();
    hideLeaveRoomButton();
    
    // Reset join button
    const joinBtn = document.getElementById('joinBtn');
    if (joinBtn) {
      joinBtn.disabled = false;
      joinBtn.classList.remove('loading');
      joinBtn.querySelector('.btn-content').style.opacity = '1';
      joinBtn.querySelector('.btn-loading').style.opacity = '0';
      joinBtn.querySelector('.btn-text').textContent = 'Join Room';
      joinBtn.querySelector('.btn-content i').className = 'fas fa-sign-in-alt';
    }
  }
}

// Dark mode functionality
function toggleDarkMode() {
  const body = document.body;
  const darkModeBtn = document.getElementById('toggleDarkMode');
  const icon = darkModeBtn.querySelector('i');
  
  body.classList.toggle('dark-mode');
  
  if (body.classList.contains('dark-mode')) {
    icon.className = 'fas fa-sun';
    localStorage.setItem('darkMode', 'true');
    addRoomActivity('Dark mode enabled', 'info');
  } else {
    icon.className = 'fas fa-moon';
    localStorage.setItem('darkMode', 'false');
    addRoomActivity('Dark mode disabled', 'info');
  }
}

// Initialize dark mode from localStorage
function initializeDarkMode() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  const body = document.body;
  const darkModeBtn = document.getElementById('toggleDarkMode');
  const icon = darkModeBtn?.querySelector('i');
  
  if (isDarkMode) {
    body.classList.add('dark-mode');
    if (icon) icon.className = 'fas fa-sun';
  }
}

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

// Typing lock management
function requestTypingLock() {
  if (!currentRoom || !isConnected || isMuted) return;
  socket.emit("request-typing-lock");
}

function releaseTypingLock() {
  if (!currentRoom || !isConnected || !hasTypingLock) return;
  socket.emit("release-typing-lock");
  hasTypingLock = false;
  isCurrentlyTyping = false;
  updateEditorLockStatus();
  if (typingLockTimeout) {
    clearTimeout(typingLockTimeout);
    typingLockTimeout = null;
  }
  if (typingActivityTimeout) {
    clearTimeout(typingActivityTimeout);
    typingActivityTimeout = null;
  }
}

function updateEditorLockStatus() {
  if (!editor) return;
  
  if (typingLockStatus.isLocked && !hasTypingLock) {
    editor.disabled = true;
    editor.placeholder = `${typingLockStatus.lockedByUser} is currently typing. Please wait...`;
    editor.style.backgroundColor = "#f8f9fa";
    editor.style.cursor = "not-allowed";
    
    // Show typing lock indicator
    typingLockIndicator.textContent = `🔒 ${typingLockStatus.lockedByUser} is typing`;
    typingLockIndicator.style.color = "#ef4444";
    typingLockIndicator.style.display = "block";
  } else if (hasTypingLock) {
    editor.disabled = false;
    editor.placeholder = "Start typing your notes here... All changes are synchronized in real-time with your team members! 🚀";
    editor.style.backgroundColor = "#f0f9ff";
    editor.style.cursor = "";
    
    // Show that you have the lock
    typingLockIndicator.textContent = "✅ You are typing";
    typingLockIndicator.style.color = "#10b981";
    typingLockIndicator.style.display = "block";
  } else if (!isMuted) {
    editor.disabled = false;
    editor.placeholder = "Start typing your notes here... All changes are synchronized in real-time with your team members! 🚀";
    editor.style.backgroundColor = "";
    editor.style.cursor = "";
    
    // Hide typing lock indicator
    typingLockIndicator.style.display = "none";
  }
}

function startTypingLockTimer() {
  if (typingLockTimeout) {
    clearTimeout(typingLockTimeout);
  }
  // Auto-release lock after 25 seconds of inactivity
  typingLockTimeout = setTimeout(() => {
    releaseTypingLock();
  }, 25000);
}

function startTypingActivity() {
  if (!hasTypingLock) return;
  
  isCurrentlyTyping = true;
  
  // Clear existing timeout
  if (typingActivityTimeout) {
    clearTimeout(typingActivityTimeout);
  }
  
  // Send typing activity signal to server
  socket.emit('typing-activity', { isTyping: true });
  
  // Set timeout to detect when user stops typing
  typingActivityTimeout = setTimeout(() => {
    stopTypingActivity();
  }, 2000); // 2 seconds of inactivity = stopped typing
}

function stopTypingActivity() {
  if (!hasTypingLock || !isCurrentlyTyping) return;
  
  isCurrentlyTyping = false;
  
  // Send stop typing signal to server
  socket.emit('typing-activity', { isTyping: false });
  
  // Release the lock after a short delay
  setTimeout(() => {
    if (hasTypingLock && !isCurrentlyTyping) {
      releaseTypingLock();
    }
  }, 1000); // 1 second delay before releasing
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

async function checkRoomExistsAndJoin(roomName) {
  try {
    // Fetch available rooms to check if the room exists
    const res = await fetch('/rooms', { cache: 'no-store' });
    const data = await res.json();
    
    if (data?.success && data.rooms) {
      const roomExists = data.rooms.some(room => room.name === roomName);
      
      if (roomExists) {
        // Room exists, auto-join
        if (socket.connected) {
          joinRoom();
        } else {
          socket.once('connect', () => joinRoom());
        }
      } else {
        // Room doesn't exist, join world room instead
        addRoomActivity(`Previous room "${roomName}" not found, joining world room`, 'warning');
        roomInput.value = 'world';
        currentRoom = 'world';
        if (socket.connected) {
          joinRoom();
        } else {
          socket.once('connect', () => joinRoom());
        }
      }
    } else {
      // Fallback to world room
      addRoomActivity('Could not check room availability, joining world room', 'warning');
      roomInput.value = 'world';
      currentRoom = 'world';
      if (socket.connected) {
        joinRoom();
      } else {
        socket.once('connect', () => joinRoom());
      }
    }
  } catch (error) {
    // Fallback to world room on error
    addRoomActivity('Error checking room availability, joining world room', 'warning');
    roomInput.value = 'world';
    currentRoom = 'world';
    if (socket.connected) {
      joinRoom();
    } else {
      socket.once('connect', () => joinRoom());
    }
  }
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
  console.log('🚀 joinRoom() called');
  const roomName = roomInput.value.trim();
  const password = passwordInput.value;
  const isLAN = connectionType.value === "lan";

  console.log('Room name:', roomName);
  console.log('Password:', password);
  console.log('Is LAN:', isLAN);
  console.log('Socket connected:', socket.connected);

  if (!roomName) {
    showNotification("Please enter a room name", "error");
    addRoomActivity('Join failed: No room name provided', 'error');
    return;
  }

  // In join mode: if a room name is provided, always use it; otherwise fallback to defaults
  const finalRoom = mode === "join"
    ? (roomName || (isLAN ? "lan_world" : "world"))
    : roomName || (isLAN ? "lan_world" : "world");
  currentRoom = finalRoom;
  
  // Only save to localStorage if user explicitly joins a room (not auto-join)
  if (roomName) {
    try { localStorage.setItem('lastRoom', finalRoom); } catch {}
  }

  addRoomActivity(`Attempting to ${mode} room: ${finalRoom}`, 'info');
  if (password) {
    addRoomActivity('Using password for private room', 'info');
  }

  // Enhanced button loading state
  joinBtn.disabled = true;
  joinBtn.classList.add('loading');
  joinBtn.querySelector('.btn-content').style.opacity = '0';
  joinBtn.querySelector('.btn-loading').style.opacity = '1';
  updateConnectionStatus("connecting", "Connecting...");

  const connectionTimeout = setTimeout(() => {
    if (joinBtn.disabled) {
      showNotification("Connection timeout. Please try again.", "error");
      updateConnectionStatus("error", "Connection Timeout");
      joinBtn.disabled = false;
      joinBtn.classList.remove('loading');
      joinBtn.querySelector('.btn-content').style.opacity = '1';
      joinBtn.querySelector('.btn-loading').style.opacity = '0';
      addRoomActivity('Connection timeout', 'error');
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
  
  // Enhanced notification with proper icons
  const icons = {
    error: 'fas fa-exclamation-circle',
    success: 'fas fa-check-circle',
    info: 'fas fa-info-circle',
    warning: 'fas fa-exclamation-triangle'
  };
  
  notification.innerHTML = `
    <div class="notification-content">
      <i class="notification-icon ${icons[type] || icons.info}"></i>
      <span class="notification-message">${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => notification.classList.add("show"), 100);
  
  // Auto remove with animation
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 5000);
}

// 🟩 DOMContentLoaded: Auto-join LAN room if selected
document.addEventListener("DOMContentLoaded", () => {
  // Initialize loading screen
  initializeLoadingScreen();
  
  // Initialize dark mode
  initializeDarkMode();
  
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
      // Check if room exists before auto-joining
      checkRoomExistsAndJoin(lastRoom);
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
    tabJoin.addEventListener("click", () => { 
      revealControls(); 
      setMode("join"); 
      fetchRooms(); 
      addRoomActivity('Switched to Join Room mode', 'info');
    });
    tabCreate.addEventListener("click", () => { 
      revealControls(); 
      setMode("create"); 
      fetchRooms(); 
      addRoomActivity('Switched to Create Room mode', 'info');
    });
  }

  // Initialize new buttons
  const refreshRoomsBtn = document.getElementById('refreshRooms');
  const clearLogBtn = document.getElementById('clearActivity');
  const darkModeBtn = document.getElementById('toggleDarkMode');
  
  if (refreshRoomsBtn) {
    refreshRoomsBtn.addEventListener('click', () => {
      addRoomActivity('Refreshing room list...', 'info');
      fetchRooms();
    });
  }
  
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      clearRoomActivity();
      addRoomActivity('Room activity cleared', 'info');
    });
  }
  
  // Show room config when clicking join/create buttons
  const joinBtn = document.getElementById('joinBtn');
  const createBtn = document.getElementById('createBtn');
  
  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      showRoomConfig();
    });
  }
  
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      showRoomConfig();
    });
  }
  
  // Show room config when clicking on editor area (if form is hidden)
  const editor = document.getElementById('editor');
  if (editor) {
    editor.addEventListener('click', () => {
      const configFormSection = document.querySelector('.config-form-section');
      if (configFormSection && configFormSection.style.display === 'none') {
        showRoomConfig();
      }
    });
  }
  
  if (darkModeBtn) {
    darkModeBtn.addEventListener('click', toggleDarkMode);
  }
  
  // Leave room button
  const leaveRoomBtn = document.getElementById('leaveRoomBtn');
  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener('click', leaveRoom);
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
    // Request typing lock if we don't have it
    if (!hasTypingLock && !typingLockStatus.isLocked) {
      requestTypingLock();
    }
    
    // Only emit text if we have the lock or no one else is typing
    if (hasTypingLock || !typingLockStatus.isLocked) {
      socket.emit("text", { text: editor.value, user: "You" });
      socket.emit("typing", "You");
      
      // Start typing activity detection
      if (hasTypingLock) {
        startTypingActivity();
        startTypingLockTimer();
      }
    }
  }
});

// Handle editor focus to request lock
editor.addEventListener("focus", () => {
  if (currentRoom && isConnected && !hasTypingLock && !typingLockStatus.isLocked) {
    requestTypingLock();
  }
});

// Handle editor blur to release lock
editor.addEventListener("blur", () => {
  if (hasTypingLock) {
    // Small delay to allow for quick re-focus
    setTimeout(() => {
      if (document.activeElement !== editor && hasTypingLock) {
        releaseTypingLock();
      }
    }, 2000);
  }
});

// Typing indicator
const typingIndicator = document.createElement("div");
typingIndicator.id = "typingIndicator";
typingIndicator.style.marginTop = "4px";
typingIndicator.style.fontStyle = "italic";
typingIndicator.style.color = "#555";
editor.parentNode.insertBefore(typingIndicator, editor.nextSibling);

// Typing lock indicator
const typingLockIndicator = document.createElement("div");
typingLockIndicator.id = "typingLockIndicator";
typingLockIndicator.style.marginTop = "4px";
typingLockIndicator.style.fontSize = "12px";
typingLockIndicator.style.fontWeight = "500";
typingLockIndicator.style.display = "none";
editor.parentNode.insertBefore(typingLockIndicator, editor.nextSibling);

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
  addRoomActivity('Connected to server', 'success');
  // ask for users if already in a room
  socket.emit('who');
  // Get typing lock status
  socket.emit('get-typing-lock-status');
});

socket.on("disconnect", () => {
  updateConnectionStatus("disconnected", "Disconnected");
  isConnected = false;
  addRoomActivity('Disconnected from server', 'warning');
});

socket.on("unauthorized", (msg) => {
  if (socket.connectionTimeout) {
    clearTimeout(socket.connectionTimeout);
    socket.connectionTimeout = null;
  }

  showNotification(msg || "Incorrect password. Please try again.", "error");
  updateConnectionStatus("error", "Authentication Failed");
  joinBtn.disabled = false;
  joinBtn.classList.remove('loading');
  joinBtn.querySelector('.btn-content').style.opacity = '1';
  joinBtn.querySelector('.btn-loading').style.opacity = '0';
  addRoomActivity(`Authentication failed: ${msg || 'Incorrect password'}`, 'error');
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
    joinBtn.classList.remove('loading');
    joinBtn.querySelector('.btn-content').style.opacity = '1';
    joinBtn.querySelector('.btn-loading').style.opacity = '0';
    joinBtn.querySelector('.btn-text').textContent = 'Connected';
    joinBtn.querySelector('.btn-content i').className = 'fas fa-check';
    
    addRoomActivity(`Successfully joined room: ${currentRoom}`, 'success');
    
    // Hide room config form and show leave button after joining
    hideRoomConfig();
    showLeaveRoomButton();
    
    // ask server for current users list and our own name
    socket.emit('who');
    // Get typing lock status when joining
    socket.emit('get-typing-lock-status');
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
    console.log('🔍 fetchRooms() called');
    addRoomActivity('Fetching available rooms...', 'info');
    const res = await fetch('/rooms', { cache: 'no-store' });
    console.log('Rooms response status:', res.status);
    const data = await res.json();
    console.log('Rooms data:', data);
    if (!data?.success) {
      console.warn('Rooms fetch failed', data);
      addRoomActivity('Failed to fetch rooms', 'error');
      return;
    }
    console.debug('Rooms fetched:', data.rooms);
    addRoomActivity(`Found ${data.rooms.length} available rooms`, 'success');
    renderRoomList(data.rooms || []);
  } catch (error) {
    addRoomActivity('Error fetching rooms: ' + error.message, 'error');
  }
}

function renderRoomList(rooms) {
  if (!roomListEl) return;
  roomListEl.innerHTML = '';
  if (!rooms.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <i class="fas fa-door-open"></i>
      <p>No rooms available</p>
      <small>Create a new room to get started</small>
    `;
    roomListEl.appendChild(emptyState);
    return;
  }
  rooms.forEach((r, index) => {
    const roomPill = document.createElement('div');
    roomPill.className = 'room-pill';
    roomPill.style.animationDelay = `${index * 0.1}s`;
    roomPill.style.animation = 'slideInUp 0.3s ease both';
    roomPill.innerHTML = `
      <div class="room-info">
        <i class="fas fa-home"></i>
        <span class="room-name">${r.name}</span>
      </div>
      <div class="room-status">
        <i class="fas ${r.isPrivate ? 'fa-lock' : 'fa-unlock'}"></i>
      </div>
    `;
    roomPill.addEventListener('click', () => handleRoomClick(r));
    roomListEl.appendChild(roomPill);
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
  const fileItem = document.createElement("div");
  fileItem.className = "file-item";
  fileItem.style.animation = "slideInUp 0.3s ease";
  
  // Get file icon based on extension
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
      pdf: 'fas fa-file-pdf',
      doc: 'fas fa-file-word',
      docx: 'fas fa-file-word',
      txt: 'fas fa-file-alt',
      jpg: 'fas fa-file-image',
      jpeg: 'fas fa-file-image',
      png: 'fas fa-file-image',
      gif: 'fas fa-file-image',
      mp4: 'fas fa-file-video',
      avi: 'fas fa-file-video',
      zip: 'fas fa-file-archive',
      rar: 'fas fa-file-archive'
    };
    return iconMap[ext] || 'fas fa-file';
  };
  
  fileItem.innerHTML = `
    <div class="file-info">
      <i class="file-icon ${getFileIcon(filename)}"></i>
      <span class="file-name">${name}</span>
    </div>
    <div class="file-actions">
      <a href="${link}" download title="Download" class="action-btn">
        <i class="fas fa-download"></i>
      </a>
      <button class="action-btn delete-file" data-filename="${filename}" title="Delete">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
  
  const delBtn = fileItem.querySelector(".delete-file");
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
  
  return fileItem;
}

socket.on("file-uploaded", (file) => {
  const li = renderFileItem(file);
  fileList.appendChild(li);
  updateFileCount();
  addRoomActivity(`File shared: ${file.name}`, 'info');
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

// Track previous user list for activity logging
let previousUserList = [];

// Enhanced users handling with animations
socket.on('user-list', (users) => {
  if (!userListEl) return;
  
  // Log user joins and leaves
  const currentUsers = users || [];
  const currentUserIds = currentUsers.map(u => u.id);
  const previousUserIds = previousUserList.map(u => u.id);
  
  // Check for new users (joins)
  currentUsers.forEach(user => {
    if (!previousUserIds.includes(user.id)) {
      addRoomActivity(`${user.name} joined the room`, 'success');
    }
  });
  
  // Check for users who left
  previousUserList.forEach(user => {
    if (!currentUserIds.includes(user.id)) {
      addRoomActivity(`${user.name} left the room`, 'warning');
    }
  });
  
  // Update user count
  const userCount = document.getElementById('userCount');
  if (userCount) {
    userCount.textContent = currentUsers.length;
    userCount.style.animation = 'pulse 0.5s ease';
  }
  
  userListEl.innerHTML = '';
  currentUsers.forEach((u, index) => {
    const userItem = document.createElement('div');
    userItem.className = `user-item ${u.role === 'admin' ? 'admin' : ''} ${u.muted ? 'muted' : ''}`;
    userItem.style.animationDelay = `${index * 0.1}s`;
    userItem.style.animation = 'slideInUp 0.3s ease both';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    const userName = document.createElement('span');
    userName.className = 'user-name';
    userName.textContent = u.name;
    
    const userRole = document.createElement('span');
    userRole.className = 'user-role';
    if (u.role === 'admin') {
      userRole.innerHTML = '<i class="fas fa-crown"></i> Admin';
    }
    
    userInfo.appendChild(userName);
    userInfo.appendChild(userRole);
    userItem.appendChild(userInfo);
    
    // Admin controls
    if (currentUserRole === 'admin' && u.role !== 'admin' && u.id !== currentUserId) {
      const controls = document.createElement('div');
      controls.className = 'user-controls';
      
      const muteBtn = document.createElement('button');
      muteBtn.className = 'control-btn';
      muteBtn.innerHTML = `<i class="fas ${u.muted ? 'fa-volume-up' : 'fa-volume-mute'}"></i>`;
      muteBtn.title = u.muted ? 'Unmute' : 'Mute';
      muteBtn.addEventListener('click', () => {
        socket.emit('mute-user', { room: currentRoom, targetId: u.id, muted: !u.muted });
        addRoomActivity(`${u.name} ${u.muted ? 'unmuted' : 'muted'}`, 'info');
      });
      
      const kickBtn = document.createElement('button');
      kickBtn.className = 'control-btn';
      kickBtn.innerHTML = '<i class="fas fa-user-times"></i>';
      kickBtn.title = 'Remove user';
      kickBtn.addEventListener('click', () => {
        if (confirm('Remove this user from the room?')) {
          socket.emit('kick-user', { room: currentRoom, targetId: u.id });
          addRoomActivity(`${u.name} kicked from room`, 'error');
        }
      });
      
      controls.appendChild(muteBtn);
      controls.appendChild(kickBtn);
      userItem.appendChild(controls);
    }
    
    userListEl.appendChild(userItem);
  });
  
  // Update previous user list
  previousUserList = [...currentUsers];
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
socket.on('kicked', ({ room, movedTo }) => {
  if (movedTo) {
    showNotification(`You were moved from ${room} to ${movedTo} room`, 'warning');
    addRoomActivity(`Moved to ${movedTo} room`, 'warning');
    currentRoom = movedTo;
  } else {
    showNotification(`You have been removed from room: ${room}`, 'error');
    addRoomActivity(`Removed from ${room}`, 'error');
  }
});

socket.on('muted', ({ room, muted }) => {
  showNotification(muted ? `You were muted in ${room}` : `You were unmuted in ${room}`, muted ? 'error' : 'success');
  // Optional UX: disable editor when muted
  if (typeof muted === 'boolean' && editor) {
    editor.disabled = muted;
    editor.placeholder = muted ? 'You are muted by admin. You cannot type.' : editor.placeholder;
  }
});

// Typing lock event handlers
socket.on('typing-lock-acquired', () => {
  hasTypingLock = true;
  updateEditorLockStatus();
  showNotification('You can now type!', 'success');
});

socket.on('typing-lock-denied', ({ lockedByUser }) => {
  showNotification(`${lockedByUser} is currently typing. Please wait...`, 'error');
});

socket.on('typing-lock-changed', ({ lockedByUser }) => {
  typingLockStatus.isLocked = true;
  typingLockStatus.lockedByUser = lockedByUser;
  updateEditorLockStatus();
  if (lockedByUser !== 'You') {
    showNotification(`${lockedByUser} is now typing`, 'info');
  }
});

socket.on('typing-lock-released', () => {
  typingLockStatus.isLocked = false;
  typingLockStatus.lockedBy = null;
  typingLockStatus.lockedByUser = null;
  updateEditorLockStatus();
});

socket.on('typing-lock-status', (status) => {
  typingLockStatus = status;
  updateEditorLockStatus();
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

#typingLockIndicator {
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 4px;
  display: inline-block;
  transition: all 0.3s ease;
}

#typingLockIndicator[style*="display: block"] {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
