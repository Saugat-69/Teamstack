/**
 * MediaManager - Unified Audio and Video Management for TeamUp
 * Extends voice chat functionality with video calling capabilities
 */

// WebRTC Configuration
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

// Media Constraints
const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000
};

// Video Quality Presets
const VIDEO_QUALITY_PRESETS = {
  low: {
    width: { ideal: 320 },
    height: { ideal: 240 },
    frameRate: { ideal: 15, max: 20 }
  },
  medium: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 24, max: 30 }
  },
  high: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  hd: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  }
};

class MediaManager {
  constructor(socket, app) {
    this.socket = socket;
    this.app = app;

    // Media streams
    this.localAudioStream = null;
    this.localVideoStream = null;
    this.screenStream = null;

    // Peer connections
    this.peers = new Map(); // userId -> MediaPeerConnection

    // State management
    this.audioEnabled = false;
    this.videoEnabled = false;
    this.screenShareEnabled = false;
    this.isMuted = false;
    this.isAdminMuted = false;

    // Voice call state management
    this.callMode = 'none'; // 'none', 'voice', 'video'
    this.voiceOnlyEnabled = false;
    this.callModeManager = null;

    // Device management
    this.selectedDevices = {
      camera: null,
      microphone: null,
      speaker: null
    };

    // Settings
    this.volumeSettings = {}; // userId -> volume level
    this.videoQuality = 'medium'; // Default quality preset

    // Audio processing
    this.audioContext = null;
    this.audioProcessor = null;

    // Initialize CallModeManager
    this.callModeManager = new CallModeManager(this);

    // Initialize ScreenShareManager
    if (window.ScreenShareManager) {
      this.screenShareManager = new window.ScreenShareManager(this);
    } else {
      console.warn('⚠️ ScreenShareManager class not found');
    }

    // Load saved preferences and call mode state
    this.loadDevicePreferences();
    this.loadCallModeState();

    console.log('✅ MediaManager initialized');
  }

  /**
   * Start voice-only call
   * Requirements: 1.1, 1.2, 1.3, 8.1, 8.3, 8.5
   */
  async startVoiceCall() {
    try {
      console.log('🎤 Starting voice-only call...');

      if (this.callMode !== 'none') {
        console.log('⚠️ Already in a call');
        return true;
      }

      // Enable audio for voice call
      const audioEnabled = await this.enableAudio();
      if (!audioEnabled) {
        throw new Error('Failed to enable audio for voice call');
      }

      // Set call mode to voice
      this.callMode = 'voice';
      this.voiceOnlyEnabled = true;

      // Save call mode state
      this.saveCallModeState();

      // Notify server about voice call start
      if (this.socket) {
        this.socket.emit('start-voice-call', { room: this.app?.state?.currentRoom });
      }

      console.log('✅ Voice call started successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to start voice call:', error);
      throw error;
    }
  }

  /**
   * Upgrade voice call to video call
   * Requirements: 8.1, 8.3, 8.5
   */
  async upgradeToVideo() {
    try {
      console.log('📹 Upgrading voice call to video...');

      if (this.callMode !== 'voice') {
        throw new Error('Not in voice call mode');
      }

      // Enable video while maintaining audio
      const videoEnabled = await this.enableVideo();
      if (!videoEnabled) {
        throw new Error('Failed to enable video');
      }

      // Update call mode
      this.callMode = 'video';
      this.voiceOnlyEnabled = false;

      // Save call mode state
      this.saveCallModeState();

      // Notify server about mode change
      if (this.socket) {
        this.socket.emit('call-mode-change', {
          room: this.app?.state?.currentRoom,
          mode: 'video'
        });
      }

      console.log('✅ Successfully upgraded to video call');
      return true;
    } catch (error) {
      console.error('❌ Failed to upgrade to video:', error);
      throw error;
    }
  }

  /**
   * Switch from video call to voice-only
   * Requirements: 8.2, 8.3, 8.5
   */
  async switchToVoiceOnly() {
    try {
      console.log('🎤 Switching to voice-only mode...');

      if (this.callMode !== 'video') {
        throw new Error('Not in video call mode');
      }

      // Disable video while maintaining audio
      await this.disableVideo();

      // Update call mode
      this.callMode = 'voice';
      this.voiceOnlyEnabled = true;

      // Save call mode state
      this.saveCallModeState();

      // Notify server about mode change
      if (this.socket) {
        this.socket.emit('call-mode-change', {
          room: this.app?.state?.currentRoom,
          mode: 'voice'
        });
      }

      console.log('✅ Successfully switched to voice-only mode');
      return true;
    } catch (error) {
      console.error('❌ Failed to switch to voice-only:', error);
      throw error;
    }
  }

  /**
   * End voice or video call
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async endCall() {
    try {
      console.log('📞 Ending call...');

      if (this.callMode === 'none') {
        console.log('⚠️ No active call to end');
        return true;
      }

      const previousMode = this.callMode;

      // Disable video if enabled
      if (this.videoEnabled) {
        await this.disableVideo();
      }

      // Disable audio
      if (this.audioEnabled) {
        await this.disableAudio();
      }

      // Reset call state
      this.callMode = 'none';
      this.voiceOnlyEnabled = false;

      // Clear call mode state
      this.clearCallModeState();

      // Cleanup peer connections
      this.cleanupPeerConnections();

      // Notify server about call end
      if (this.socket) {
        this.socket.emit('end-call', {
          room: this.app?.state?.currentRoom,
          previousMode
        });
      }

      console.log('✅ Call ended successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to end call:', error);
      throw error;
    }
  }

  /**
   * Disable audio and cleanup audio stream
   */
  async disableAudio() {
    try {
      console.log('🎤 Disabling audio...');

      if (!this.audioEnabled || !this.localAudioStream) {
        console.log('⚠️ Audio already disabled');
        return true;
      }

      // Stop all audio tracks
      this.localAudioStream.getTracks().forEach(track => {
        track.stop();
      });

      // Remove audio track from all peer connections
      this.peers.forEach((peer) => {
        peer.removeAudioTrack();
      });

      this.localAudioStream = null;
      this.audioEnabled = false;

      console.log('✅ Audio disabled successfully');

      // Notify app about audio state change
      if (this.app && this.app.handleAudioDisabled) {
        this.app.handleAudioDisabled();
      }

      // Notify server about audio state
      if (this.socket) {
        this.socket.emit('disable-audio', { room: this.app?.state?.currentRoom });
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to disable audio:', error);
      throw error;
    }
  }

  /**
   * Set call mode
   * Requirements: 8.4, 8.5
   */
  setCallMode(mode) {
    const validModes = ['none', 'voice', 'video'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid call mode: ${mode}`);
    }

    this.callMode = mode;
    this.voiceOnlyEnabled = mode === 'voice';

    // Save call mode state
    if (mode !== 'none') {
      this.saveCallModeState();
    } else {
      this.clearCallModeState();
    }

    console.log(`📞 Call mode set to: ${mode}`);
  }

  /**
   * Get current call mode
   * Requirements: 8.5, 9.4
   */
  getCallMode() {
    return this.callMode;
  }

  /**
   * Check if currently in any type of call
   * Requirements: 9.1, 9.4
   */
  isInCall() {
    return this.callMode !== 'none';
  }

  /**
   * Enable audio with microphone permission request
   * Enhanced to support voice-only mode
   */
  async enableAudio() {
    try {
      console.log('🎤 Enabling audio...');

      if (this.audioEnabled && this.localAudioStream) {
        console.log('⚠️ Audio already enabled');
        return true;
      }

      // Check permissions API if available
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
          console.log('🎤 Microphone permission status:', permissionStatus.state);

          if (permissionStatus.state === 'denied') {
            const errorMessage = 'Microphone access is blocked';
            const errorDetails = 'You have previously blocked microphone access for this site. You MUST click the lock icon in your address bar and allow microphone access to join the voice chat.';

            if (this.app && this.app.showNotification) {
              this.app.showNotification(errorMessage, 'error');
              // Show a more persistent instruction if possible, or just the toast
              this.app.addRoomActivity('Microphone blocked. Check address bar settings.', 'error');
            }
            throw new Error(`${errorMessage}. ${errorDetails}`);
          }
        }
      } catch (permError) {
        console.warn('⚠️ Permissions API check failed or not supported:', permError);
        // Continue to getUserMedia as fallback
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false
      });

      this.localAudioStream = stream;
      this.audioEnabled = true;

      // Add audio track to existing peer connections
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        console.log(`🎤 Adding audio track to ${this.peers.size} existing peer connection(s)`);
        for (const [userId, peer] of this.peers.entries()) {
          try {
            const senders = peer.pc.getSenders();
            const audioSender = senders.find(s => s.track?.kind === 'audio');

            if (!audioSender) {
              peer.pc.addTrack(audioTrack, stream);
              console.log(`✅ Added audio track to peer ${userId}`);

              // Send renegotiation offer
              const offer = await peer.createOffer();
              console.log(`📤 Sending audio renegotiation offer to ${userId}`);
              this.socket.emit('webrtc-offer', {
                targetId: userId,
                offer: offer,
                room: this.app?.state?.currentRoom
              });
            }
          } catch (error) {
            console.error(`❌ Failed to add audio track to peer ${userId}:`, error);
          }
        }
      }

      // Notify server about audio state
      if (this.socket) {
        this.socket.emit('enable-audio', { room: this.app?.state?.currentRoom });
      }

      console.log('✅ Audio enabled successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to enable audio:', error);

      // Handle specific error cases with detailed user instructions
      let errorMessage = '';
      let errorDetails = '';

      // If we already threw a custom error (e.g. from permissions check), just rethrow it
      if (error.message.includes('Microphone access is blocked')) {
        throw error;
      }

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied';
        errorDetails = this.getMicrophonePermissionInstructions();
        console.error('🎤 Microphone permission denied by user');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone found';
        errorDetails = 'Please connect a microphone device and try again.';
        console.error('🎤 No microphone device found');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Microphone is already in use';
        errorDetails = 'Your microphone is being used by another application used by another application (like Zoom or Skype). Please close it and try again.';
        console.error('🎤 Microphone is in use by another application');
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Microphone settings not supported';
        errorDetails = 'Your microphone does not support the requested quality settings.';
      } else {
        errorMessage = 'Failed to access microphone';
        errorDetails = error.message || 'An unknown error occurred while trying to access your microphone.';
        console.error('🎤 Unknown microphone error:', error);
      }

      // Show user-friendly notification with detailed instructions
      if (this.app && this.app.showNotification) {
        this.app.showNotification(`${errorMessage}. ${errorDetails}`, 'error');
      }

      // Throw error with combined message
      const fullError = new Error(`${errorMessage}. ${errorDetails}`);
      fullError.originalError = error;
      throw fullError;
    }
  }

  /**
   * Get browser-specific microphone permission instructions
   */
  getMicrophonePermissionInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome') && !userAgent.includes('edge')) {
      return 'Click the lock/settings icon in your browser\'s address bar and allow Microphone access.';
    } else if (userAgent.includes('firefox')) {
      return 'Click the microphone icon in your browser\'s address bar and select "Allow".';
    } else if (userAgent.includes('safari')) {
      return 'Go to Safari > Settings > Websites > Microphone and allow access for this website.';
    } else if (userAgent.includes('edge')) {
      return 'Click the lock/settings icon in your browser\'s address bar and allow Microphone access.';
    } else {
      return 'Please allow microphone access in your browser settings. Look for a microphone icon in your address bar.';
    }
  }

  /**
   * Enable video with camera permission request
   * Requirements: 1.1, 1.2, 1.3
   * Error Handling Requirements: 1.2 (camera permissions)
   */
  async enableVideo() {
    try {
      console.log('📹 Enabling video...');

      // Check if already enabled
      if (this.videoEnabled && this.localVideoStream) {
        console.log('⚠️ Video already enabled');
        return true;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = 'Camera access is not supported in this browser. Please use a modern browser like Chrome, Firefox, Edge, or Safari.';
        console.error('❌', errorMsg);

        // Show user-friendly notification
        if (this.app && this.app.showNotification) {
          this.app.showNotification(errorMsg, 'error');
        }

        throw new Error(errorMsg);
      }

      // Get video quality constraints
      const videoConstraints = this.getVideoConstraints();

      // Request camera permission and get video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: this.selectedDevices.camera
          ? { ...videoConstraints, deviceId: { exact: this.selectedDevices.camera } }
          : videoConstraints,
        audio: false
      });

      this.localVideoStream = stream;
      this.videoEnabled = true;

      console.log('✅ Video enabled successfully');

      // Notify app about video state change
      if (this.app && this.app.handleVideoEnabled) {
        this.app.handleVideoEnabled(stream);
      }

      // Add video track to all existing peer connections
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log(`📹 Adding video track to ${this.peers.size} existing peer connection(s)`);
        for (const [userId, peer] of this.peers.entries()) {
          try {
            // Check if peer already has a video sender
            const senders = peer.pc.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');

            if (!videoSender) {
              // Add video track to peer connection
              peer.pc.addTrack(videoTrack, stream);
              console.log(`✅ Added video track to peer ${userId}`);

              // ALWAYS create and send offer when we add a new track
              // This ensures the other side knows we have video now
              console.log(`📤 Creating renegotiation offer for ${userId} (I just enabled video)`);
              const offer = await peer.createOffer();
              this.socket.emit('webrtc-offer', {
                targetId: userId,
                offer: offer,
                room: this.app?.state?.currentRoom
              });
              console.log(`✅ Renegotiation offer sent to ${userId}`);
            }
          } catch (error) {
            console.error(`❌ Failed to add video track to peer ${userId}:`, error);
          }
        }
      }

      // Notify server about video state
      if (this.socket) {
        this.socket.emit('enable-video', { room: this.app?.state?.currentRoom });
      }

      // Request list of users with video enabled to create peer connections
      if (this.socket) {
        this.socket.emit('get-media-participants', { room: this.app?.state?.currentRoom });
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to enable video:', error);

      // Handle specific error cases with detailed user instructions
      let errorMessage = '';
      let errorDetails = '';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        // Camera permission denied - Requirements: 1.2
        errorMessage = 'Camera permission denied';
        errorDetails = this.getCameraPermissionInstructions();

        console.error('📹 Camera permission denied by user');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        // No camera available - Requirements: 1.2
        errorMessage = 'No camera found';
        errorDetails = 'Please connect a camera device and try again. Make sure your camera is properly connected and not disabled in your system settings.';

        console.error('📹 No camera device found');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        // Camera in use by another application - Requirements: 1.2
        errorMessage = 'Camera is already in use';
        errorDetails = 'Your camera is being used by another application. Please close other applications that might be using your camera (like Zoom, Skype, or other video apps) and try again.';

        console.error('📹 Camera is in use by another application');
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        // Camera doesn't support requested constraints
        errorMessage = 'Camera settings not supported';
        errorDetails = 'Your camera does not support the requested video quality settings. Try lowering the video quality in settings.';

        console.error('📹 Camera constraints not satisfied');
      } else if (error.name === 'TypeError') {
        // Browser doesn't support getUserMedia
        errorMessage = 'Camera not supported';
        errorDetails = 'Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, Edge, or Safari.';

        console.error('📹 getUserMedia not supported');
      } else if (error.name === 'AbortError') {
        // Hardware error
        errorMessage = 'Camera hardware error';
        errorDetails = 'There was a problem accessing your camera hardware. Try unplugging and reconnecting your camera, or restart your browser.';

        console.error('📹 Camera hardware error');
      } else {
        // Generic error
        errorMessage = 'Failed to access camera';
        errorDetails = error.message || 'An unknown error occurred while trying to access your camera. Please try again.';

        console.error('📹 Unknown camera error:', error);
      }

      // Show user-friendly notification with detailed instructions
      if (this.app && this.app.showNotification) {
        this.app.showNotification(`${errorMessage}. ${errorDetails}`, 'error');
      }

      // Throw error with combined message
      const fullError = new Error(`${errorMessage}. ${errorDetails}`);
      fullError.originalError = error;
      throw fullError;
    }
  }

  /**
   * Get browser-specific camera permission instructions
   * Requirements: 1.2
   */
  getCameraPermissionInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome') && !userAgent.includes('edge')) {
      return 'Click the camera icon in your browser\'s address bar and select "Allow". You can also go to Settings > Privacy and security > Site Settings > Camera to manage permissions.';
    } else if (userAgent.includes('firefox')) {
      return 'Click the camera icon in your browser\'s address bar and select "Allow". You can also go to Settings > Privacy & Security > Permissions > Camera to manage permissions.';
    } else if (userAgent.includes('safari')) {
      return 'Go to Safari > Settings > Websites > Camera and allow access for this website. You may need to reload the page after changing permissions.';
    } else if (userAgent.includes('edge')) {
      return 'Click the camera icon in your browser\'s address bar and select "Allow". You can also go to Settings > Cookies and site permissions > Camera to manage permissions.';
    } else {
      return 'Please allow camera access in your browser settings. Look for a camera icon in your address bar or check your browser\'s privacy settings.';
    }
  }

  /**
   * Mute/unmute audio
   */
  toggleMute() {
    if (!this.localAudioStream) {
      console.warn('⚠️ No audio stream to mute');
      return false;
    }

    const audioTrack = this.localAudioStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.isMuted = !audioTrack.enabled;

      console.log(`🎤 Audio ${this.isMuted ? 'muted' : 'unmuted'}`);

      // Notify app about mute state change
      if (this.app && this.app.handleAudioMuteToggle) {
        this.app.handleAudioMuteToggle(this.isMuted);
      }

      return this.isMuted;
    }
    return false;
  }

  /**
   * Disable video and cleanup video track
   * Requirements: 3.1, 3.2
   */
  async disableVideo() {
    try {
      console.log('📹 Disabling video...');

      if (!this.videoEnabled || !this.localVideoStream) {
        console.log('⚠️ Video already disabled');
        return true;
      }

      // Stop all video tracks
      this.localVideoStream.getTracks().forEach(track => {
        track.stop();
      });

      // Remove video track from all peer connections
      this.peers.forEach((peer) => {
        peer.removeVideoTrack();
      });

      this.localVideoStream = null;
      this.videoEnabled = false;

      console.log('✅ Video disabled successfully');

      // Notify app about video state change
      if (this.app && this.app.handleVideoDisabled) {
        this.app.handleVideoDisabled();
      }

      // Notify server about video state
      if (this.socket) {
        this.socket.emit('disable-video', { room: this.app?.state?.currentRoom });
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to disable video:', error);
      throw error;
    }
  }

  /**
   * Start screen sharing
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  async startScreenShare() {
    try {
      console.log('🖥️ Starting screen share...');

      if (!this.screenShareManager) {
        throw new Error('ScreenShareManager not initialized');
      }

      const stream = await this.screenShareManager.startSharing();
      this.screenShareEnabled = true;
      this.screenStream = stream;

      // Add tracks to existing peer connections
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      console.log(`🖥️ Adding screen share tracks to ${this.peers.size} peers`);

      const promises = [];
      for (const [userId, peer] of this.peers.entries()) {
        try {
          if (videoTrack) {
            console.log(`   Adding screen video to ${userId}`);
            peer.pc.addTrack(videoTrack, stream);
          }
          if (audioTrack) {
            console.log(`   Adding screen audio to ${userId}`);
            peer.pc.addTrack(audioTrack, stream);
          }

          // Renegotiate
          console.log(`   Renegotiating with ${userId}`);
          promises.push(peer.createOffer().then(offer => {
            this.socket.emit('webrtc-offer', {
              targetId: userId,
              offer: offer,
              room: this.app?.state?.currentRoom
            });
          }));
        } catch (error) {
          console.error(`❌ Failed to add screen tracks for ${userId}:`, error);
        }
      }

      await Promise.all(promises);

      console.log('✅ Screen share started and tracks added');
      return true;
    } catch (error) {
      console.error('❌ Failed to start screen share:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   * Requirements: 4.4
   */
  async stopScreenShare() {
    try {
      console.log('🖥️ Stopping screen share...');

      if (!this.screenShareManager) {
        return true;
      }

      await this.screenShareManager.stopSharing();
      this.screenShareEnabled = false;
      this.screenStream = null;

      // Note: Tracks are automatically stopped by stopSharing()
      // Peer connections will handle 'ended' event on tracks, 
      // or we can explicitly remove them if needed, but renegotiation 
      // usually handles removal if we were to renegotiate. 
      // However, usually we just let the track end.

      // We should tell peers to remove the track if we want to be clean,
      // but 'track.stop()' fires 'ended' on remote side usually.

      return true;
    } catch (error) {
      console.error('❌ Failed to stop screen share:', error);
      throw error;
    }
  }

  /**
   * Switch to a different camera device
   * Requirements: 1.4
   */
  async switchCamera(deviceId) {
    try {
      console.log('📹 Switching camera to:', deviceId);

      if (!this.videoEnabled || !this.localVideoStream) {
        // If video is not enabled, just save the preference
        this.selectedDevices.camera = deviceId;
        this.saveDevicePreferences();
        return true;
      }

      // Get video quality constraints with new device
      const videoConstraints = this.getVideoConstraints();

      // Get new video stream with selected device
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { ...videoConstraints, deviceId: { exact: deviceId } },
        audio: false
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      this.peers.forEach((peer) => {
        peer.replaceVideoTrack(newVideoTrack);
      });

      // Stop old video tracks
      this.localVideoStream.getTracks().forEach(track => {
        track.stop();
      });

      // Update local video stream
      this.localVideoStream = newStream;
      this.selectedDevices.camera = deviceId;
      this.saveDevicePreferences();

      console.log('✅ Camera switched successfully');

      // Notify app about camera change
      if (this.app && this.app.handleCameraSwitched) {
        this.app.handleCameraSwitched(newStream);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
      throw new Error(`Failed to switch camera: ${error.message}`);
    }
  }

  /**
   * Get video constraints based on current quality preset
   * Requirements: 3.1
   */
  getVideoConstraints() {
    const preset = VIDEO_QUALITY_PRESETS[this.videoQuality] || VIDEO_QUALITY_PRESETS.medium;
    return {
      ...preset,
      facingMode: 'user'
    };
  }

  /**
   * Set video quality preset
   * Requirements: 3.1
   */
  async setVideoQuality(quality) {
    try {
      console.log('📹 Setting video quality to:', quality);

      if (!VIDEO_QUALITY_PRESETS[quality]) {
        throw new Error(`Invalid quality preset: ${quality}`);
      }

      this.videoQuality = quality;
      this.saveDevicePreferences();

      // If video is currently enabled, apply new quality settings
      if (this.videoEnabled && this.localVideoStream) {
        const videoTrack = this.localVideoStream.getVideoTracks()[0];
        const constraints = this.getVideoConstraints();

        await videoTrack.applyConstraints(constraints);

        console.log('✅ Video quality updated successfully');
      }

      // Notify server about quality change
      if (this.socket) {
        this.socket.emit('video-quality-change', {
          room: this.app?.state?.currentRoom,
          quality
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to set video quality:', error);
      throw error;
    }
  }

  /**
   * Save device preferences to localStorage
   */
  saveDevicePreferences() {
    try {
      localStorage.setItem('mediaDevicePreferences', JSON.stringify({
        camera: this.selectedDevices.camera,
        microphone: this.selectedDevices.microphone,
        speaker: this.selectedDevices.speaker,
        videoQuality: this.videoQuality
      }));
    } catch (error) {
      console.warn('Failed to save device preferences:', error);
    }
  }

  /**
   * Load device preferences from localStorage
   */
  loadDevicePreferences() {
    try {
      const saved = localStorage.getItem('mediaDevicePreferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        this.selectedDevices.camera = prefs.camera || null;
        this.selectedDevices.microphone = prefs.microphone || null;
        this.selectedDevices.speaker = prefs.speaker || null;
        this.videoQuality = prefs.videoQuality || 'medium';
      }
    } catch (error) {
      console.warn('Failed to load device preferences:', error);
    }
  }

  /**
   * Save call mode state to localStorage
   * Requirements: 8.4, 8.5
   */
  saveCallModeState() {
    try {
      const callModeState = {
        callMode: this.callMode,
        voiceOnlyEnabled: this.voiceOnlyEnabled,
        savedAt: Date.now()
      };
      localStorage.setItem('mediaCallModeState', JSON.stringify(callModeState));
      console.log('📞 Call mode state saved:', callModeState);
    } catch (error) {
      console.warn('Failed to save call mode state:', error);
    }
  }

  /**
   * Load call mode state from localStorage
   * Requirements: 8.4, 8.5
   */
  loadCallModeState() {
    try {
      const saved = localStorage.getItem('mediaCallModeState');
      if (saved) {
        const state = JSON.parse(saved);

        // Only restore state if it's recent (within last hour)
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - state.savedAt < oneHour) {
          this.callMode = state.callMode || 'none';
          this.voiceOnlyEnabled = state.voiceOnlyEnabled || false;

          console.log('📞 Call mode state restored:', state);
        } else {
          console.log('📞 Call mode state expired, using defaults');
          this.clearCallModeState();
        }
      }
    } catch (error) {
      console.warn('Failed to load call mode state:', error);
    }
  }

  /**
   * Clear call mode state from localStorage
   * Requirements: 8.4, 8.5
   */
  clearCallModeState() {
    try {
      localStorage.removeItem('mediaCallModeState');
      console.log('📞 Call mode state cleared');
    } catch (error) {
      console.warn('Failed to clear call mode state:', error);
    }
  }

  /**
   * Create peer connection for a remote user
   * Requirements: 1.4, 1.5, 2.1
   */
  async createPeerConnection(userId, isInitiator = false) {
    try {
      console.log(`🔗 Creating peer connection for user ${userId} (initiator: ${isInitiator})`);
      console.log(`   Local video stream available: ${!!this.localVideoStream}`);
      console.log(`   Local audio stream available: ${!!this.localAudioStream}`);

      // Check if peer connection already exists
      if (this.peers.has(userId)) {
        console.warn(`⚠️ Peer connection for ${userId} already exists`);
        return this.peers.get(userId);
      }

      // Create new peer connection
      const peer = new MediaPeerConnection(
        userId,
        {
          audio: this.localAudioStream,
          video: this.localVideoStream
        },
        isInitiator,
        this.socket
      );

      // Set up event handlers
      peer.onIceCandidate = (candidate) => {
        console.log(`🧊 Sending ICE candidate to ${userId} (my ID: ${this.socket.id})`);
        this.socket.emit('webrtc-ice-candidate', {
          targetId: userId,
          candidate: candidate,
          room: this.app?.state?.currentRoom
        });
      };

      peer.onConnectionStateChange = (state) => {
        console.log(`🔗 Connection state with ${userId}: ${state}`);
        if (state === 'failed') {
          console.log(`🔄 Connection failed with ${userId}, attempting reconnection...`);
          this.handleConnectionFailure(userId);
        } else if (state === 'disconnected' || state === 'closed') {
          this.removePeerConnection(userId);
        }
      };

      peer.onVideoTrack = (track, stream) => {
        console.log(`📹 Received video track from ${userId}`);
        console.log(`   Track kind: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        console.log(`   Stream ID: ${stream?.id}, track count: ${stream?.getTracks().length}`);

        // Display remote video in grid
        if (this.app && this.app.videoGrid) {
          // Get user name from participants list
          const participant = this.app.state.videoParticipants.find(p => p.userId === userId);
          const userName = participant?.name || userId;

          // Determine if this is a screen share stream
          const existingFeed = this.app.videoGrid.getVideoFeedElement(userId);
          let targetId = userId;
          let isScreenShare = false;

          if (existingFeed) {
            // Identify if this is a new stream (likely screen share)
            const feedVideo = existingFeed.querySelector('video');
            if (feedVideo && feedVideo.srcObject && feedVideo.srcObject.id !== stream.id) {
              targetId = userId + '-screen';
              isScreenShare = true;
            }
          }

          // If the participant is marked as sharing screen, and this looks like a second stream, treat as screen.
          if (participant && participant.hasScreenShare && targetId !== userId) {
            isScreenShare = true;
          }

          console.log(`   Adding video feed to grid for ${userName} (ID: ${targetId})`);

          if (isScreenShare && typeof this.app.videoGrid.setScreenShare === 'function') {
            const rawUserId = targetId.replace('-screen', '');
            console.log(`   Calling setScreenShare for ${rawUserId}`);
            this.app.videoGrid.setScreenShare(rawUserId, stream || peer.remoteVideoStream, {
              name: userName,
              isScreenShare: true,
              isLocal: false
            });
          } else {
            this.app.videoGrid.addVideoFeed(targetId, stream || peer.remoteVideoStream, {
              name: userName + (isScreenShare ? ' (Screen)' : ''),
              isLocal: false,
              isScreenShare: isScreenShare
            });
          }

          // Make sure video grid container is visible
          const videoGridContainer = document.getElementById('videoGridContainer');
          if (videoGridContainer) {
            videoGridContainer.style.display = 'block';
          }
        } else {
          console.error(`   ❌ Cannot display video: app.videoGrid not available`);
        }
      };

      peer.onVideoTrackEnded = (userId, track) => {
        console.log(`📹 Video track ended for ${userId}`);
        if (this.app && this.app.videoGrid) {
          // Attempt to find which feed corresponds to this track
          // If we had a mapping of stream ID to feed ID, that would be ideal.
          // For now, we try to be smart.

          const screenFeedId = userId + '-screen';
          // If the screen share feed exists
          if (this.app.videoGrid.getVideoFeedElement(screenFeedId)) {
            // If we can verify this track belongs to screen share (e.g. by checking if main feed is still active/valid)
            // or simply by assuming the track ending implies removal.

            // Ideally we should check if the track belongs to the stream of the feed.
            // But 'track' object passed might be helpful.

            const screenFeed = this.app.videoGrid.getVideoFeedElement(screenFeedId);
            const video = screenFeed.querySelector('video');
            if (video && video.srcObject && video.srcObject.getTracks().some(t => t.id === track.id)) {
              this.app.videoGrid.removeVideoFeed(screenFeedId);
              return;
            }
          }

          // Default to main feed removal if screen feed didn't match
          this.app.videoGrid.removeVideoFeed(userId);
        }
      };

      // Store peer connection
      this.peers.set(userId, peer);

      // If initiator, create and send offer
      if (isInitiator) {
        console.log(`   Creating offer for ${userId}...`);
        const offer = await peer.createOffer();
        console.log(`   ✅ Offer created, type: ${offer.type}`);
        console.log(`📤 Sending offer to ${userId}`);
        console.log(`   My socket ID: ${this.socket.id}`);
        console.log(`   Target socket ID: ${userId}`);
        console.log(`   Room: ${this.app?.state?.currentRoom}`);
        console.log(`   Socket connected: ${this.socket.connected}`);
        console.log(`   Offer SDP length: ${offer.sdp?.length || 0}`);

        this.socket.emit('webrtc-offer', {
          targetId: userId,
          offer: offer,
          room: this.app?.state?.currentRoom
        });

        console.log(`   ✅ Offer emitted to server via socket.emit('webrtc-offer', ...)`);
      } else {
        console.log(`   Not initiator, waiting for offer from ${userId}`);
      }

      console.log(`✅ Peer connection created for ${userId}`);
      return peer;
    } catch (error) {
      console.error(`❌ Failed to create peer connection for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Remove peer connection
   * Requirements: 3.5
   */
  removePeerConnection(userId) {
    try {
      console.log(`🗑️ Removing peer connection for ${userId}`);

      const peer = this.peers.get(userId);
      if (peer) {
        peer.close();
        this.peers.delete(userId);

        // Remove video feed from grid
        if (this.app && this.app.videoGrid) {
          this.app.videoGrid.removeVideoFeed(userId);

          // Also remove screen share feed if it exists
          if (this.app.videoGrid.getVideoFeedElement(userId + '-screen')) {
            this.app.videoGrid.removeVideoFeed(userId + '-screen');

            // If this was the active screen share, clear it
            // VideoGridLayout handles logic inside clearScreenShare but manual remove might bypass it?
            // VideoGridLayout.removeVideoFeed checks simple removal.
            // Ideally we should call clearScreenShare if it matches.

            if (this.app.videoGrid.screenShareFeed === userId) {
              this.app.videoGrid.clearScreenShare();
            }
          }
        }

        console.log(`✅ Peer connection removed for ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to remove peer connection for ${userId}:`, error);
    }
  }

  /**
   * Handle incoming WebRTC offer
   * Requirements: 2.1
   */
  async handleOffer(fromId, offer) {
    try {
      console.log(`📥 Received offer from ${fromId}`);
      console.log(`   Offer type: ${offer.type}, SDP length: ${offer.sdp?.length || 0}`);

      // Create peer connection if it doesn't exist
      let peer = this.peers.get(fromId);
      if (!peer) {
        console.log(`   Creating new peer connection for ${fromId}`);
        peer = await this.createPeerConnection(fromId, false);
      } else {
        console.log(`   Using existing peer connection for ${fromId}`);
      }

      // Set remote description
      console.log(`   Setting remote description...`);
      await peer.setRemoteDescription(offer);
      console.log(`   ✅ Remote description set`);

      // Create and send answer
      console.log(`   Creating answer...`);
      const answer = await peer.createAnswer();
      console.log(`   ✅ Answer created`);
      console.log(`📤 Sending answer to ${fromId}`);
      this.socket.emit('webrtc-answer', {
        targetId: fromId,
        answer: answer,
        room: this.app?.state?.currentRoom
      });

      console.log(`✅ Handled offer from ${fromId}`);
    } catch (error) {
      console.error(`❌ Failed to handle offer from ${fromId}:`, error);
      console.error(`   Error details:`, error.message, error.stack);
    }
  }

  /**
   * Handle incoming WebRTC answer
   * Requirements: 2.1
   */
  async handleAnswer(fromId, answer) {
    try {
      console.log(`📥 Received answer from ${fromId}`);

      const peer = this.peers.get(fromId);
      if (!peer) {
        console.warn(`⚠️ No peer connection found for ${fromId}`);
        return;
      }

      // Set remote description
      await peer.setRemoteDescription(answer);

      console.log(`✅ Handled answer from ${fromId}`);
    } catch (error) {
      console.error(`❌ Failed to handle answer from ${fromId}:`, error);
    }
  }

  /**
   * Handle incoming ICE candidate
   * Requirements: 2.1
   */
  async handleIceCandidate(fromId, candidate) {
    try {
      console.log(`🧊 Received ICE candidate from ${fromId}`);

      const peer = this.peers.get(fromId);
      if (!peer) {
        console.warn(`⚠️ No peer connection found for ${fromId}`);
        return;
      }

      // Add ICE candidate
      await peer.addIceCandidate(candidate);

      console.log(`✅ Added ICE candidate from ${fromId}`);
    } catch (error) {
      console.error(`❌ Failed to handle ICE candidate from ${fromId}:`, error);
    }
  }

  /**
   * Initialize peer connections with existing users
   * Requirements: 1.4, 2.5
   */
  async initializePeerConnections(users) {
    try {
      console.log(`🔗 Initializing peer connections with ${users.length} users`);
      console.log(`My socket ID: ${this.socket.id}`);
      console.log('Users:', users);

      for (const user of users) {
        console.log(`Checking user: ${user.userId}, videoEnabled: ${user.videoEnabled}, isMe: ${user.userId === this.socket.id}`);

        // Don't create peer connection with ourselves
        if (user.userId !== this.socket.id && (user.videoEnabled || user.callMode === 'voice' || user.hasAudio)) {
          // Remove existing peer connection if it exists (to recreate with video)
          if (this.peers.has(user.userId)) {
            console.log(`🔄 Recreating peer connection for ${user.userId}`);
            this.removePeerConnection(user.userId);
          }

          // Use socket ID comparison to determine who initiates (prevents both sides from initiating)
          const shouldInitiate = this.socket.id > user.userId;
          console.log(`Creating peer connection with ${user.userId}, shouldInitiate: ${shouldInitiate}`);

          // Create peer connection with video track included
          await this.createPeerConnection(user.userId, shouldInitiate);
        }
      }

      console.log(`✅ Peer connections initialized`);
    } catch (error) {
      console.error(`❌ Failed to initialize peer connections:`, error);
    }
  }

  /**
   * Handle connection failure and attempt reconnection
   */
  async handleConnectionFailure(userId) {
    try {
      console.log(`🔄 Attempting to reconnect with ${userId}...`);

      // Remove failed connection
      this.removePeerConnection(userId);

      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Recreate connection
      const shouldInitiate = this.socket.id > userId;
      await this.createPeerConnection(userId, shouldInitiate);

      console.log(`✅ Reconnection attempt completed for ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to reconnect with ${userId}:`, error);
    }
  }

  /**
   * Cleanup all peer connections
   * Requirements: 3.5
   */
  cleanupPeerConnections() {
    try {
      console.log(`🗑️ Cleaning up all peer connections`);

      this.peers.forEach((peer, userId) => {
        peer.close();
      });

      this.peers.clear();

      console.log(`✅ All peer connections cleaned up`);
    } catch (error) {
      console.error(`❌ Failed to cleanup peer connections:`, error);
    }
  }
}

/**
 * MediaPeerConnection - Manages WebRTC peer connection with audio and video
 */
class MediaPeerConnection {
  constructor(userId, localStreams, isInitiator, socket) {
    this.userId = userId;
    this.socket = socket;
    this.isInitiator = isInitiator;

    // Create peer connection
    this.pc = new RTCPeerConnection(ICE_CONFIG);

    // Local streams
    this.localAudioStream = localStreams.audio;
    this.localVideoStream = localStreams.video;

    // Remote streams
    this.remoteAudioStream = new MediaStream();
    this.remoteVideoStream = new MediaStream();

    // Video elements
    this.videoElement = null;
    this.screenElement = null;

    // Event handlers (can be set externally)
    this.onIceCandidate = null;
    this.onConnectionStateChange = null;
    this.onVideoTrack = null;
    this.onVideoTrackEnded = null;
    this.onVideoTrackMuted = null;
    this.onNegotiationNeeded = null;

    // Setup peer connection handlers
    this.setupPeerConnection();

    // Add local tracks if available
    if (this.localAudioStream) {
      const audioTracks = this.localAudioStream.getTracks();
      console.log(`   Adding ${audioTracks.length} audio track(s) to peer connection`);
      audioTracks.forEach(track => {
        this.pc.addTrack(track, this.localAudioStream);
      });
    }

    if (this.localVideoStream) {
      const videoTracks = this.localVideoStream.getTracks();
      console.log(`   Adding ${videoTracks.length} video track(s) to peer connection`);
      videoTracks.forEach(track => {
        console.log(`   Video track: ${track.id}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        this.pc.addTrack(track, this.localVideoStream);
      });
    } else {
      console.log(`   ⚠️ No local video stream to add to peer connection`);
    }

    console.log(`✅ MediaPeerConnection created for user ${userId}`);
  }

  setupPeerConnection() {
    // Handle incoming tracks
    this.pc.ontrack = (event) => {
      console.log('📥 Received track:', event.track.kind);
      console.log(`   Track ID: ${event.track.id}, enabled: ${event.track.enabled}, readyState: ${event.track.readyState}`);
      console.log(`   Stream count: ${event.streams.length}`);

      if (event.track.kind === 'audio') {
        this.remoteAudioStream.addTrack(event.track);
      } else if (event.track.kind === 'video') {
        // Use the stream from the event if available, otherwise use our remoteVideoStream
        const stream = event.streams[0] || this.remoteVideoStream;

        // If using event stream, update our reference if it's the primary stream
        if (event.streams[0]) {
          // If we don't have a video stream yet, or if this is the SAME stream, update it.
          // If it's a DIFFERENT stream (e.g. screen share), keep the original remoteVideoStream as is 
          // (assuming it's the camera) and pass this new stream to the onVideoTrack handler.
          if (!this.remoteVideoStream.id || this.remoteVideoStream.id === event.streams[0].id) {
            this.remoteVideoStream = event.streams[0];
            console.log(`   Using stream from event: ${stream.id}`);
          } else {
            console.log(`   Received additional stream (likely screen share): ${event.streams[0].id}`);
            // We don't overwrite remoteVideoStream here, so we preserve the camera feed reference.
          }
        } else {
          this.remoteVideoStream.addTrack(event.track);
          console.log(`   Added track to remoteVideoStream`);
        }

        // Setup video track event handlers
        this.setupVideoTrackHandlers(event.track);

        // Render video element for this peer
        this.renderVideoElement();

        // Notify about new video track with the stream
        if (this.onVideoTrack) {
          console.log(`   Calling onVideoTrack handler`);
          this.onVideoTrack(event.track, stream);
        } else {
          console.warn(`   ⚠️ No onVideoTrack handler set!`);
        }
      }
    };

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate generated');
        if (this.onIceCandidate) {
          this.onIceCandidate(event.candidate);
        }
      }
    };

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state: ${this.pc.connectionState}`);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.pc.connectionState);
      }
    };

    // Handle ICE connection state changes
    this.pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state: ${this.pc.iceConnectionState}`);
    };
  }

  /**
   * Setup video track event handlers
   * Requirements: 2.1, 3.3
   */
  setupVideoTrackHandlers(track) {
    // Handle track ended event
    track.onended = () => {
      console.log(`📹 Video track ended for user ${this.userId}`);

      // Remove video element
      if (this.videoElement) {
        this.videoElement.srcObject = null;
        if (this.videoElement.parentNode) {
          this.videoElement.parentNode.remove();
        }
        this.videoElement = null;
      }

      // Notify about track ended
      if (this.onVideoTrackEnded) {
        this.onVideoTrackEnded(this.userId, track);
      }
    };

    // Handle track muted event
    track.onmute = () => {
      console.log(`📹 Video track muted for user ${this.userId}`);

      // Add visual indicator for muted video
      if (this.videoElement) {
        const container = this.videoElement.parentNode;
        if (container) {
          container.classList.add('video-muted');
        }
      }

      // Notify about track muted
      if (this.onVideoTrackMuted) {
        this.onVideoTrackMuted(this.userId, true);
      }
    };

    // Handle track unmuted event
    track.onunmute = () => {
      console.log(`📹 Video track unmuted for user ${this.userId}`);

      // Remove visual indicator for muted video
      if (this.videoElement) {
        const container = this.videoElement.parentNode;
        if (container) {
          container.classList.remove('video-muted');
        }
      }

      // Notify about track unmuted
      if (this.onVideoTrackMuted) {
        this.onVideoTrackMuted(this.userId, false);
      }
    };
  }

  /**
   * Render video element for this peer
   * Requirements: 1.5, 2.1
   */
  renderVideoElement() {
    try {
      // Don't create duplicate video elements
      if (this.videoElement) {
        console.log('⚠️ Video element already exists, updating stream');
        this.videoElement.srcObject = this.remoteVideoStream;
        return;
      }

      console.log(`📹 Rendering video element for user ${this.userId}`);

      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.playsinline = true;
      this.videoElement.muted = false; // Remote video should not be muted
      this.videoElement.srcObject = this.remoteVideoStream;

      // Create video feed container
      const videoFeed = document.createElement('div');
      videoFeed.className = 'video-feed';
      videoFeed.dataset.userId = this.userId;

      // Create video overlay with user info
      const overlay = document.createElement('div');
      overlay.className = 'video-overlay';

      const userName = document.createElement('span');
      userName.className = 'user-name';
      userName.textContent = this.userId; // Will be updated with actual name

      overlay.appendChild(userName);

      // Assemble video feed
      videoFeed.appendChild(this.videoElement);
      videoFeed.appendChild(overlay);

      // Store reference to container
      this.videoElement.parentContainer = videoFeed;

      console.log('✅ Video element rendered successfully');

      return videoFeed;
    } catch (error) {
      console.error('❌ Failed to render video element:', error);
      throw error;
    }
  }

  /**
   * Get video element container
   * Requirements: 2.1
   */
  getVideoElement() {
    if (this.videoElement && this.videoElement.parentContainer) {
      return this.videoElement.parentContainer;
    }
    return null;
  }

  /**
   * Update video element user name
   * Requirements: 1.5
   */
  updateVideoUserName(name) {
    if (this.videoElement && this.videoElement.parentContainer) {
      const userName = this.videoElement.parentContainer.querySelector('.user-name');
      if (userName) {
        userName.textContent = name;
      }
    }
  }

  /**
   * Add video track to existing connection
   * Requirements: 1.4, 1.5
   */
  addVideoTrack(track) {
    try {
      console.log('📹 Adding video track to peer connection');

      // Check if video track already exists
      const senders = this.pc.getSenders();
      const videoSender = senders.find(sender => sender.track?.kind === 'video');

      if (videoSender) {
        console.log('⚠️ Video track already exists, replacing instead');
        return this.replaceVideoTrack(track);
      }

      // Add new video track
      this.pc.addTrack(track, this.localVideoStream);
      console.log('✅ Video track added successfully');

      return true;
    } catch (error) {
      console.error('❌ Failed to add video track:', error);
      throw error;
    }
  }

  /**
   * Remove video track from connection
   * Requirements: 3.3
   */
  removeVideoTrack() {
    try {
      console.log('📹 Removing video track from peer connection');

      const senders = this.pc.getSenders();
      const videoSender = senders.find(sender => sender.track?.kind === 'video');

      if (videoSender) {
        this.pc.removeTrack(videoSender);
        console.log('✅ Video track removed successfully');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to remove video track:', error);
      throw error;
    }
  }

  /**
   * Remove audio track from connection
   * Requirements: 5.4, 5.5
   */
  removeAudioTrack() {
    try {
      console.log('🎤 Removing audio track from peer connection');

      const senders = this.pc.getSenders();
      const audioSender = senders.find(sender => sender.track?.kind === 'audio');

      if (audioSender) {
        this.pc.removeTrack(audioSender);
        console.log('✅ Audio track removed successfully');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to remove audio track:', error);
      throw error;
    }
  }

  /**
   * Replace video track (for camera switching)
   * Requirements: 1.4
   */
  async replaceVideoTrack(newTrack) {
    try {
      console.log('📹 Replacing video track in peer connection');

      const senders = this.pc.getSenders();
      const videoSender = senders.find(sender => sender.track?.kind === 'video');

      if (videoSender) {
        await videoSender.replaceTrack(newTrack);
        console.log('✅ Video track replaced successfully');
      } else {
        // No existing video track, add new one
        this.pc.addTrack(newTrack, this.localVideoStream);
        console.log('✅ Video track added (no existing track)');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to replace video track:', error);
      throw error;
    }
  }

  /**
   * Create and send offer
   */
  async createOffer() {
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('❌ Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Create and send answer
   */
  async createAnswer() {
    try {
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error('❌ Failed to create answer:', error);
      throw error;
    }
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(description) {
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(description));
    } catch (error) {
      console.error('❌ Failed to set remote description:', error);
      throw error;
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate) {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
      throw error;
    }
  }

  /**
   * Close peer connection
   */
  close() {
    try {
      this.pc.close();
      console.log(`✅ Peer connection closed for user ${this.userId}`);
    } catch (error) {
      console.error('❌ Failed to close peer connection:', error);
    }
  }
}

/**
 * CallModeManager - Manages voice/video mode transitions and participant tracking
 * Requirements: 8.1, 8.2, 8.4, 9.3, 9.5
 */
class CallModeManager {
  constructor(mediaManager) {
    this.mediaManager = mediaManager;
    this.currentMode = 'none';
    this.participants = new Map(); // userId -> { mode: 'voice'|'video', stream: MediaStream }

    console.log('✅ CallModeManager initialized');
  }

  /**
   * Switch call mode
   * Requirements: 8.1, 8.2, 8.4
   */
  async switchMode(newMode) {
    try {
      console.log(`📞 Switching call mode from ${this.currentMode} to ${newMode}`);

      const validModes = ['none', 'voice', 'video'];
      if (!validModes.includes(newMode)) {
        throw new Error(`Invalid call mode: ${newMode}`);
      }

      const previousMode = this.currentMode;

      switch (newMode) {
        case 'voice':
          if (previousMode === 'none') {
            await this.mediaManager.startVoiceCall();
          } else if (previousMode === 'video') {
            await this.mediaManager.switchToVoiceOnly();
          }
          break;

        case 'video':
          if (previousMode === 'none') {
            await this.mediaManager.startVoiceCall();
            await this.mediaManager.upgradeToVideo();
          } else if (previousMode === 'voice') {
            await this.mediaManager.upgradeToVideo();
          }
          break;

        case 'none':
          await this.mediaManager.endCall();
          break;
      }

      this.currentMode = newMode;

      console.log(`✅ Call mode switched to ${newMode}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to switch call mode to ${newMode}:`, error);
      throw error;
    }
  }

  /**
   * Add participant to call mode tracking
   * Requirements: 9.2, 9.5
   */
  addParticipant(userId, mode, stream) {
    try {
      console.log(`👤 Adding participant ${userId} with mode ${mode}`);

      this.participants.set(userId, {
        mode: mode,
        stream: stream,
        addedAt: Date.now()
      });

      console.log(`✅ Participant ${userId} added to call mode tracking`);
    } catch (error) {
      console.error(`❌ Failed to add participant ${userId}:`, error);
    }
  }

  /**
   * Remove participant from call mode tracking
   * Requirements: 9.2
   */
  removeParticipant(userId) {
    try {
      console.log(`👤 Removing participant ${userId} from call mode tracking`);

      const removed = this.participants.delete(userId);

      if (removed) {
        console.log(`✅ Participant ${userId} removed from call mode tracking`);
      } else {
        console.log(`⚠️ Participant ${userId} was not in call mode tracking`);
      }

      return removed;
    } catch (error) {
      console.error(`❌ Failed to remove participant ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get participants by call mode
   * Requirements: 9.3, 9.5
   */
  getParticipantsByMode(mode) {
    try {
      const participants = Array.from(this.participants.entries())
        .filter(([userId, data]) => data.mode === mode)
        .map(([userId, data]) => ({
          userId,
          mode: data.mode,
          stream: data.stream,
          addedAt: data.addedAt
        }));

      console.log(`📊 Found ${participants.length} participants with mode ${mode}`);
      return participants;
    } catch (error) {
      console.error(`❌ Failed to get participants by mode ${mode}:`, error);
      return [];
    }
  }

  /**
   * Check if video upgrade is possible
   * Requirements: 8.1
   */
  canUpgradeToVideo() {
    try {
      // Can upgrade if currently in voice mode and not admin-disabled
      const canUpgrade = this.currentMode === 'voice' &&
        !this.mediaManager.isAdminMuted &&
        this.mediaManager.audioEnabled;

      console.log(`🔍 Can upgrade to video: ${canUpgrade}`);
      return canUpgrade;
    } catch (error) {
      console.error('❌ Failed to check video upgrade capability:', error);
      return false;
    }
  }

  /**
   * Get current call statistics
   * Requirements: 9.4, 9.5
   */
  getCallStats() {
    try {
      const voiceParticipants = this.getParticipantsByMode('voice');
      const videoParticipants = this.getParticipantsByMode('video');

      return {
        currentMode: this.currentMode,
        totalParticipants: this.participants.size,
        voiceParticipants: voiceParticipants.length,
        videoParticipants: videoParticipants.length,
        canUpgradeToVideo: this.canUpgradeToVideo()
      };
    } catch (error) {
      console.error('❌ Failed to get call stats:', error);
      return {
        currentMode: 'none',
        totalParticipants: 0,
        voiceParticipants: 0,
        videoParticipants: 0,
        canUpgradeToVideo: false
      };
    }
  }

  /**
   * Cleanup call mode manager
   */
  destroy() {
    try {
      console.log('🗑️ Cleaning up CallModeManager');

      this.participants.clear();
      this.currentMode = 'none';
      this.mediaManager = null;

      console.log('✅ CallModeManager cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup CallModeManager:', error);
    }
  }
}

// Export classes to global scope
if (typeof window !== 'undefined') {
  window.MediaManager = MediaManager;
  window.MediaPeerConnection = MediaPeerConnection;
  window.CallModeManager = CallModeManager;
}
