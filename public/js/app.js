/**
 * TeamUp - Professional Real-time Collaborative Application
 * Modern ES6+ Architecture with Performance Optimizations
 */

console.log('📜 app.js loaded successfully');

class TeamUpApp {
  constructor() {
    console.log('🏗️ Creating TeamUpApp instance...');

    try {
      this.socket = io();
      console.log('✅ Socket.IO initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Socket.IO:', error);
      throw new Error('Socket.IO initialization failed');
    }

    this.state = {
      currentRoom: '',
      currentUserId: null,
      currentUserRole: null,
      isMuted: false,
      isConnected: false,
      typingLockStatus: { isLocked: false, lockedBy: null, lockedByUser: null },
      hasTypingLock: false,
      adminTokens: {},
      mode: 'join',
      videoParticipants: [] // Track users with video enabled
    };

    this.timers = {
      typingLock: null,
      typingActivity: null,
      connectionTimeout: null
    };

    this.elements = {};
    this.isCurrentlyTyping = false;
    this.previousUserList = [];

    // Video components (initialized when joining a room)
    this.mediaManager = null;
    this.videoGrid = null;
    this.videoControls = null;
    this.connectionQualityMonitor = null; // Connection quality monitoring
    this.videoStatsMonitor = null; // Video call statistics

    console.log('✅ TeamUpApp instance created, starting initialization...');
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Starting TeamUp initialization...');

      await this.cacheElements();
      console.log('✅ Elements cached');

      this.setupEventListeners();
      console.log('✅ Event listeners set up');

      this.initializeUI();
      console.log('✅ UI initialized');

      this.loadUserPreferences();
      console.log('✅ User preferences loaded');

      this.setupSocketListeners();
      console.log('✅ Socket listeners set up');

      console.log('✅ TeamUp initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize TeamUp:', error);
      console.error('Error stack:', error.stack);

      // Show a more user-friendly error message
      const errorMsg = `Initialization failed: ${error.message}`;

      // Try to show notification even if elements aren't cached
      try {
        this.showNotification(errorMsg, 'error');
      } catch (notificationError) {
        // Fallback to basic notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed; top: 20px; right: 20px; 
          background: #ef4444; color: white; 
          padding: 1rem; border-radius: 0.5rem; 
          z-index: 9999; max-width: 300px;
        `;
        notification.textContent = errorMsg;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 5000);
      }
    }
  }

  async cacheElements() {
    const elementIds = [
      'editor', 'roomInput', 'passwordInput', 'joinBtn', 'tabJoin', 'tabCreate',
      'connectionType', 'uploadForm', 'fileInput', 'fileList', 'dropArea',
      'connectionStatus', 'fileCount', 'controlsPanel', 'roomList', 'userList',
      'displayNameInput', 'setNameBtn', 'rememberToggle', 'toggleShare',
      'toggleDownloads', 'downloadsPanel', 'loadingScreen', 'mainApp',
      'refreshRooms', 'clearActivity', 'toggleDarkMode', 'leaveRoomBtn',
      'currentRoomDisplay', 'currentRoomName', 'activityContent', 'userCount',
      'onlineUsers', 'activeRooms', 'toggleThemeSelector', 'themeSelectorPanel',
      'closeThemePanel', 'btnJoinVoice', 'btnLeaveVoice', 'voiceStatus', 'voiceUserList'
    ];

    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`⚠️ Element with ID '${id}' not found`);
      }
      this.elements[id] = element;
    });

    this.elements.configFormSection = document.querySelector('.config-form-section');
    this.elements.roomListSection = document.querySelector('.room-list-section');
    this.elements.workspaceSection = document.querySelector('.workspace-section');

    if (!this.elements.configFormSection) {
      console.warn('⚠️ .config-form-section not found');
    }
    if (!this.elements.roomListSection) {
      console.warn('⚠️ .room-list-section not found');
    }
    if (!this.elements.workspaceSection) {
      console.warn('⚠️ .workspace-section not found');
    }
  }

  setupEventListeners() {
    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('disconnect', () => this.handleDisconnect());
    this.socket.on('connect_error', (error) => this.handleConnectionError(error));
    this.socket.on('text', (payload) => this.handleTextUpdate(payload));
    this.socket.on('unauthorized', (msg) => this.handleUnauthorized(msg));
    this.socket.on('user-list', (users) => this.handleUserListUpdate(users));
    this.socket.on('you', (data) => this.handleUserData(data));
    this.socket.on('file-uploaded', (file) => this.handleFileUploaded(file));
    this.socket.on('file-list', (files) => this.handleFileList(files));
    this.socket.on('file-deleted', ({ filename }) => this.handleFileDeleted(filename));
    this.socket.on('typing-lock-acquired', () => this.handleTypingLockAcquired());
    this.socket.on('typing-lock-denied', ({ lockedByUser }) => this.handleTypingLockDenied(lockedByUser));
    this.socket.on('typing-lock-changed', ({ lockedByUser }) => this.handleTypingLockChanged(lockedByUser));
    this.socket.on('typing-lock-released', () => this.handleTypingLockReleased());
    this.socket.on('typing-lock-status', (status) => this.handleTypingLockStatus(status));
    this.socket.on('kicked', ({ room, movedTo }) => this.handleKicked(room, movedTo));
    this.socket.on('muted', ({ room, muted }) => this.handleMuted(room, muted));
    this.socket.on('typing', (user) => this.handleTypingIndicator(user));

    // Video event listeners
    this.socket.on('user-video-enabled', (data) => this.handleUserVideoEnabled(data));
    this.socket.on('user-video-disabled', (data) => this.handleUserVideoDisabled(data));
    this.socket.on('user-audio-enabled', (data) => this.handleUserAudioEnabled(data));
    this.socket.on('user-audio-disabled', (data) => this.handleUserAudioDisabled(data));
    this.socket.on('user-screen-share-started', (data) => this.handleUserScreenShareStarted(data));
    this.socket.on('user-screen-share-stopped', (data) => this.handleUserScreenShareStopped(data));
    this.socket.on('media-participants', (data) => this.handleMediaParticipants(data));

    // Voice call event listeners
    this.socket.on('user-voice-call-started', (data) => this.handleUserVoiceCallStarted(data));
    this.socket.on('user-call-ended', (data) => this.handleUserCallEnded(data));
    this.socket.on('user-call-mode-changed', (data) => this.handleUserCallModeChanged(data));

    // WebRTC signaling event listeners
    console.log('🔧 Registering WebRTC socket listeners...');
    this.socket.on('webrtc-offer', (data) => {
      console.log('🎯 webrtc-offer listener triggered!');
      this.handleWebRTCOffer(data);
    });
    this.socket.on('webrtc-answer', (data) => {
      console.log('🎯 webrtc-answer listener triggered!');
      this.handleWebRTCAnswer(data);
    });
    this.socket.on('webrtc-ice-candidate', (data) => {
      console.log('🎯 webrtc-ice-candidate listener triggered!');
      this.handleWebRTCIceCandidate(data);
    });
    console.log('✅ WebRTC socket listeners registered');

    // Admin video control event listeners
    // Requirements: 10.4, 10.5
    this.socket.on('video-disabled-by-admin', (data) => this.handleVideoDisabledByAdmin(data));
    this.socket.on('video-enabled-by-admin', (data) => this.handleVideoEnabledByAdmin(data));
    this.socket.on('screen-share-stopped-by-admin', (data) => this.handleScreenShareStoppedByAdmin(data));

    this.setupDOMEventListeners();
  }

  setupDOMEventListeners() {
    if (this.elements.tabJoin) {
      this.elements.tabJoin.addEventListener('click', () => this.setMode('join'));
    }
    if (this.elements.tabCreate) {
      this.elements.tabCreate.addEventListener('click', () => this.setMode('create'));
    }
    if (this.elements.joinBtn) {
      this.elements.joinBtn.addEventListener('click', () => this.joinRoom());
    }
    if (this.elements.connectionType) {
      this.elements.connectionType.addEventListener('change', () => this.updateDefaultRoom());
    }
    if (this.elements.editor) {
      this.elements.editor.addEventListener('input', () => this.handleEditorInput());
      this.elements.editor.addEventListener('focus', () => this.handleEditorFocus());
      this.elements.editor.addEventListener('blur', () => this.handleEditorBlur());
    }

    this.setupFileUploadListeners();

    if (this.elements.refreshRooms) {
      this.elements.refreshRooms.addEventListener('click', () => this.fetchRooms());
    }
    if (this.elements.clearActivity) {
      this.elements.clearActivity.addEventListener('click', () => this.clearRoomActivity());
    }
    if (this.elements.toggleDarkMode) {
      this.elements.toggleDarkMode.addEventListener('click', () => this.toggleDarkMode());
    }
    if (this.elements.leaveRoomBtn) {
      this.elements.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
    }
    if (this.elements.setNameBtn) {
      this.elements.setNameBtn.addEventListener('click', () => this.setUserName());
    }
    if (this.elements.displayNameInput) {
      this.elements.displayNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.setUserName();
        }
      });
    }
    if (this.elements.rememberToggle) {
      this.elements.rememberToggle.addEventListener('change', () => {
        this.savePreference('rememberLastRoom', this.elements.rememberToggle.checked);
      });
    }
    if (this.elements.toggleShare) {
      this.elements.toggleShare.addEventListener('click', () => this.togglePanel('share'));
    }
    if (this.elements.toggleDownloads) {
      this.elements.toggleDownloads.addEventListener('click', () => this.togglePanel('downloads'));
    }
    if (this.elements.toggleThemeSelector) {
      this.elements.toggleThemeSelector.addEventListener('click', () => this.toggleThemeSelector());
    }
    if (this.elements.closeThemePanel) {
      this.elements.closeThemePanel.addEventListener('click', () => this.closeThemeSelector());
    }

    // Voice Channel Controls
    if (this.elements.btnJoinVoice) {
      this.elements.btnJoinVoice.addEventListener('click', () => this.handleJoinVoiceClick());
    }
    if (this.elements.btnLeaveVoice) {
      this.elements.btnLeaveVoice.addEventListener('click', () => this.handleLeaveVoiceClick());
    }

    // Theme option click handlers
    document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-option')) {
        const themeOption = e.target.closest('.theme-option');
        const theme = themeOption.dataset.theme;
        this.setTheme(theme);
      }
    });

    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  setupFileUploadListeners() {
    if (!this.elements.dropArea || !this.elements.fileInput) return;

    this.elements.dropArea.addEventListener('click', () => this.elements.fileInput.click());

    this.elements.dropArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.elements.fileInput.click();
      }
    });

    this.elements.dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.dropArea.classList.add('drag-over');
    });

    this.elements.dropArea.addEventListener('dragleave', () => {
      this.elements.dropArea.classList.remove('drag-over');
    });

    this.elements.dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.dropArea.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        this.uploadFile(e.dataTransfer.files[0]);
      }
    });

    this.elements.fileInput.addEventListener('change', () => {
      if (this.elements.fileInput.files.length) {
        this.uploadFile(this.elements.fileInput.files[0]);
      }
    });
  }
  setupSocketListeners() {
    // Socket listeners are already set up in setupEventListeners
  }

  initializeUI() {
    this.initializeLoadingScreen();
    this.initializeDarkMode();
    this.initializeTheme();
    this.updateDefaultRoom();
    this.createTypingIndicators();
    this.updateFooterStats(0); // Initialize footer stats
  }

  initializeLoadingScreen() {
    if (this.elements.loadingScreen && this.elements.mainApp) {
      window.loadingScreen = this.elements.loadingScreen;
      window.mainApp = this.elements.mainApp;
    }
  }

  initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      if (this.elements.toggleDarkMode && this.elements.toggleDarkMode.querySelector('i')) {
        this.elements.toggleDarkMode.querySelector('i').className = 'fas fa-sun';
      }
    }
  }

  createTypingIndicators() {
    if (!this.elements.editor) return;

    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typingIndicator';
    typingIndicator.className = 'typing-indicator';
    this.elements.editor.parentNode.insertBefore(typingIndicator, this.elements.editor.nextSibling);

    const typingLockIndicator = document.createElement('div');
    typingLockIndicator.id = 'typingLockIndicator';
    typingLockIndicator.className = 'typing-lock-indicator';
    typingLockIndicator.style.display = 'none';
    this.elements.editor.parentNode.insertBefore(typingLockIndicator, this.elements.editor.nextSibling);

    this.elements.typingIndicator = typingIndicator;
    this.elements.typingLockIndicator = typingLockIndicator;
  }

  loadUserPreferences() {
    try {
      const savedName = localStorage.getItem('displayName') || '';
      if (this.elements.displayNameInput && savedName) {
        this.elements.displayNameInput.value = savedName;
      }

      this.state.adminTokens = JSON.parse(localStorage.getItem('adminTokens') || '{}');

      const remember = localStorage.getItem('rememberLastRoom') === 'true';
      if (this.elements.rememberToggle) {
        this.elements.rememberToggle.checked = remember;
      }

      const lastRoom = localStorage.getItem('lastRoom') || '';
      if (remember && lastRoom && this.elements.roomInput) {
        this.elements.roomInput.value = lastRoom;
        this.state.currentRoom = lastRoom;
        this.checkRoomExistsAndJoin(lastRoom);
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  savePreference(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'boolean' ? value.toString() : value);
    } catch (error) {
      console.warn(`Failed to save preference ${key}:`, error);
    }
  }

  // Socket Event Handlers
  handleConnect() {
    console.log('✅ Connected to server:', this.socket.id);
    this.updateConnectionStatus('connected', 'Connected');
    this.state.isConnected = true;

    this.hideLoadingScreen();
    this.addRoomActivity('Connected to server', 'success');

    this.socket.emit('who');
    this.socket.emit('get-typing-lock-status');
  }

  handleDisconnect() {
    console.log('❌ Disconnected from server');
    this.updateConnectionStatus('disconnected', 'Disconnected');
    this.state.isConnected = false;
    this.addRoomActivity('Disconnected from server', 'warning');
  }

  handleConnectionError(error) {
    console.error('❌ Connection error:', error);
    this.showNotification('Failed to connect to server. Please check if the server is running.', 'error');
    this.updateConnectionStatus('error', 'Connection Failed');

    this.hideLoadingScreen();
    this.resetJoinButton();
  }

  async handleJoinVoiceClick() {
    try {
      if (!this.mediaManager) return;

      this.elements.btnJoinVoice.disabled = true;
      this.elements.btnJoinVoice.innerHTML = '<div class="loading-spinner small"></div> Joining...';

      await this.mediaManager.startVoiceCall();
      this.updateVoiceChannelUI(true);

      // Request active participants to connect with
      this.socket.emit('get-media-participants', { room: this.state.currentRoom });

      this.addRoomActivity('Joined voice channel', 'success');
    } catch (error) {
      console.error('Failed to join voice:', error);
      // Notification handled by mediaManager
      this.elements.btnJoinVoice.disabled = false;
      this.elements.btnJoinVoice.innerHTML = '<i class="fas fa-headset"></i><span>Join Voice</span>';
    }
  }

  async handleLeaveVoiceClick() {
    try {
      if (!this.mediaManager) return;

      await this.mediaManager.endCall();
      this.updateVoiceChannelUI(false);
      this.addRoomActivity('Left voice channel', 'info');
    } catch (error) {
      console.error('Failed to leave voice:', error);
    }
  }

  updateVoiceChannelUI(joined) {
    if (joined) {
      this.elements.btnJoinVoice?.classList.add('hidden');
      this.elements.btnLeaveVoice?.classList.remove('hidden');

      // Show video controls when joining voice
      if (this.videoControls) {
        this.videoControls.show();
        this.videoControls.updateMicrophoneButton(true);
      }

      if (this.elements.voiceStatus) {
        this.elements.voiceStatus.classList.add('connected');
        this.elements.voiceStatus.querySelector('.status-text').textContent = 'Connected';
      }
    } else {
      this.elements.btnJoinVoice?.classList.remove('hidden');
      this.elements.btnLeaveVoice?.classList.add('hidden');

      // Hide video controls when leaving voice
      if (this.videoControls) {
        this.videoControls.hide();
      }

      if (this.elements.btnJoinVoice) {
        this.elements.btnJoinVoice.disabled = false;
        this.elements.btnJoinVoice.innerHTML = '<i class="fas fa-headset"></i><span>Join Voice</span>';
      }

      if (this.elements.voiceStatus) {
        this.elements.voiceStatus.classList.remove('connected');
        this.elements.voiceStatus.querySelector('.status-text').textContent = 'Disconnected';
      }
    }
  }

  handleTextUpdate(payload) {
    const incomingText = typeof payload === 'string' ? payload : payload && payload.text;
    if (typeof incomingText === 'string' && this.elements.editor) {
      this.elements.editor.value = incomingText;
    }

    if (this.elements.joinBtn && this.elements.joinBtn.disabled) {
      this.handleSuccessfulJoin();
    }
  }

  handleSuccessfulJoin() {
    this.clearConnectionTimeout();
    this.showNotification(`Successfully joined room: ${this.state.currentRoom}`, 'success');
    this.updateConnectionStatus('connected', 'Connected');
    this.resetJoinButton();

    if (this.elements.joinBtn) {
      const btnText = this.elements.joinBtn.querySelector('.btn-text');
      const btnIcon = this.elements.joinBtn.querySelector('.btn-content i');
      if (btnText) btnText.textContent = 'Connected';
      if (btnIcon) btnIcon.className = 'fas fa-check';
    }

    this.addRoomActivity(`Successfully joined room: ${this.state.currentRoom}`, 'success');

    this.hideRoomConfig();
    this.showLeaveRoomButton();

    // Update footer stats when joining a room
    this.updateFooterStats(0);

    this.socket.emit('who');
    this.socket.emit('get-typing-lock-status');

    const savedName = localStorage.getItem('displayName');
    if (savedName) {
      this.socket.emit('set-name', { name: savedName, room: this.state.currentRoom });
    }

    // Initialize video components when joining a room
    // Requirements: 1.4, 2.5, 3.5
    this.initializeVideoComponents();
  }

  handleUnauthorized(msg) {
    this.clearConnectionTimeout();
    this.showNotification(msg || 'Incorrect password. Please try again.', 'error');
    this.updateConnectionStatus('error', 'Authentication Failed');
    this.resetJoinButton();
    this.addRoomActivity(`Authentication failed: ${msg || 'Incorrect password'}`, 'error');
  }

  handleUserListUpdate(users) {
    this.renderUserList(users || []);
    this.updateUserCount((users && users.length) || 0);
  }

  handleUserData(data) {
    const { room, id, name, role, muted, adminToken: newAdminToken } = data;

    if (this.elements.displayNameInput) {
      this.elements.displayNameInput.value = name || '';
    }

    this.savePreference('displayName', name);

    this.state.currentUserId = id || this.state.currentUserId;
    this.state.currentUserRole = role || this.state.currentUserRole;
    this.state.isMuted = Boolean(muted);

    if (this.elements.editor) {
      this.elements.editor.disabled = this.state.isMuted;
    }

    if (newAdminToken && room) {
      this.state.adminTokens[room] = newAdminToken;
      this.savePreference('adminTokens', JSON.stringify(this.state.adminTokens));
    }
  }

  handleFileUploaded(file) {
    const fileItem = this.renderFileItem(file);
    if (this.elements.fileList) {
      this.elements.fileList.appendChild(fileItem);
    }
    this.updateFileCount();
    this.addRoomActivity(`File shared: ${file.name}`, 'info');
  }

  handleFileList(files) {
    if (!this.elements.fileList) return;

    this.elements.fileList.innerHTML = '';
    files.forEach(file => {
      const fileItem = this.renderFileItem(file);
      this.elements.fileList.appendChild(fileItem);
    });
    this.updateFileCount();
  }

  handleFileDeleted(filename) {
    if (!this.elements.fileList) return;

    const items = Array.from(this.elements.fileList.children);
    items.forEach(item => {
      const btn = item.querySelector('.delete-file');
      if (btn && btn.dataset.filename === filename) {
        item.remove();
      }
    });
    this.updateFileCount();
  }

  handleTypingLockAcquired() {
    this.state.hasTypingLock = true;
    this.updateEditorLockStatus();
    this.showNotification('You can now type!', 'success');
  }

  handleTypingLockDenied(data) {
    const { lockedByUser } = data;
    this.showNotification(`${lockedByUser} is currently typing. Please wait...`, 'error');
  }

  handleTypingLockChanged(data) {
    const { lockedByUser } = data;
    this.state.typingLockStatus.isLocked = true;
    this.state.typingLockStatus.lockedByUser = lockedByUser;
    this.updateEditorLockStatus();

    if (lockedByUser !== 'You') {
      this.showNotification(`${lockedByUser} is now typing`, 'info');
    }
  }

  handleTypingLockReleased() {
    this.state.typingLockStatus.isLocked = false;
    this.state.typingLockStatus.lockedBy = null;
    this.state.typingLockStatus.lockedByUser = null;
    this.updateEditorLockStatus();
  }

  handleTypingLockStatus(status) {
    this.state.typingLockStatus = status;
    this.updateEditorLockStatus();
  }

  handleKicked(room, movedTo) {
    if (movedTo) {
      this.showNotification(`You were moved from ${room} to ${movedTo} room`, 'warning');
      this.addRoomActivity(`Moved to ${movedTo} room`, 'warning');
      this.state.currentRoom = movedTo;
    } else {
      this.showNotification(`You have been removed from room: ${room}`, 'error');
      this.addRoomActivity(`Removed from ${room}`, 'error');
    }
  }

  handleMuted(room, muted) {
    this.showNotification(
      muted ? `You were muted in ${room}` : `You were unmuted in ${room}`,
      muted ? 'error' : 'success'
    );

    if (this.elements.editor) {
      this.elements.editor.disabled = muted;
      this.elements.editor.placeholder = muted
        ? 'You are muted by admin. You cannot type.'
        : this.elements.editor.placeholder;
    }
  }

  handleTypingIndicator(user) {
    if (user === 'You' || !this.elements.typingIndicator) return;

    this.elements.typingIndicator.textContent = `${user} is typing...`;

    clearTimeout(this.timers.typingIndicator);
    this.timers.typingIndicator = setTimeout(() => {
      if (this.elements.typingIndicator) {
        this.elements.typingIndicator.textContent = '';
      }
    }, 2000);
  }

  // DOM Event Handlers
  handleEditorInput() {
    if (!this.state.currentRoom || !this.state.isConnected) return;

    if (!this.state.hasTypingLock && !this.state.typingLockStatus.isLocked) {
      this.requestTypingLock();
    }

    if (this.state.hasTypingLock || !this.state.typingLockStatus.isLocked) {
      this.socket.emit('text', { text: this.elements.editor.value, user: 'You' });
      this.socket.emit('typing', 'You');

      if (this.state.hasTypingLock) {
        this.startTypingActivity();
        this.startTypingLockTimer();
      }
    }
  }

  handleEditorFocus() {
    if (this.state.currentRoom && this.state.isConnected &&
      !this.state.hasTypingLock && !this.state.typingLockStatus.isLocked) {
      this.requestTypingLock();
    }
  }

  handleEditorBlur() {
    if (this.state.hasTypingLock) {
      setTimeout(() => {
        if (document.activeElement !== this.elements.editor && this.state.hasTypingLock) {
          this.releaseTypingLock();
        }
      }, 2000);
    }
  }

  handleKeyboardShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.joinRoom();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (this.elements.editor) {
        this.elements.editor.focus();
      }
    }
  }
  // Core Methods
  setMode(newMode) {
    this.state.mode = newMode;

    if (newMode === 'join') {
      if (this.elements.tabJoin) this.elements.tabJoin.classList.add('active');
      if (this.elements.tabCreate) this.elements.tabCreate.classList.remove('active');
      if (this.elements.joinBtn) {
        const btnText = this.elements.joinBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Join Room';
      }
    } else {
      if (this.elements.tabCreate) this.elements.tabCreate.classList.add('active');
      if (this.elements.tabJoin) this.elements.tabJoin.classList.remove('active');
      if (this.elements.joinBtn) {
        const btnText = this.elements.joinBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Create Room';
      }
    }

    this.updateDefaultRoom();
    this.fetchRooms();
    this.addRoomActivity(`Switched to ${newMode === 'join' ? 'Join' : 'Create'} Room mode`, 'info');
  }

  updateDefaultRoom() {
    const isLAN = this.elements.connectionType && this.elements.connectionType.value === 'lan';

    if (this.state.mode === 'join' && this.elements.roomInput && !this.elements.roomInput.value) {
      this.elements.roomInput.value = isLAN ? 'lan_world' : 'world';
    }

    if (this.elements.passwordInput) {
      this.elements.passwordInput.value = '';
    }

    if (this.elements.roomInput) {
      this.elements.roomInput.disabled = false;
      this.state.currentRoom = this.elements.roomInput.value;
    }

    if (this.elements.passwordInput) {
      this.elements.passwordInput.disabled = false;
    }
  }

  async joinRoom() {
    console.log('🚀 joinRoom() called');

    if (!this.elements.roomInput) return;

    const roomName = this.elements.roomInput.value.trim();
    const password = (this.elements.passwordInput && this.elements.passwordInput.value) || '';
    const isLAN = this.elements.connectionType && this.elements.connectionType.value === 'lan';

    console.log('Room name:', roomName, 'Password:', password, 'Is LAN:', isLAN, 'Socket connected:', this.socket.connected);

    if (!roomName) {
      this.showNotification('Please enter a room name', 'error');
      this.addRoomActivity('Join failed: No room name provided', 'error');
      return;
    }

    const finalRoom = this.state.mode === 'join'
      ? (roomName || (isLAN ? 'lan_world' : 'world'))
      : roomName || (isLAN ? 'lan_world' : 'world');

    this.state.currentRoom = finalRoom;

    if (roomName) {
      this.savePreference('lastRoom', finalRoom);
    }

    this.addRoomActivity(`Attempting to ${this.state.mode} room: ${finalRoom}`, 'info');
    if (password) {
      this.addRoomActivity('Using password for private room', 'info');
    }

    this.setJoinButtonLoading(true);
    this.updateConnectionStatus('connecting', 'Connecting...');

    this.timers.connectionTimeout = setTimeout(() => {
      if (this.elements.joinBtn && this.elements.joinBtn.disabled) {
        this.showNotification('Connection timeout. Please try again.', 'error');
        this.updateConnectionStatus('error', 'Connection Timeout');
        this.resetJoinButton();
        this.addRoomActivity('Connection timeout', 'error');
      }
    }, 10000);

    this.socket.emit('join', {
      room: finalRoom,
      password,
      private: Boolean(password),
      adminToken: this.state.adminTokens[finalRoom] || null,
    });
  }

  leaveRoom() {
    if (!this.state.currentRoom) return;

    this.addRoomActivity(`Left room: ${this.state.currentRoom}`, 'warning');
    this.socket.emit('leave', { room: this.state.currentRoom });

    // Cleanup video components when leaving room
    // Requirements: 3.5, 6.5
    this.cleanupVideoComponents();

    this.state.currentRoom = '';

    this.showRoomConfig();
    this.hideLeaveRoomButton();
    this.resetJoinButton();
  }

  async setUserName() {
    if (!this.elements.displayNameInput || !this.elements.setNameBtn) return;

    const name = this.elements.displayNameInput.value.trim();
    if (!name) return;

    this.elements.setNameBtn.classList.add('saving');

    this.socket.emit('set-name', { name, room: this.state.currentRoom }, (ok) => {
      if (ok) {
        this.showNotification('Name updated', 'success');
        this.elements.displayNameInput.value = name;
        this.savePreference('displayName', name);
        this.socket.emit('who');
      } else {
        this.showNotification('Failed to update name', 'error');
      }
      this.elements.setNameBtn.classList.remove('saving');
    });
  }

  // Typing Lock Methods
  requestTypingLock() {
    if (!this.state.currentRoom || !this.state.isConnected || this.state.isMuted) return;
    this.socket.emit('request-typing-lock');
  }

  releaseTypingLock() {
    if (!this.state.currentRoom || !this.state.isConnected || !this.state.hasTypingLock) return;

    this.socket.emit('release-typing-lock');
    this.state.hasTypingLock = false;
    this.isCurrentlyTyping = false;
    this.updateEditorLockStatus();

    this.clearTimer('typingLock');
    this.clearTimer('typingActivity');
  }

  updateEditorLockStatus() {
    if (!this.elements.editor || !this.elements.typingLockIndicator) return;

    if (this.state.typingLockStatus.isLocked && !this.state.hasTypingLock) {
      this.elements.editor.disabled = true;
      this.elements.editor.placeholder = `${this.state.typingLockStatus.lockedByUser} is currently typing. Please wait...`;
      this.elements.editor.style.backgroundColor = '#f8f9fa';
      this.elements.editor.style.cursor = 'not-allowed';

      this.elements.typingLockIndicator.textContent = `🔒 ${this.state.typingLockStatus.lockedByUser} is typing`;
      this.elements.typingLockIndicator.style.color = '#ef4444';
      this.elements.typingLockIndicator.style.display = 'block';
    } else if (this.state.hasTypingLock) {
      this.elements.editor.disabled = false;
      this.elements.editor.placeholder = 'Start typing your notes here... All changes are synchronized in real-time with your team members! 🚀';
      this.elements.editor.style.backgroundColor = '#f0f9ff';
      this.elements.editor.style.cursor = '';

      this.elements.typingLockIndicator.textContent = '✅ You are typing';
      this.elements.typingLockIndicator.style.color = '#10b981';
      this.elements.typingLockIndicator.style.display = 'block';
    } else if (!this.state.isMuted) {
      this.elements.editor.disabled = false;
      this.elements.editor.placeholder = 'Start typing your notes here... All changes are synchronized in real-time with your team members! 🚀';
      this.elements.editor.style.backgroundColor = '';
      this.elements.editor.style.cursor = '';

      this.elements.typingLockIndicator.style.display = 'none';
    }
  }

  startTypingLockTimer() {
    this.clearTimer('typingLock');
    this.timers.typingLock = setTimeout(() => {
      this.releaseTypingLock();
    }, 25000);
  }

  startTypingActivity() {
    if (!this.state.hasTypingLock) return;

    this.isCurrentlyTyping = true;
    this.clearTimer('typingActivity');

    this.socket.emit('typing-activity', { isTyping: true });

    this.timers.typingActivity = setTimeout(() => {
      this.stopTypingActivity();
    }, 2000);
  }

  stopTypingActivity() {
    if (!this.state.hasTypingLock || !this.isCurrentlyTyping) return;

    this.isCurrentlyTyping = false;
    this.socket.emit('typing-activity', { isTyping: false });

    setTimeout(() => {
      if (this.state.hasTypingLock && !this.isCurrentlyTyping) {
        this.releaseTypingLock();
      }
    }, 1000);
  }
  // File Upload Methods
  async uploadFile(file) {
    if (!this.state.currentRoom) {
      this.showNotification('Please join a room first', 'error');
      return;
    }

    if (!this.state.isConnected) {
      this.showNotification('Not connected to server', 'error');
      return;
    }

    const originalText = this.elements.dropArea && this.elements.dropArea.querySelector('p') && this.elements.dropArea.querySelector('p').textContent;
    if (this.elements.dropArea && this.elements.dropArea.querySelector('p')) {
      this.elements.dropArea.querySelector('p').textContent = `Uploading ${file.name}...`;
    }
    if (this.elements.dropArea) {
      this.elements.dropArea.classList.add('uploading');
    }

    const formData = new FormData();
    formData.append('room', this.state.currentRoom);
    formData.append('file', file);

    try {
      const response = await fetch(`/upload?room=${encodeURIComponent(this.state.currentRoom)}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        this.socket.emit('file-uploaded', {
          filename: data.filename,
          originalName: data.originalName,
          room: this.state.currentRoom,
        });
        this.showNotification(`File "${data.originalName}" uploaded successfully!`, 'success');
        if (this.elements.fileInput) {
          this.elements.fileInput.value = '';
        }
      } else {
        this.showNotification('Upload failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.showNotification('Upload failed. Please try again.', 'error');
    } finally {
      if (this.elements.dropArea && this.elements.dropArea.querySelector('p') && originalText) {
        this.elements.dropArea.querySelector('p').textContent = originalText;
      }
      if (this.elements.dropArea) {
        this.elements.dropArea.classList.remove('uploading');
      }
    }
  }

  // Room Management Methods
  async fetchRooms() {
    try {
      console.log('🔍 fetchRooms() called');
      this.addRoomActivity('Fetching available rooms...', 'info');

      const response = await fetch('/rooms', { cache: 'no-store' });
      console.log('Rooms response status:', response.status);

      const data = await response.json();
      console.log('Rooms data:', data);

      if (!data || !data.success) {
        console.warn('Rooms fetch failed', data);
        this.addRoomActivity('Failed to fetch rooms', 'error');
        return;
      }

      console.debug('Rooms fetched:', data.rooms);
      this.addRoomActivity(`Found ${data.rooms.length} available rooms`, 'success');
      this.renderRoomList(data.rooms || []);
    } catch (error) {
      this.addRoomActivity('Error fetching rooms: ' + error.message, 'error');
    }
  }

  async checkRoomExistsAndJoin(roomName) {
    try {
      const response = await fetch('/rooms', { cache: 'no-store' });
      const data = await response.json();

      if (data && data.success && data.rooms) {
        const roomExists = data.rooms.some(room => room.name === roomName);

        if (roomExists) {
          if (this.socket.connected) {
            this.joinRoom();
          } else {
            this.socket.once('connect', () => this.joinRoom());
          }
        } else {
          this.addRoomActivity(`Previous room "${roomName}" not found, joining world room`, 'warning');
          if (this.elements.roomInput) {
            this.elements.roomInput.value = 'world';
          }
          this.state.currentRoom = 'world';

          if (this.socket.connected) {
            this.joinRoom();
          } else {
            this.socket.once('connect', () => this.joinRoom());
          }
        }
      } else {
        this.fallbackToWorldRoom();
      }
    } catch (error) {
      this.fallbackToWorldRoom();
    }
  }

  fallbackToWorldRoom() {
    this.addRoomActivity('Could not check room availability, joining world room', 'warning');
    if (this.elements.roomInput) {
      this.elements.roomInput.value = 'world';
    }
    this.state.currentRoom = 'world';

    if (this.socket.connected) {
      this.joinRoom();
    } else {
      this.socket.once('connect', () => this.joinRoom());
    }
  }

  // UI Methods
  updateConnectionStatus(status, message) {
    if (!this.elements.connectionStatus) return;

    const statusIndicator = this.elements.connectionStatus;
    const icon = statusIndicator.querySelector('i');
    const text = statusIndicator.querySelector('span');

    statusIndicator.className = `status-indicator ${status}`;
    if (text) text.textContent = message;

    if (icon) {
      switch (status) {
        case 'connected':
          icon.className = 'fas fa-circle';
          statusIndicator.style.background = '#6f00ff';
          break;
        case 'connecting':
          icon.className = 'fas fa-circle';
          statusIndicator.style.background = '#e9b3fb';
          break;
        case 'error':
          icon.className = 'fas fa-exclamation-circle';
          statusIndicator.style.background = '#ef4444';
          break;
        default:
          icon.className = 'fas fa-circle';
          statusIndicator.style.background = '#9ca3af';
      }
    }

    this.state.isConnected = status === 'connected';
  }

  showNotification(message, type) {
    type = type || 'info';

    try {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;

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

      setTimeout(() => notification.classList.add('show'), 100);

      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }, 5000);
    } catch (error) {
      // Fallback notification
      console.error('Failed to show notification:', error);
      console.log(`Notification: [${type.toUpperCase()}] ${message}`);
    }
  }

  addRoomActivity(message, type) {
    type = type || 'info';
    if (!this.elements.activityContent) return;

    const activityMessage = document.createElement('div');
    activityMessage.className = `activity-message ${type}`;

    const timestamp = new Date().toLocaleTimeString();
    const icon = this.getActivityIcon(type);

    activityMessage.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="${icon}" style="font-size: 0.8rem;"></i>
        <span style="flex: 1;">${message}</span>
        <small style="color: var(--gray-500); font-size: 0.7rem;">${timestamp}</small>
      </div>
    `;

    this.elements.activityContent.appendChild(activityMessage);
    this.elements.activityContent.scrollTop = this.elements.activityContent.scrollHeight;

    const messages = this.elements.activityContent.querySelectorAll('.activity-message');
    if (messages.length > 20) {
      messages[0].remove();
    }
  }

  getActivityIcon(type) {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || 'fas fa-bell';
  }

  clearRoomActivity() {
    if (!this.elements.activityContent) return;

    this.elements.activityContent.innerHTML =
      '<div class="activity-message">Welcome to the room! Activity updates will appear here...</div>';
  }

  hideRoomConfig() {
    if (this.elements.configFormSection) {
      this.elements.configFormSection.style.display = 'none';
    }
    if (this.elements.roomListSection) {
      this.elements.roomListSection.style.display = 'none';
    }
  }

  showRoomConfig() {
    if (this.elements.configFormSection) {
      this.elements.configFormSection.style.display = 'block';
    }
    if (this.elements.roomListSection) {
      this.elements.roomListSection.style.display = 'block';
    }
  }

  showLeaveRoomButton() {
    if (this.elements.currentRoomDisplay) {
      this.elements.currentRoomDisplay.style.display = 'flex';
    }
    if (this.elements.currentRoomName && this.state.currentRoom) {
      this.elements.currentRoomName.textContent = this.state.currentRoom;
    }
  }

  hideLeaveRoomButton() {
    if (this.elements.currentRoomDisplay) {
      this.elements.currentRoomDisplay.style.display = 'none';
    }
  }

  hideLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.classList.add('hidden');
    }
    if (this.elements.mainApp) {
      this.elements.mainApp.style.opacity = '1';
    }
  }

  setJoinButtonLoading(loading) {
    if (!this.elements.joinBtn) return;

    this.elements.joinBtn.disabled = loading;

    if (loading) {
      this.elements.joinBtn.classList.add('loading');
      const btnContent = this.elements.joinBtn.querySelector('.btn-content');
      const btnLoading = this.elements.joinBtn.querySelector('.btn-loading');
      if (btnContent) btnContent.style.opacity = '0';
      if (btnLoading) btnLoading.style.opacity = '1';
    } else {
      this.elements.joinBtn.classList.remove('loading');
      const btnContent = this.elements.joinBtn.querySelector('.btn-content');
      const btnLoading = this.elements.joinBtn.querySelector('.btn-loading');
      if (btnContent) btnContent.style.opacity = '1';
      if (btnLoading) btnLoading.style.opacity = '0';
    }
  }

  resetJoinButton() {
    if (!this.elements.joinBtn) return;

    this.elements.joinBtn.disabled = false;
    this.elements.joinBtn.classList.remove('loading');
    const btnContent = this.elements.joinBtn.querySelector('.btn-content');
    const btnLoading = this.elements.joinBtn.querySelector('.btn-loading');
    const btnText = this.elements.joinBtn.querySelector('.btn-text');
    const btnIcon = this.elements.joinBtn.querySelector('.btn-content i');

    if (btnContent) btnContent.style.opacity = '1';
    if (btnLoading) btnLoading.style.opacity = '0';
    if (btnText) btnText.textContent = 'Join Room';
    if (btnIcon) btnIcon.className = 'fas fa-sign-in-alt';
  }

  toggleDarkMode() {
    const body = document.body;
    const darkModeBtn = this.elements.toggleDarkMode;
    const icon = darkModeBtn && darkModeBtn.querySelector('i');

    body.classList.toggle('dark-mode');

    if (body.classList.contains('dark-mode')) {
      if (icon) icon.className = 'fas fa-sun';
      this.savePreference('darkMode', 'true');
      this.addRoomActivity('Dark mode enabled', 'info');
    } else {
      if (icon) icon.className = 'fas fa-moon';
      this.savePreference('darkMode', 'false');
      this.addRoomActivity('Dark mode disabled', 'info');
    }
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('selectedTheme') || 'purple';
    this.setTheme(savedTheme);
  }

  setTheme(themeName) {
    // Update root data attribute
    document.documentElement.setAttribute('data-theme', themeName);

    // Update active theme option
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      option.classList.remove('active');
      if (option.dataset.theme === themeName) {
        option.classList.add('active');
      }
    });

    // Save preference
    this.savePreference('selectedTheme', themeName);
    this.addRoomActivity(`Theme changed to ${themeName}`, 'info');

    console.log(`🎨 Theme changed to: ${themeName}`);
  }

  toggleThemeSelector() {
    if (this.elements.themeSelectorPanel) {
      this.elements.themeSelectorPanel.classList.toggle('open');

      if (this.elements.toggleThemeSelector) {
        this.elements.toggleThemeSelector.classList.toggle('active');
      }
    }
  }

  closeThemeSelector() {
    if (this.elements.themeSelectorPanel) {
      this.elements.themeSelectorPanel.classList.remove('open');
    }
    if (this.elements.toggleThemeSelector) {
      this.elements.toggleThemeSelector.classList.remove('active');
    }
  }

  togglePanel(panelType) {
    if (panelType === 'share') {
      if (this.elements.uploadForm) {
        this.elements.uploadForm.classList.toggle('hidden');
        const visible = !this.elements.uploadForm.classList.contains('hidden');
        this.setButtonActive(this.elements.toggleShare, visible);
      }

      if (this.elements.downloadsPanel) {
        this.elements.downloadsPanel.classList.add('hidden');
      }
      this.setButtonActive(this.elements.toggleDownloads, false);
    } else if (panelType === 'downloads') {
      if (this.elements.downloadsPanel) {
        this.elements.downloadsPanel.classList.toggle('hidden');
        const visible = !this.elements.downloadsPanel.classList.contains('hidden');
        this.setButtonActive(this.elements.toggleDownloads, visible);
      }

      if (this.elements.uploadForm) {
        this.elements.uploadForm.classList.add('hidden');
      }
      this.setButtonActive(this.elements.toggleShare, false);
    }
  }

  setButtonActive(button, active) {
    if (!button) return;

    if (active) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  }

  updateFileCount() {
    if (!this.elements.fileList || !this.elements.fileCount) return;

    const fileCountNum = this.elements.fileList.children.length;
    this.elements.fileCount.textContent = `${fileCountNum} file${fileCountNum !== 1 ? 's' : ''}`;
  }

  updateUserCount(count) {
    if (this.elements.userCount) {
      this.elements.userCount.textContent = count;
      this.elements.userCount.style.animation = 'pulse 0.5s ease';
    }

    // Update footer stats
    this.updateFooterStats(count);
  }

  updateFooterStats(userCount) {
    // Update online users count
    if (this.elements.onlineUsers) {
      this.elements.onlineUsers.textContent = userCount || 0;
    }

    // Update active rooms count (simplified - just show 1 if in a room, 0 if not)
    if (this.elements.activeRooms) {
      this.elements.activeRooms.textContent = this.state.currentRoom ? 1 : 0;
    }
  }

  // Render Methods
  renderRoomList(rooms) {
    if (!this.elements.roomList) return;

    this.elements.roomList.innerHTML = '';

    if (!rooms.length) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <i class="fas fa-door-open"></i>
        <p>No rooms available</p>
        <small>Create a new room to get started</small>
      `;
      this.elements.roomList.appendChild(emptyState);
      return;
    }

    rooms.forEach((room, index) => {
      const roomPill = document.createElement('div');
      roomPill.className = 'room-pill';
      roomPill.style.animationDelay = `${index * 0.1}s`;
      roomPill.style.animation = 'slideInUp 0.3s ease both';

      roomPill.innerHTML = `
        <div class="room-info">
          <i class="fas fa-home"></i>
          <span class="room-name">${room.name}</span>
        </div>
        <div class="room-status">
          <i class="fas ${room.isPrivate ? 'fa-lock' : 'fa-unlock'}"></i>
        </div>
      `;

      roomPill.addEventListener('click', () => this.handleRoomClick(room));
      this.elements.roomList.appendChild(roomPill);
    });
  }

  handleRoomClick(room) {
    if (this.elements.roomInput) {
      this.elements.roomInput.value = room.name;
    }

    if (room.isPrivate && this.elements.passwordInput) {
      this.elements.passwordInput.focus();
    } else {
      this.joinRoom();
    }
  }

  renderFileItem(fileData) {
    const { link, name, filename } = fileData;
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.style.animation = 'slideInUp 0.3s ease';

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

    const deleteBtn = fileItem.querySelector('.delete-file');
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this file?')) return;

      try {
        const url = `/upload?room=${encodeURIComponent(this.state.currentRoom)}&filename=${encodeURIComponent(filename)}`;
        const response = await fetch(url, { method: 'DELETE' });
        const data = await response.json().catch(() => ({ success: false }));

        if (!response.ok || !data.success) {
          throw new Error('Failed');
        }
      } catch {
        this.showNotification('Failed to delete file', 'error');
      }
    });

    return fileItem;
  }
  renderUserList(users) {
    if (!this.elements.userList) return;

    const currentUsers = users || [];
    const currentUserIds = currentUsers.map(u => u.id);
    const previousUserIds = this.previousUserList && this.previousUserList.map(u => u.id) || [];

    currentUsers.forEach(user => {
      if (!previousUserIds.includes(user.id)) {
        this.addRoomActivity(`${user.name} joined the room`, 'success');
      }
    });

    if (this.previousUserList) {
      this.previousUserList.forEach(user => {
        if (!currentUserIds.includes(user.id)) {
          this.addRoomActivity(`${user.name} left the room`, 'warning');
        }
      });
    }

    this.elements.userList.innerHTML = '';

    currentUsers.forEach((user, index) => {
      const userItem = document.createElement('div');
      userItem.className = `user-item ${user.role === 'admin' ? 'admin' : ''} ${user.muted ? 'muted' : ''}`;
      userItem.style.animationDelay = `${index * 0.1}s`;
      userItem.style.animation = 'slideInUp 0.3s ease both';
      userItem.dataset.userId = user.id; // Add data-user-id for video status updates

      const userInfo = document.createElement('div');
      userInfo.className = 'user-info';

      const userName = document.createElement('span');
      userName.className = 'user-name';
      userName.textContent = user.name;

      const userRole = document.createElement('span');
      userRole.className = 'user-role';
      if (user.role === 'admin') {
        userRole.innerHTML = '<i class="fas fa-crown"></i> Admin';
      }

      userInfo.appendChild(userName);
      userInfo.appendChild(userRole);

      // Add video/screen share badges if applicable
      const participant = this.state.videoParticipants.find(p => p.userId === user.id);
      if (participant) {
        if (participant.hasVideo) {
          const videoBadge = document.createElement('span');
          videoBadge.className = 'user-video-badge';
          videoBadge.innerHTML = '<i class="fas fa-video"></i>';
          videoBadge.title = 'Camera on';
          userInfo.appendChild(videoBadge);
        }
        if (participant.hasScreenShare) {
          const screenShareBadge = document.createElement('span');
          screenShareBadge.className = 'user-screen-share-badge';
          screenShareBadge.innerHTML = '<i class="fas fa-desktop"></i>';
          screenShareBadge.title = 'Sharing screen';
          userInfo.appendChild(screenShareBadge);
        }
      }

      userItem.appendChild(userInfo);

      if (this.state.currentUserRole === 'admin' && user.role !== 'admin' && user.id !== this.state.currentUserId) {
        const controls = document.createElement('div');
        controls.className = 'user-controls';

        const muteBtn = document.createElement('button');
        muteBtn.className = 'control-btn';
        muteBtn.innerHTML = `<i class="fas ${user.muted ? 'fa-volume-up' : 'fa-volume-mute'}"></i>`;
        muteBtn.title = user.muted ? 'Unmute' : 'Mute';
        muteBtn.addEventListener('click', () => {
          this.socket.emit('mute-user', { room: this.state.currentRoom, targetId: user.id, muted: !user.muted });
          this.addRoomActivity(`${user.name} ${user.muted ? 'unmuted' : 'muted'}`, 'info');
        });

        // Admin video control button
        // Requirements: 10.1, 10.2
        const participant = this.state.videoParticipants.find(p => p.userId === user.id);
        const hasVideo = participant && participant.hasVideo;
        const videoDisabledByAdmin = participant && participant.videoDisabledByAdmin;

        const videoBtn = document.createElement('button');
        videoBtn.className = 'control-btn video-control-btn';
        videoBtn.dataset.userId = user.id;

        if (videoDisabledByAdmin) {
          videoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
          videoBtn.title = 'Enable camera (currently disabled by admin)';
          videoBtn.classList.add('admin-disabled');
        } else if (hasVideo) {
          videoBtn.innerHTML = '<i class="fas fa-video"></i>';
          videoBtn.title = 'Disable camera';
        } else {
          videoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
          videoBtn.title = 'Camera is off';
          videoBtn.disabled = true;
          videoBtn.style.opacity = '0.5';
        }

        videoBtn.addEventListener('click', () => {
          if (videoDisabledByAdmin) {
            // Re-enable video for user
            this.socket.emit('admin-enable-video', { room: this.state.currentRoom, targetId: user.id }, (success) => {
              if (success) {
                this.addRoomActivity(`${user.name}'s camera enabled by admin`, 'success');
              } else {
                this.showNotification('Failed to enable camera', 'error');
              }
            });
          } else if (hasVideo) {
            // Disable video for user
            if (confirm(`Disable ${user.name}'s camera?`)) {
              this.socket.emit('admin-disable-video', { room: this.state.currentRoom, targetId: user.id }, (success) => {
                if (success) {
                  this.addRoomActivity(`${user.name}'s camera disabled by admin`, 'warning');
                } else {
                  this.showNotification('Failed to disable camera', 'error');
                }
              });
            }
          }
        });

        // Admin screen share control button
        // Requirements: 10.3
        const hasScreenShare = participant && participant.hasScreenShare;

        const screenShareBtn = document.createElement('button');
        screenShareBtn.className = 'control-btn screen-share-control-btn';
        screenShareBtn.dataset.userId = user.id;

        if (hasScreenShare) {
          screenShareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
          screenShareBtn.title = 'Stop screen sharing';
        } else {
          screenShareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
          screenShareBtn.title = 'Not sharing screen';
          screenShareBtn.disabled = true;
          screenShareBtn.style.opacity = '0.5';
        }

        screenShareBtn.addEventListener('click', () => {
          if (hasScreenShare) {
            if (confirm(`Stop ${user.name}'s screen sharing?`)) {
              this.socket.emit('admin-stop-screen-share', { room: this.state.currentRoom, targetId: user.id }, (success) => {
                if (success) {
                  this.addRoomActivity(`${user.name}'s screen sharing stopped by admin`, 'warning');
                } else {
                  this.showNotification('Failed to stop screen sharing', 'error');
                }
              });
            }
          }
        });

        const kickBtn = document.createElement('button');
        kickBtn.className = 'control-btn';
        kickBtn.innerHTML = '<i class="fas fa-user-times"></i>';
        kickBtn.title = 'Remove user';
        kickBtn.addEventListener('click', () => {
          if (confirm('Remove this user from the room?')) {
            this.socket.emit('kick-user', { room: this.state.currentRoom, targetId: user.id });
            this.addRoomActivity(`${user.name} kicked from room`, 'error');
          }
        });

        controls.appendChild(muteBtn);
        controls.appendChild(videoBtn);
        controls.appendChild(screenShareBtn);
        controls.appendChild(kickBtn);
        userItem.appendChild(controls);
      }

      this.elements.userList.appendChild(userItem);
    });

    this.previousUserList = [...currentUsers];
  }

  // Utility Methods
  clearTimer(timerName) {
    if (this.timers[timerName]) {
      clearTimeout(this.timers[timerName]);
      this.timers[timerName] = null;
    }
  }

  clearConnectionTimeout() {
    this.clearTimer('connectionTimeout');
  }

  // Video Integration Methods

  /**
   * Initialize video components when joining a room
   * Requirements: 1.4, 2.5, 3.5
   */
  initializeVideoComponents() {
    try {
      console.log('📹 Initializing video components...');

      // Check if required classes are available
      if (typeof MediaManager === 'undefined') {
        throw new Error('MediaManager class not loaded');
      }
      if (typeof VideoGridLayout === 'undefined') {
        throw new Error('VideoGridLayout class not loaded');
      }
      if (typeof VideoControlsUI === 'undefined') {
        throw new Error('VideoControlsUI class not loaded');
      }
      if (typeof ConnectionQualityMonitor === 'undefined') {
        throw new Error('ConnectionQualityMonitor class not loaded');
      }

      // Create video grid container if it doesn't exist
      if (!this.elements.videoGridContainer) {
        const videoContainer = document.createElement('div');
        videoContainer.id = 'videoGridContainer';
        videoContainer.className = 'video-grid-section';

        // Insert video grid before workspace section
        if (this.elements.workspaceSection) {
          this.elements.workspaceSection.parentNode.insertBefore(
            videoContainer,
            this.elements.workspaceSection
          );
        } else {
          document.querySelector('.app-main').appendChild(videoContainer);
        }

        this.elements.videoGridContainer = videoContainer;
      }

      // Initialize MediaManager
      if (!this.mediaManager) {
        this.mediaManager = new MediaManager(this.socket, this);
        this.mediaManager.loadDevicePreferences();
        console.log('✅ MediaManager initialized');

        // CallModeManager is automatically initialized in MediaManager constructor
        console.log('✅ CallModeManager initialized via MediaManager');
      }

      // Initialize VideoGridLayout
      if (!this.videoGrid) {
        this.videoGrid = new VideoGridLayout(this.elements.videoGridContainer);
        console.log('✅ VideoGridLayout initialized');
      }

      // Initialize VideoControlsUI
      if (!this.videoControls) {
        this.videoControls = new VideoControlsUI(this.mediaManager, document.body);
        this.videoControls.init();

        // Populate devices
        this.videoControls.populateDevices();

        // Listen for layout changes
        document.addEventListener('videoControls:layoutChange', (e) => {
          if (this.videoGrid) {
            this.videoGrid.setLayoutMode(e.detail);
          }
        });

        console.log('✅ VideoControlsUI initialized');
      }

      // Initialize ConnectionQualityMonitor
      // Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
      if (!this.connectionQualityMonitor) {
        this.connectionQualityMonitor = new ConnectionQualityMonitor({
          monitoringInterval: 2000, // Check every 2 seconds
          warningThreshold: 3, // Show warning after 3 consecutive poor readings
          autoQualityReduction: true // Enable automatic quality adjustment
        });

        // Listen for warning events
        this.connectionQualityMonitor.onWarning((event) => {
          if (event.type === 'warning-added') {
            console.log(`⚠️ Connection warning for ${event.userId}: ${event.warningType}`);
            // Optionally show notification for severe issues
            if (event.warningType === 'highPacketLoss') {
              this.showNotification('Poor connection quality detected', 'warning');
            }
          }
        });

        console.log('✅ ConnectionQualityMonitor initialized');
      }

      console.log('✅ Video components initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize video components:', error);
      console.error('Error details:', error.message, error.stack);
      this.showNotification(`Failed to initialize video features: ${error.message}`, 'error');
    }
  }

  /**
   * Cleanup video components when leaving a room
   * Requirements: 3.5, 6.5
   */
  cleanupVideoComponents() {
    try {
      console.log('📹 Cleaning up video components...');

      // Cleanup peer connections
      if (this.mediaManager) {
        this.mediaManager.cleanupPeerConnections();

        // Disable video and screen share if active
        if (this.mediaManager.videoEnabled) {
          this.mediaManager.disableVideo().catch(err => {
            console.warn('Failed to disable video:', err);
          });
        }
        if (this.mediaManager.screenShareEnabled) {
          this.mediaManager.stopScreenShare().catch(err => {
            console.warn('Failed to stop screen share:', err);
          });
        }
      }

      // Clear video grid
      if (this.videoGrid) {
        this.videoGrid.clearAll();
      }

      // Hide video controls
      if (this.videoControls) {
        this.videoControls.hide();
      }

      // Cleanup connection quality monitor
      // Requirements: 12.1
      if (this.connectionQualityMonitor) {
        this.connectionQualityMonitor.destroy();
        this.connectionQualityMonitor = null;
      }

      // Reset video participants
      this.state.videoParticipants = [];

      console.log('✅ Video components cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup video components:', error);
    }
  }

  /**
   * Handle local video enabled (show local preview)
   * Requirements: 1.5
   */
  handleVideoEnabled(stream) {
    try {
      console.log('📹 Handling local video enabled, displaying preview');

      if (!this.videoGrid) {
        console.warn('⚠️ Video grid not initialized');
        return;
      }

      // Get user name from localStorage or use default
      const userName = localStorage.getItem('displayName') || 'You';

      // Add local video feed to grid with proper parameters
      this.videoGrid.addVideoFeed('local', stream, {
        name: `${userName} (You)`,
        isLocal: true
      });

      // Ensure video grid container is visible
      if (this.elements.videoGridContainer) {
        this.elements.videoGridContainer.style.display = 'block';
        console.log('✅ Video grid container made visible');
      }

      console.log('✅ Local video preview displayed');
    } catch (error) {
      console.error('❌ Failed to display local video:', error);
    }
  }

  /**
   * Handle local video disabled (remove local preview)
   * Requirements: 3.3
   */
  handleVideoDisabled() {
    try {
      console.log('📹 Handling local video disabled, removing preview');

      if (!this.videoGrid) {
        console.warn('⚠️ Video grid not initialized');
        return;
      }

      // Remove local video feed from grid
      this.videoGrid.removeVideoFeed('local');

      // Hide video grid container if no more video feeds
      if (this.elements.videoGridContainer && this.videoGrid.videoFeeds.size === 0) {
        this.elements.videoGridContainer.style.display = 'none';
        console.log('✅ Video grid container hidden (no video feeds)');
      }

      console.log('✅ Local video preview removed');
    } catch (error) {
      console.error('❌ Failed to remove local video:', error);
    }
  }

  /**
   * Handle user video enabled event
   * Requirements: 1.4, 2.5
   */
  handleUserVideoEnabled(data) {
    const { userId, name } = data;
    console.log(`📹 User ${name} (${userId}) enabled video`);

    // Don't create peer connection for ourselves
    if (userId === this.socket.id) {
      return;
    }

    // Add to video participants list
    let participant = this.state.videoParticipants.find(p => p.userId === userId);
    if (!participant) {
      this.state.videoParticipants.push({ userId, name, hasVideo: true, hasScreenShare: false });
    } else {
      participant.hasVideo = true;
      // Clear admin-disabled flag when user enables video
      participant.videoDisabledByAdmin = false;
    }

    // Update user list to show camera status
    this.updateUserVideoStatus(userId, true);

    // Add to activity feed
    this.addRoomActivity(`${name} turned on camera`, 'info');

    // Update video participant count
    this.updateVideoParticipantCount();

    // Update admin controls if user list is visible
    this.updateAdminVideoControls(userId);

    // Create or recreate peer connection for this user
    // IMPORTANT: We should receive their video even if we don't have video enabled
    // Use socket ID comparison to determine who initiates (prevents both sides from initiating)
    if (this.mediaManager && this.mediaManager.isInCall()) {
      // Check if peer connection already exists
      const existingPeer = this.mediaManager.peers.get(userId);

      if (existingPeer) {
        // Peer connection exists, but the remote user just enabled video
        // We need to wait for their offer with the video track
        console.log(`🔗 Peer connection already exists for ${name} (${userId}), waiting for renegotiation`);
      } else {
        // No peer connection exists, create one
        // The user with the higher socket ID initiates
        const shouldInitiate = this.socket.id > userId;
        console.log(`🔗 Creating peer connection for ${name} (${userId}), shouldInitiate: ${shouldInitiate}`);
        this.mediaManager.createPeerConnection(userId, shouldInitiate);
      }
    } else {
      console.log(`ℹ️ Ignoring video enabled from ${name} because we are not in voice channel`);
    }
  }

  /**
   * Handle user video disabled event
   * Requirements: 3.5, 10.4
   */
  handleUserVideoDisabled(data) {
    const { userId, name, byAdmin } = data;
    console.log(`📹 User ${name} (${userId}) disabled video${byAdmin ? ' by admin' : ''}`);

    // Update video participants list
    const participant = this.state.videoParticipants.find(p => p.userId === userId);
    if (participant) {
      participant.hasVideo = false;
      if (byAdmin) {
        participant.videoDisabledByAdmin = true;
      }
    }

    // Update user list to show camera status
    this.updateUserVideoStatus(userId, false, byAdmin);

    // Remove their video feed from the grid
    if (this.videoGrid) {
      this.videoGrid.removeVideoFeed(userId);
      console.log(`✅ Removed video feed for ${name} (${userId})`);

      // Hide video grid if no feeds remain (only local preview)
      if (this.videoGrid.videoFeeds.size === 0 ||
        (this.videoGrid.videoFeeds.size === 1 && this.videoGrid.videoFeeds.has('local'))) {
        if (this.elements.videoGridContainer) {
          this.elements.videoGridContainer.style.display = 'none';
        }
      }
    }

    // Add to activity feed
    if (byAdmin) {
      this.addRoomActivity(`${name}'s camera disabled by admin`, 'warning');
    } else {
      this.addRoomActivity(`${name} turned off camera`, 'info');
    }

    // Update video participant count
    this.updateVideoParticipantCount();

    // Update admin controls if user list is visible
    this.updateAdminVideoControls(userId);
  }

  /**
   * Handle user screen share started event
   * Requirements: 6.5
   */
  handleUserScreenShareStarted(data) {
    const { userId, name } = data;
    console.log(`🖥️ User ${name} (${userId}) started screen sharing`);

    // Update video participants list
    let participant = this.state.videoParticipants.find(p => p.userId === userId);
    if (!participant) {
      participant = { userId, name, hasVideo: false, hasScreenShare: true };
      this.state.videoParticipants.push(participant);
    } else {
      participant.hasScreenShare = true;
    }

    // Update user list to show screen share status
    this.updateUserScreenShareStatus(userId, true);

    // Add to activity feed
    this.addRoomActivity(`${name} started screen sharing`, 'success');

    // Update video participant count
    this.updateVideoParticipantCount();

    // Update admin controls if user list is visible
    this.updateAdminVideoControls(userId);
  }

  /**
   * Handle user screen share stopped event
   * Requirements: 6.5, 10.3
   */
  handleUserScreenShareStopped(data) {
    const { userId, name, byAdmin } = data;
    console.log(`🖥️ User ${name} (${userId}) stopped screen sharing${byAdmin ? ' by admin' : ''}`);

    // Update video participants list
    const participant = this.state.videoParticipants.find(p => p.userId === userId);
    if (participant) {
      participant.hasScreenShare = false;
    }

    // Remove screen share feed from grid
    if (this.videoGrid) {
      console.log(`🖥️ Removing screen share feed for ${userId}`);
      this.videoGrid.removeVideoFeed(userId + '-screen');
      // Also check if we need to remove the main feed if they've left completely (handled by other events)
    }

    // Update user list to show screen share status
    this.updateUserScreenShareStatus(userId, false);

    // Add to activity feed
    if (byAdmin) {
      this.addRoomActivity(`${name}'s screen sharing stopped by admin`, 'warning');
    } else {
      this.addRoomActivity(`${name} stopped screen sharing`, 'info');
    }

    // Update video participant count
    this.updateVideoParticipantCount();

    // Update admin controls if user list is visible
    this.updateAdminVideoControls(userId);
  }

  /**
   * Handle user audio enabled event
   * Requirements: 2.1, 2.2
   */
  handleUserAudioEnabled(data) {
    const { userId, name } = data;
    console.log(`🎤 User ${name} (${userId}) enabled audio`);

    // Update video participants list
    let participant = this.state.videoParticipants.find(p => p.userId === userId);
    if (!participant) {
      this.state.videoParticipants.push({ userId, name, hasAudio: true, hasVideo: false, hasScreenShare: false, callMode: 'voice' });
    } else {
      participant.hasAudio = true;
    }

    // Update user list to show audio status
    this.updateUserAudioStatus(userId, true);

    // Add to activity feed
    this.addRoomActivity(`${name} joined voice chat`, 'info');
  }

  /**
   * Handle user audio disabled event
   * Requirements: 5.2, 5.3
   */
  handleUserAudioDisabled(data) {
    const { userId, name } = data;
    console.log(`🎤 User ${name} (${userId}) disabled audio`);

    // Update video participants list
    const participant = this.state.videoParticipants.find(p => p.userId === userId);
    if (participant) {
      participant.hasAudio = false;
    }

    // Update user list to show audio status
    this.updateUserAudioStatus(userId, false);

    // Add to activity feed
    this.addRoomActivity(`${name} left voice chat`, 'info');
  }

  /**
   * Handle user voice call started event
   * Requirements: 1.4, 1.5
   */
  handleUserVoiceCallStarted(data) {
    const { userId, name } = data;
    console.log(`📞 User ${name} (${userId}) started voice call`);

    // Don't create peer connection for ourselves
    if (userId === this.socket.id) {
      return;
    }

    // Add to video participants list with voice mode
    let participant = this.state.videoParticipants.find(p => p.userId === userId);
    if (!participant) {
      this.state.videoParticipants.push({
        userId,
        name,
        hasAudio: true,
        hasVideo: false,
        hasScreenShare: false,
        callMode: 'voice'
      });
    } else {
      participant.hasAudio = true;
      participant.callMode = 'voice';
    }

    // Update user list to show call mode
    this.updateUserCallModeStatus(userId, 'voice');

    // Add to activity feed
    this.addRoomActivity(`${name} started voice call`, 'success');

    // Create peer connection for voice-only call ONLY if we are also in the call
    if (this.mediaManager && this.mediaManager.isInCall()) {
      const shouldInitiate = this.socket.id > userId;
      console.log(`🔗 Creating voice peer connection for ${name} (${userId}), shouldInitiate: ${shouldInitiate}`);
      this.mediaManager.createPeerConnection(userId, shouldInitiate);
    } else {
      console.log(`ℹ️ Ignoring voice call from ${name} because we are not in voice channel`);
    }
  }

  /**
   * Handle user call ended event
   * Requirements: 5.4, 5.5
   */
  handleUserCallEnded(data) {
    const { userId, name, previousMode } = data;
    console.log(`📞 User ${name} (${userId}) ended call (was ${previousMode})`);

    // Update video participants list
    const participant = this.state.videoParticipants.find(p => p.userId === userId);
    if (participant) {
      participant.hasAudio = false;
      participant.hasVideo = false;
      participant.callMode = 'none';
    }

    // Update user list to show call mode
    this.updateUserCallModeStatus(userId, 'none');

    // Add to activity feed
    this.addRoomActivity(`${name} ended ${previousMode} call`, 'info');

    // Remove peer connection
    if (this.mediaManager) {
      this.mediaManager.removePeerConnection(userId);
    }
  }

  /**
   * Handle user call mode changed event
   * Requirements: 8.4, 8.5
   */
  handleUserCallModeChanged(data) {
    const { userId, name, mode, previousMode } = data;
    console.log(`📞 User ${name} (${userId}) changed call mode: ${previousMode} -> ${mode}`);

    // Update video participants list
    const participant = this.state.videoParticipants.find(p => p.userId === userId);
    if (participant) {
      participant.callMode = mode;
      participant.hasAudio = mode !== 'none';
      participant.hasVideo = mode === 'video';
    }

    // Update user list to show call mode
    this.updateUserCallModeStatus(userId, mode);

    // Add to activity feed
    let message = '';
    if (mode === 'video' && previousMode === 'voice') {
      message = `${name} upgraded to video call`;
    } else if (mode === 'voice' && previousMode === 'video') {
      message = `${name} switched to voice-only`;
    } else {
      message = `${name} changed call mode to ${mode}`;
    }
    this.addRoomActivity(message, 'info');
  }

  /**
   * Handle media participants update
   * Requirements: 2.5, 3.5
   */
  handleMediaParticipants(data) {
    const { participants } = data;
    console.log('📹 Media participants update:', participants);

    // Update video participants state
    this.state.videoParticipants = participants || [];

    // Update user list with video/screen share status
    participants.forEach(participant => {
      this.updateUserVideoStatus(participant.userId, participant.videoEnabled);
      if (participant.screenShareEnabled) {
        this.updateUserScreenShareStatus(participant.userId, participant.screenShareEnabled);
      }
    });

    // Update video participant count
    this.updateVideoParticipantCount();

    // Initialize peer connections with users who have video enabled, BUT ONLY if we are in the call
    if (this.mediaManager && this.mediaManager.isInCall()) {
      this.mediaManager.initializePeerConnections(participants);
    } else {
      console.log(`ℹ️ Ignoring media participants update because we are not in voice channel`);
    }
  }

  /**
   * Handle WebRTC offer
   * Requirements: 2.1
   */
  handleWebRTCOffer(data) {
    console.log(`📥 [APP] Received webrtc-offer event`);
    console.log(`   Data:`, data);
    console.log(`   From ID: ${data?.fromId}`);
    console.log(`   Offer type: ${data?.offer?.type}`);
    console.log(`   My socket ID: ${this.socket.id}`);
    console.log(`   MediaManager exists: ${!!this.mediaManager}`);

    const { fromId, offer } = data;
    console.log(`📥 Received WebRTC offer from ${fromId}`);

    if (this.mediaManager) {
      if (this.mediaManager.isInCall()) {
        this.mediaManager.handleOffer(fromId, offer);
      } else {
        console.log(`ℹ️ Ignoring WebRTC offer from ${fromId} because we are not in voice channel`);
      }
    } else {
      console.error(`   ❌ MediaManager not initialized!`);
    }
  }

  /**
   * Handle WebRTC answer
   * Requirements: 2.1
   */
  handleWebRTCAnswer(data) {
    const { fromId, answer } = data;
    console.log(`📥 Received WebRTC answer from ${fromId}`);

    if (this.mediaManager) {
      this.mediaManager.handleAnswer(fromId, answer);
    }
  }

  /**
   * Handle WebRTC ICE candidate
   * Requirements: 2.1
   */
  handleWebRTCIceCandidate(data) {
    const { fromId, candidate } = data;
    console.log(`🧊 Received ICE candidate from ${fromId}`);

    if (this.mediaManager) {
      this.mediaManager.handleIceCandidate(fromId, candidate);
    }
  }

  /**
   * Update user list to show camera status
   * Requirements: 2.5, 10.4
   */
  updateUserVideoStatus(userId, hasVideo, disabledByAdmin = false) {
    if (!this.elements.userList) return;

    const userItem = this.elements.userList.querySelector(`[data-user-id="${userId}"]`);
    if (!userItem) return;

    // Remove existing video badge
    const existingBadge = userItem.querySelector('.user-video-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // Add video badge if user has video enabled
    if (hasVideo) {
      const videoBadge = document.createElement('span');
      videoBadge.className = 'user-video-badge';
      videoBadge.innerHTML = '<i class="fas fa-video"></i>';
      videoBadge.title = 'Camera on';

      const userInfo = userItem.querySelector('.user-info');
      if (userInfo) {
        userInfo.appendChild(videoBadge);
      }
    } else if (disabledByAdmin) {
      // Show admin-disabled indicator
      const videoBadge = document.createElement('span');
      videoBadge.className = 'user-video-badge admin-disabled';
      videoBadge.innerHTML = '<i class="fas fa-video-slash"></i>';
      videoBadge.title = 'Camera disabled by admin';

      const userInfo = userItem.querySelector('.user-info');
      if (userInfo) {
        userInfo.appendChild(videoBadge);
      }
    }
  }

  /**
   * Update user list to show screen share status
   * Requirements: 6.5
   */
  updateUserScreenShareStatus(userId, hasScreenShare) {
    if (!this.elements.userList) return;

    const userItem = this.elements.userList.querySelector(`[data-user-id="${userId}"]`);
    if (!userItem) return;

    // Remove existing screen share badge
    const existingBadge = userItem.querySelector('.user-screen-share-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // Add screen share badge if user is sharing screen
    if (hasScreenShare) {
      const screenShareBadge = document.createElement('span');
      screenShareBadge.className = 'user-screen-share-badge';
      screenShareBadge.innerHTML = '<i class="fas fa-desktop"></i>';
      screenShareBadge.title = 'Sharing screen';

      const userInfo = userItem.querySelector('.user-info');
      if (userInfo) {
        userInfo.appendChild(screenShareBadge);
      }
    }
  }

  /**
   * Update user list to show audio status
   * Requirements: 2.1, 2.2
   */
  updateUserAudioStatus(userId, hasAudio) {
    if (!this.elements.userList) return;

    const userItem = this.elements.userList.querySelector(`[data-user-id="${userId}"]`);
    if (!userItem) return;

    // Remove existing audio badge
    const existingBadge = userItem.querySelector('.user-audio-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // Add audio badge if user has audio enabled
    if (hasAudio) {
      const audioBadge = document.createElement('span');
      audioBadge.className = 'user-audio-badge';
      audioBadge.innerHTML = '<i class="fas fa-microphone"></i>';
      audioBadge.title = 'Audio on';

      const userInfo = userItem.querySelector('.user-info');
      if (userInfo) {
        userInfo.appendChild(audioBadge);
      }
    }
  }

  /**
   * Update user list to show call mode status
   * Requirements: 8.5, 9.4, 9.5
   */
  updateUserCallModeStatus(userId, callMode) {
    if (!this.elements.userList) return;

    const userItem = this.elements.userList.querySelector(`[data-user-id="${userId}"]`);
    if (!userItem) return;

    // Remove existing call mode badge
    const existingBadge = userItem.querySelector('.user-call-mode-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // Add call mode badge based on mode
    if (callMode !== 'none') {
      const callModeBadge = document.createElement('span');
      callModeBadge.className = 'user-call-mode-badge';

      if (callMode === 'voice') {
        callModeBadge.innerHTML = '<i class="fas fa-phone"></i>';
        callModeBadge.title = 'Voice call';
        callModeBadge.classList.add('voice-mode');
      } else if (callMode === 'video') {
        callModeBadge.innerHTML = '<i class="fas fa-video"></i>';
        callModeBadge.title = 'Video call';
        callModeBadge.classList.add('video-mode');
      }

      const userInfo = userItem.querySelector('.user-info');
      if (userInfo) {
        userInfo.appendChild(callModeBadge);
      }
    }
  }

  /**
   * Update admin video controls for a specific user
   * Requirements: 10.1, 10.2, 10.3
   */
  updateAdminVideoControls(userId) {
    if (!this.elements.userList || this.state.currentUserRole !== 'admin') return;

    const userItem = this.elements.userList.querySelector(`[data-user-id="${userId}"]`);
    if (!userItem) return;

    const participant = this.state.videoParticipants.find(p => p.userId === userId);
    const hasVideo = participant && participant.hasVideo;
    const videoDisabledByAdmin = participant && participant.videoDisabledByAdmin;
    const hasScreenShare = participant && participant.hasScreenShare;

    // Update video control button
    const videoBtn = userItem.querySelector('.video-control-btn');
    if (videoBtn) {
      if (videoDisabledByAdmin) {
        videoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
        videoBtn.title = 'Enable camera (currently disabled by admin)';
        videoBtn.classList.add('admin-disabled');
        videoBtn.disabled = false;
        videoBtn.style.opacity = '1';
      } else if (hasVideo) {
        videoBtn.innerHTML = '<i class="fas fa-video"></i>';
        videoBtn.title = 'Disable camera';
        videoBtn.classList.remove('admin-disabled');
        videoBtn.disabled = false;
        videoBtn.style.opacity = '1';
      } else {
        videoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
        videoBtn.title = 'Camera is off';
        videoBtn.classList.remove('admin-disabled');
        videoBtn.disabled = true;
        videoBtn.style.opacity = '0.5';
      }
    }

    // Update screen share control button
    const screenShareBtn = userItem.querySelector('.screen-share-control-btn');
    if (screenShareBtn) {
      if (hasScreenShare) {
        screenShareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
        screenShareBtn.title = 'Stop screen sharing';
        screenShareBtn.disabled = false;
        screenShareBtn.style.opacity = '1';
      } else {
        screenShareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
        screenShareBtn.title = 'Not sharing screen';
        screenShareBtn.disabled = true;
        screenShareBtn.style.opacity = '0.5';
      }
    }
  }

  /**
   * Update video participant count display
   * Requirements: 2.5
   */
  updateVideoParticipantCount() {
    const videoCount = this.state.videoParticipants.filter(p => p.hasVideo).length;
    const screenShareCount = this.state.videoParticipants.filter(p => p.hasScreenShare).length;

    console.log(`📹 Video participants: ${videoCount}, Screen sharing: ${screenShareCount}`);

    // Update video grid container title if it exists
    if (this.elements.videoGridContainer) {
      let title = this.elements.videoGridContainer.querySelector('.video-grid-title');
      if (!title && (videoCount > 0 || screenShareCount > 0)) {
        title = document.createElement('div');
        title.className = 'video-grid-title';
        this.elements.videoGridContainer.insertBefore(title, this.elements.videoGridContainer.firstChild);
      }

      if (title) {
        if (videoCount > 0 || screenShareCount > 0) {
          let titleText = '';
          if (videoCount > 0) {
            titleText += `${videoCount} participant${videoCount !== 1 ? 's' : ''} with video`;
          }
          if (screenShareCount > 0) {
            if (titleText) titleText += ', ';
            titleText += `${screenShareCount} sharing screen`;
          }
          title.innerHTML = `<i class="fas fa-video"></i> ${titleText}`;
          title.style.display = 'flex';
        } else {
          title.style.display = 'none';
        }
      }
    }
  }

  /**
   * Handle video disabled by admin event
   * Requirements: 10.4, 10.5
   */
  handleVideoDisabledByAdmin(data) {
    const { room, adminName, timestamp } = data;
    console.log(`🚫 Video disabled by admin ${adminName} in room ${room}`);

    // Show notification to the user
    this.showNotification(`Your camera was disabled by ${adminName}`, 'warning');
    this.addRoomActivity(`Your camera was disabled by ${adminName}`, 'warning');

    // Disable video if currently enabled
    if (this.mediaManager && this.mediaManager.videoEnabled) {
      this.mediaManager.disableVideo().catch(err => {
        console.error('Failed to disable video:', err);
      });
    }

    // Update participant state
    const participant = this.state.videoParticipants.find(p => p.userId === this.state.currentUserId);
    if (participant) {
      participant.videoDisabledByAdmin = true;
      participant.hasVideo = false;
    }

    // Update video controls UI to show disabled state
    if (this.videoControls) {
      this.videoControls.setAdminDisabled(true);
    }
  }

  /**
   * Handle video enabled by admin event
   * Requirements: 10.4, 10.5
   */
  handleVideoEnabledByAdmin(data) {
    const { room, adminName, timestamp } = data;
    console.log(`✅ Video enabled by admin ${adminName} in room ${room}`);

    // Show notification to the user
    this.showNotification(`Your camera was enabled by ${adminName}`, 'success');
    this.addRoomActivity(`Your camera was enabled by ${adminName}`, 'success');

    // Update participant state
    const participant = this.state.videoParticipants.find(p => p.userId === this.state.currentUserId);
    if (participant) {
      participant.videoDisabledByAdmin = false;
    }

    // Update video controls UI to show enabled state
    if (this.videoControls) {
      this.videoControls.setAdminDisabled(false);
    }
  }

  /**
   * Handle screen share stopped by admin event
   * Requirements: 10.3, 10.4, 10.5
   */
  handleScreenShareStoppedByAdmin(data) {
    const { room, adminName, timestamp } = data;
    console.log(`🚫 Screen share stopped by admin ${adminName} in room ${room}`);

    // Show notification to the user
    this.showNotification(`Your screen sharing was stopped by ${adminName}`, 'warning');
    this.addRoomActivity(`Your screen sharing was stopped by ${adminName}`, 'warning');

    // Stop screen share if currently active
    if (this.mediaManager && this.mediaManager.screenShareEnabled) {
      this.mediaManager.stopScreenShare().catch(err => {
        console.error('Failed to stop screen share:', err);
      });
    }
  }

  /**
   * Enable connection quality monitoring for a peer
   * Requirements: 12.1, 12.2, 12.3
   * 
   * @param {string} userId - User ID
   * @param {QualityController} qualityController - Quality controller instance
   */
  enableQualityMonitoring(userId, qualityController) {
    try {
      if (!this.connectionQualityMonitor) {
        console.warn('⚠️ Connection quality monitor not initialized');
        return;
      }

      if (!this.videoGrid) {
        console.warn('⚠️ Video grid not initialized');
        return;
      }

      // Get video feed element
      const videoFeedElement = this.videoGrid.getVideoFeedElement(userId);
      if (!videoFeedElement) {
        console.warn(`⚠️ Video feed element not found for user ${userId}`);
        return;
      }

      // Add peer monitor
      this.connectionQualityMonitor.addPeerMonitor(userId, qualityController, videoFeedElement);

      // Store quality controller in video grid
      this.videoGrid.setQualityController(userId, qualityController);

      console.log(`✅ Quality monitoring enabled for user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to enable quality monitoring for user ${userId}:`, error);
    }
  }

  /**
   * Disable connection quality monitoring for a peer
   * Requirements: 12.1
   * 
   * @param {string} userId - User ID
   */
  disableQualityMonitoring(userId) {
    try {
      if (!this.connectionQualityMonitor) {
        return;
      }

      // Remove peer monitor
      this.connectionQualityMonitor.removePeerMonitor(userId);

      console.log(`✅ Quality monitoring disabled for user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to disable quality monitoring for user ${userId}:`, error);
    }
  }

  /**
   * Show troubleshooting panel for connection issues
   * Requirements: 12.5
   * 
   * @param {string} userId - Optional user ID for peer-specific suggestions
   */
  showConnectionTroubleshooting(userId = null) {
    try {
      if (!this.connectionQualityMonitor) {
        console.warn('⚠️ Connection quality monitor not initialized');
        return;
      }

      this.connectionQualityMonitor.showTroubleshootingPanel(userId);
    } catch (error) {
      console.error('❌ Failed to show troubleshooting panel:', error);
    }
  }

  destroy() {
    Object.keys(this.timers).forEach(timer => this.clearTimer(timer));

    // Cleanup video components
    this.cleanupVideoComponents();

    // Destroy video components
    if (this.videoControls) {
      this.videoControls.destroy();
      this.videoControls = null;
    }

    if (this.videoGrid) {
      this.videoGrid.destroy();
      this.videoGrid = null;
    }

    this.mediaManager = null;

    if (this.socket) {
      this.socket.disconnect();
    }

    console.log('TeamUp app destroyed');
  }
}

// Notification Styles Injection
const notificationStyles = `
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border-radius: var(--radius-2xl);
  padding: var(--space-4) var(--space-6);
  box-shadow: var(--shadow-2xl);
  border: 1px solid var(--gray-200);
  transform: translateX(100%);
  transition: transform var(--transition-all);
  z-index: var(--z-toast);
  max-width: 350px;
  animation: slideInRight 0.3s ease;
}

.notification.show {
  transform: translateX(0);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.notification-icon {
  font-size: var(--text-lg);
}

.notification-message {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--gray-900);
}

.notification.error {
  border-left: 4px solid var(--danger-500);
}

.notification.success {
  border-left: 4px solid var(--secondary-500);
}

.notification.info {
  border-left: 4px solid var(--primary-600);
}

.notification.warning {
  border-left: 4px solid var(--accent-500);
}

.drag-over {
  border-color: var(--primary-600) !important;
  background: rgba(99, 102, 241, 0.1) !important;
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
  border: 2px solid var(--primary-600);
  border-top: 2px solid transparent;
  border-radius: var(--radius-full);
  animation: spin 1s linear infinite;
}

#typingLockIndicator {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-base);
  margin-top: var(--space-1);
  display: inline-block;
  transition: var(--transition-all);
}

#typingLockIndicator[style*="display: block"] {
  animation: fadeIn 0.3s ease;
}

.dark-mode .notification {
  background: var(--dark-surface);
  border-color: var(--dark-border);
}

.dark-mode .notification-message {
  color: var(--dark-text);
}
`;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Content Loaded');

  // Add a small delay to ensure all elements are rendered
  setTimeout(() => {
    try {
      // Inject notification styles
      const styleSheet = document.createElement('style');
      styleSheet.textContent = notificationStyles;
      document.head.appendChild(styleSheet);
      console.log('✅ Notification styles injected');

      // Check if Socket.IO is available
      if (typeof io === 'undefined') {
        throw new Error('Socket.IO is not available. Please check your connection.');
      }

      // Initialize the TeamUp application
      console.log('🚀 Initializing TeamUp application...');
      window.teamUpApp = new TeamUpApp();
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);

      // Show error message on page
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed; top: 50%; left: 50%; 
        transform: translate(-50%, -50%);
        background: #ef4444; color: white; 
        padding: 2rem; border-radius: 1rem; 
        z-index: 9999; text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        font-family: Arial, sans-serif;
      `;
      errorDiv.innerHTML = `
        <h3 style="margin: 0 0 1rem 0;">⚠️ Application Error</h3>
        <p style="margin: 0 0 0.5rem 0;">Failed to initialize TeamUp</p>
        <small style="opacity: 0.8;">${error.message}</small>
        <br><br>
        <button onclick="location.reload()" style="
          background: white; color: #ef4444; 
          border: none; padding: 0.5rem 1rem; 
          border-radius: 0.5rem; cursor: pointer;
          font-weight: bold;
        ">Reload Page</button>
      `;
      document.body.appendChild(errorDiv);

      // Hide loading screen if it exists
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
      }
    }
  }, 100); // 100ms delay
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeamUpApp;
}