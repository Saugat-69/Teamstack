/**
 * ScreenShareManager - Screen sharing management for TeamUp
 * Handles screen capture, sharing, and stream lifecycle
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

// Screen share constraints for optimal 1080p quality
const SCREEN_SHARE_CONSTRAINTS = {
  video: {
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
    cursor: 'always',
    displaySurface: 'monitor'
  },
  audio: true // Enable system audio capture
};

class ScreenShareManager {
  constructor(mediaManager) {
    if (!mediaManager) {
      throw new Error('MediaManager instance is required for ScreenShareManager');
    }
    
    this.mediaManager = mediaManager;
    this.isSharing = false;
    this.screenStream = null;
    this.shareType = null; // 'screen', 'window', 'tab'
    
    console.log('✅ ScreenShareManager initialized');
  }

  /**
   * Start screen sharing
   * Requirements: 4.1, 4.2, 4.3
   * Error Handling Requirements: 4.2 (screen share cancellation), 6.4 (browser compatibility)
   * 
   * @returns {Promise<MediaStream>} The screen share stream
   * @throws {Error} If screen sharing fails or is not supported
   */
  async startSharing() {
    try {
      console.log('🖥️ Starting screen share...');
      
      // Check if already sharing
      if (this.isSharing && this.screenStream) {
        console.log('⚠️ Screen share already active');
        return this.screenStream;
      }
      
      // Check browser support for getDisplayMedia - Requirements: 6.4
      const browserCompatibility = this.checkBrowserCompatibility();
      if (!browserCompatibility.supported) {
        const errorMsg = browserCompatibility.message;
        console.error('❌', errorMsg);
        
        // Show user-friendly notification with browser recommendations
        if (this.mediaManager.app && this.mediaManager.app.showNotification) {
          this.mediaManager.app.showNotification(errorMsg, 'error');
        }
        
        throw new Error(errorMsg);
      }
      
      // Get screen share constraints
      const constraints = this.getShareConstraints();
      
      // Request screen capture - this will show browser's screen selection dialog
      // User can choose: entire screen, specific window, or browser tab
      console.log('📋 Requesting screen capture with constraints:', constraints);
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      // Store stream and update state
      this.screenStream = stream;
      this.isSharing = true;
      
      // Detect share type from stream settings
      this.detectShareType(stream);
      
      // Setup automatic cleanup when stream ends - Requirements: 6.4
      this.setupStreamEndedHandler(stream);
      
      console.log(`✅ Screen share started successfully (type: ${this.shareType})`);
      
      // Notify media manager about screen share
      if (this.mediaManager.app && this.mediaManager.app.handleScreenShareStarted) {
        this.mediaManager.app.handleScreenShareStarted(stream);
      }
      
      // Notify server about screen share state
      if (this.mediaManager.socket) {
        this.mediaManager.socket.emit('start-screen-share', { 
          room: this.mediaManager.app?.state?.currentRoom,
          shareType: this.shareType
        });
      }
      
      return stream;
    } catch (error) {
      console.error('❌ Failed to start screen share:', error);
      
      // Handle specific error cases with detailed user instructions
      let errorMessage = '';
      let shouldNotify = true;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        // User cancelled the screen selection dialog - Requirements: 4.2
        // This is a normal user action, not an error
        console.log('ℹ️ User cancelled screen share selection');
        errorMessage = 'Screen share cancelled';
        shouldNotify = false; // Don't show notification for user cancellation
      } else if (error.name === 'NotSupportedError') {
        // Browser doesn't support screen sharing - Requirements: 6.4
        errorMessage = 'Screen sharing is not supported in this browser. Please use Chrome 72+, Firefox 66+, Edge 79+, or Safari 13+.';
        console.error('🖥️ Screen sharing not supported in browser');
      } else if (error.name === 'NotFoundError' || error.name === 'InvalidStateError') {
        // No screen or window available to share
        errorMessage = 'No screen or window available to share. Please make sure you have at least one window or screen available.';
        console.error('🖥️ No screen/window available');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        // Screen capture hardware error
        errorMessage = 'Unable to capture screen. This may be due to system permissions or hardware issues. Try restarting your browser.';
        console.error('🖥️ Screen capture hardware error');
      } else if (error.name === 'OverconstrainedError') {
        // Screen capture constraints not satisfied
        errorMessage = 'Screen sharing settings are not supported. Try adjusting the quality settings.';
        console.error('🖥️ Screen capture constraints not satisfied');
      } else if (error.name === 'AbortError') {
        // Screen capture aborted
        errorMessage = 'Screen sharing was aborted. Please try again.';
        console.error('🖥️ Screen capture aborted');
      } else if (error.name === 'TypeError') {
        // API not available
        errorMessage = 'Screen sharing is not available in this browser. Please use a modern browser like Chrome, Firefox, Edge, or Safari.';
        console.error('🖥️ getDisplayMedia not available');
      } else if (error.message && error.message.includes('not supported')) {
        // Custom browser support error
        errorMessage = error.message;
        console.error('🖥️ Browser compatibility error');
      } else {
        // Generic error
        errorMessage = `Failed to start screen share: ${error.message || 'Unknown error occurred'}`;
        console.error('🖥️ Unknown screen share error:', error);
      }
      
      // Show user-friendly notification (except for user cancellation)
      if (shouldNotify && this.mediaManager.app && this.mediaManager.app.showNotification) {
        this.mediaManager.app.showNotification(errorMessage, 'error');
      }
      
      // Throw error with message
      const fullError = new Error(errorMessage);
      fullError.originalError = error;
      fullError.userCancelled = !shouldNotify;
      throw fullError;
    }
  }

  /**
   * Check browser compatibility for screen sharing
   * Requirements: 6.4
   * 
   * @returns {Object} Compatibility result with supported flag and message
   */
  checkBrowserCompatibility() {
    // Check if getDisplayMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      const userAgent = navigator.userAgent.toLowerCase();
      let browserName = 'your browser';
      let recommendation = '';
      
      // Detect browser and provide specific recommendations
      if (userAgent.includes('chrome')) {
        browserName = 'Chrome';
        recommendation = 'Please update to Chrome 72 or later.';
      } else if (userAgent.includes('firefox')) {
        browserName = 'Firefox';
        recommendation = 'Please update to Firefox 66 or later.';
      } else if (userAgent.includes('safari')) {
        browserName = 'Safari';
        recommendation = 'Please update to Safari 13 or later. Note: Safari may require additional permissions in System Preferences > Security & Privacy > Screen Recording.';
      } else if (userAgent.includes('edge')) {
        browserName = 'Edge';
        recommendation = 'Please update to Edge 79 or later.';
      } else if (userAgent.includes('opera')) {
        browserName = 'Opera';
        recommendation = 'Please update to Opera 60 or later.';
      } else {
        recommendation = 'Please use a modern browser like Chrome, Firefox, Edge, or Safari.';
      }
      
      return {
        supported: false,
        message: `Screen sharing is not supported in ${browserName}. ${recommendation}`
      };
    }
    
    return {
      supported: true,
      message: 'Screen sharing is supported'
    };
  }

  /**
   * Stop screen sharing
   * Requirements: 4.4, 6.1, 6.2
   * 
   * @returns {boolean} True if stopped successfully
   */
  async stopSharing() {
    try {
      console.log('🖥️ Stopping screen share...');
      
      if (!this.isSharing || !this.screenStream) {
        console.log('⚠️ Screen share not active');
        return true;
      }
      
      // Stop all tracks in the screen stream
      this.screenStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Stopped track: ${track.kind}`);
      });
      
      // Clean up state
      this.screenStream = null;
      this.isSharing = false;
      this.shareType = null;
      
      console.log('✅ Screen share stopped successfully');
      
      // Notify media manager about screen share stop
      if (this.mediaManager.app && this.mediaManager.app.handleScreenShareStopped) {
        this.mediaManager.app.handleScreenShareStopped();
      }
      
      // Notify server about screen share state
      if (this.mediaManager.socket) {
        this.mediaManager.socket.emit('stop-screen-share', { 
          room: this.mediaManager.app?.state?.currentRoom
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to stop screen share:', error);
      throw error;
    }
  }

  /**
   * Handle stream ended event (automatic stop when source closes)
   * Requirements: 4.5, 6.4
   * 
   * @param {MediaStream} stream - The screen share stream
   */
  setupStreamEndedHandler(stream) {
    if (!stream) {
      console.warn('⚠️ No stream provided to setupStreamEndedHandler');
      return;
    }
    
    // Get the video track from the stream
    const videoTrack = stream.getVideoTracks()[0];
    
    if (!videoTrack) {
      console.warn('⚠️ No video track found in screen share stream');
      return;
    }
    
    // Listen for track ended event - Requirements: 6.4
    // This fires when:
    // 1. User clicks "Stop Sharing" in browser UI
    // 2. User closes the shared window/tab
    // 3. User switches to sharing a different source
    videoTrack.onended = () => {
      console.log('🖥️ Screen share track ended (user stopped sharing or closed window)');
      this.handleStreamEnded();
    };
    
    // Also listen for track mute event (some browsers use this)
    videoTrack.onmute = () => {
      console.log('🖥️ Screen share track muted');
    };
    
    // Listen for track unmute event
    videoTrack.onunmute = () => {
      console.log('🖥️ Screen share track unmuted');
    };
    
    console.log('✅ Stream ended handler setup complete');
  }

  /**
   * Handle automatic stream end
   * Requirements: 4.5, 6.4
   * 
   * This is called when the user stops sharing via browser UI or closes the shared window/tab
   * Implements automatic cleanup to ensure proper state management
   */
  handleStreamEnded() {
    console.log('🖥️ Handling automatic screen share end...');
    
    // Check if we're actually sharing (prevent double cleanup)
    if (!this.isSharing) {
      console.log('ℹ️ Screen share already stopped, skipping cleanup');
      return;
    }
    
    // Clean up state
    const wasSharing = this.isSharing;
    this.screenStream = null;
    this.isSharing = false;
    this.shareType = null;
    
    // Notify user that screen sharing stopped automatically
    if (wasSharing && this.mediaManager.app && this.mediaManager.app.showNotification) {
      this.mediaManager.app.showNotification(
        'Screen sharing stopped automatically (window closed or sharing ended)',
        'info'
      );
    }
    
    // Notify media manager about screen share stop
    if (this.mediaManager.app && this.mediaManager.app.handleScreenShareStopped) {
      this.mediaManager.app.handleScreenShareStopped();
    }
    
    // Notify server about screen share state
    if (this.mediaManager.socket) {
      this.mediaManager.socket.emit('stop-screen-share', { 
        room: this.mediaManager.app?.state?.currentRoom
      });
    }
    
    console.log('✅ Automatic screen share end handled');
  }

  /**
   * Get screen share constraints for optimal quality
   * Requirements: 4.3, 5.2
   * 
   * @returns {Object} MediaStream constraints for screen sharing
   */
  getShareConstraints() {
    // Return a copy of the default constraints
    return {
      video: {
        ...SCREEN_SHARE_CONSTRAINTS.video
      },
      audio: SCREEN_SHARE_CONSTRAINTS.audio
    };
  }

  /**
   * Detect the type of screen share from stream settings
   * Requirements: 4.2
   * 
   * @param {MediaStream} stream - The screen share stream
   */
  detectShareType(stream) {
    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        this.shareType = 'unknown';
        return;
      }
      
      // Get track settings to determine share type
      const settings = videoTrack.getSettings();
      
      // displaySurface can be: 'monitor', 'window', 'browser', or 'application'
      if (settings.displaySurface) {
        switch (settings.displaySurface) {
          case 'monitor':
            this.shareType = 'screen';
            break;
          case 'window':
          case 'application':
            this.shareType = 'window';
            break;
          case 'browser':
            this.shareType = 'tab';
            break;
          default:
            this.shareType = settings.displaySurface;
        }
      } else {
        // Fallback if displaySurface is not available
        this.shareType = 'screen';
      }
      
      console.log(`📊 Detected share type: ${this.shareType}`, settings);
    } catch (error) {
      console.warn('⚠️ Failed to detect share type:', error);
      this.shareType = 'unknown';
    }
  }

  /**
   * Get current screen share stream
   * 
   * @returns {MediaStream|null} The current screen share stream or null
   */
  getScreenStream() {
    return this.screenStream;
  }

  /**
   * Check if currently sharing screen
   * 
   * @returns {boolean} True if screen sharing is active
   */
  isSharingScreen() {
    return this.isSharing;
  }

  /**
   * Get the type of screen share
   * 
   * @returns {string|null} The share type ('screen', 'window', 'tab') or null
   */
  getShareType() {
    return this.shareType;
  }

  /**
   * Update screen share quality constraints
   * This can be used to adjust quality based on network conditions
   * 
   * @param {Object} constraints - New video constraints
   */
  async updateShareQuality(constraints) {
    try {
      if (!this.isSharing || !this.screenStream) {
        console.warn('⚠️ Cannot update quality - screen share not active');
        return false;
      }
      
      const videoTrack = this.screenStream.getVideoTracks()[0];
      if (!videoTrack) {
        console.warn('⚠️ No video track found in screen share stream');
        return false;
      }
      
      // Apply new constraints to the track
      await videoTrack.applyConstraints(constraints);
      
      console.log('✅ Screen share quality updated', constraints);
      return true;
    } catch (error) {
      console.error('❌ Failed to update screen share quality:', error);
      throw error;
    }
  }

  /**
   * Get current screen share statistics
   * 
   * @returns {Object} Screen share statistics
   */
  getShareStats() {
    if (!this.isSharing || !this.screenStream) {
      return null;
    }
    
    const videoTrack = this.screenStream.getVideoTracks()[0];
    if (!videoTrack) {
      return null;
    }
    
    const settings = videoTrack.getSettings();
    
    return {
      isSharing: this.isSharing,
      shareType: this.shareType,
      width: settings.width,
      height: settings.height,
      frameRate: settings.frameRate,
      aspectRatio: settings.aspectRatio
    };
  }

  /**
   * Destroy the screen share manager
   */
  destroy() {
    console.log('🗑️ Destroying ScreenShareManager');
    
    // Stop sharing if active
    if (this.isSharing) {
      this.stopSharing();
    }
    
    // Clear references
    this.mediaManager = null;
    this.screenStream = null;
    
    console.log('✅ ScreenShareManager destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenShareManager;
} else if (typeof window !== 'undefined') {
  window.ScreenShareManager = ScreenShareManager;
}
