/**
 * VideoGridLayout Integration Example
 * Shows how to integrate VideoGridLayout with MediaManager
 */

// Example integration in TeamUpApp class
class VideoIntegrationExample {
  constructor() {
    // Initialize video grid
    this.initializeVideoGrid();
    
    // Initialize media manager
    this.initializeMediaManager();
  }
  
  /**
   * Initialize video grid layout
   */
  initializeVideoGrid() {
    // Create or get video container
    const videoContainer = document.getElementById('videoGridContainer') || 
                          this.createVideoContainer();
    
    // Initialize VideoGridLayout
    this.videoGrid = new VideoGridLayout(videoContainer);
    
    console.log('✅ Video grid initialized');
  }
  
  /**
   * Create video container if it doesn't exist
   */
  createVideoContainer() {
    const container = document.createElement('div');
    container.id = 'videoGridContainer';
    container.style.width = '100%';
    container.style.height = '600px';
    
    // Add to workspace section
    const workspace = document.querySelector('.workspace-section');
    if (workspace) {
      workspace.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
    
    return container;
  }
  
  /**
   * Initialize media manager with video grid integration
   */
  initializeMediaManager() {
    // Assuming socket and app are available
    this.mediaManager = new MediaManager(this.socket, this);
    
    // Set up video event handlers
    this.setupVideoEventHandlers();
    
    console.log('✅ Media manager initialized');
  }
  
  /**
   * Setup video event handlers
   */
  setupVideoEventHandlers() {
    // Handle local video enabled
    this.handleVideoEnabled = (stream) => {
      console.log('📹 Local video enabled');
      
      // Add local video feed to grid
      this.videoGrid.addVideoFeed('local', stream, {
        name: 'You',
        isLocal: true
      });
    };
    
    // Handle local video disabled
    this.handleVideoDisabled = () => {
      console.log('📹 Local video disabled');
      
      // Remove local video feed from grid
      this.videoGrid.removeVideoFeed('local');
    };
    
    // Handle camera switched
    this.handleCameraSwitched = (stream) => {
      console.log('📹 Camera switched');
      
      // Update local video feed
      this.videoGrid.updateVideoFeed('local', stream, {
        name: 'You',
        isLocal: true
      });
    };
  }
  
  /**
   * Handle remote peer video track
   */
  handleRemotePeerVideo(userId, track, metadata) {
    console.log(`📹 Remote video track received from ${userId}`);
    
    // Create media stream from track
    const stream = new MediaStream([track]);
    
    // Add to video grid
    this.videoGrid.addVideoFeed(userId, stream, {
      name: metadata.name || userId,
      isLocal: false
    });
  }
  
  /**
   * Handle remote peer video removed
   */
  handleRemotePeerVideoRemoved(userId) {
    console.log(`📹 Remote video removed for ${userId}`);
    
    // Remove from video grid
    this.videoGrid.removeVideoFeed(userId);
  }
  
  /**
   * Enable video with grid integration
   */
  async enableVideo() {
    try {
      await this.mediaManager.enableVideo();
      console.log('✅ Video enabled successfully');
    } catch (error) {
      console.error('❌ Failed to enable video:', error);
      this.showNotification(error.message, 'error');
    }
  }
  
  /**
   * Disable video with grid integration
   */
  async disableVideo() {
    try {
      await this.mediaManager.disableVideo();
      console.log('✅ Video disabled successfully');
    } catch (error) {
      console.error('❌ Failed to disable video:', error);
      this.showNotification(error.message, 'error');
    }
  }
  
  /**
   * Switch camera device
   */
  async switchCamera(deviceId) {
    try {
      await this.mediaManager.switchCamera(deviceId);
      console.log('✅ Camera switched successfully');
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
      this.showNotification(error.message, 'error');
    }
  }
  
  /**
   * Change video layout mode
   */
  changeLayoutMode(mode) {
    this.videoGrid.setLayoutMode(mode);
    console.log(`✅ Layout mode changed to: ${mode}`);
  }
  
  /**
   * Pin a video feed
   */
  pinVideoFeed(userId) {
    this.videoGrid.pinFeed(userId);
    console.log(`✅ Video feed pinned: ${userId}`);
  }
  
  /**
   * Unpin a video feed
   */
  unpinVideoFeed(userId) {
    this.videoGrid.unpinFeed(userId);
    console.log(`✅ Video feed unpinned: ${userId}`);
  }
  
  /**
   * Handle screen share started
   */
  handleScreenShareStarted(userId, stream) {
    console.log(`🖥️ Screen share started by ${userId}`);
    
    // Set screen share in video grid
    this.videoGrid.setScreenShare(userId, stream);
  }
  
  /**
   * Handle screen share stopped
   */
  handleScreenShareStopped(userId) {
    console.log(`🖥️ Screen share stopped by ${userId}`);
    
    // Clear screen share from video grid
    this.videoGrid.clearScreenShare();
  }
  
  /**
   * Clean up on room leave
   */
  cleanupVideo() {
    console.log('🧹 Cleaning up video resources');
    
    // Clear all video feeds
    this.videoGrid.clearAll();
    
    // Disable video
    if (this.mediaManager) {
      this.mediaManager.disableVideo();
    }
  }
}

// Example usage in existing TeamUpApp
/*
class TeamUpApp {
  constructor() {
    // ... existing code ...
    
    // Initialize video integration
    this.videoIntegration = new VideoIntegrationExample();
  }
  
  // Add video control buttons to UI
  setupVideoControls() {
    // Camera toggle button
    const cameraBtn = document.getElementById('toggleCamera');
    cameraBtn.addEventListener('click', () => {
      if (this.videoIntegration.mediaManager.videoEnabled) {
        this.videoIntegration.disableVideo();
      } else {
        this.videoIntegration.enableVideo();
      }
    });
    
    // Layout mode selector
    const layoutSelector = document.getElementById('layoutMode');
    layoutSelector.addEventListener('change', (e) => {
      this.videoIntegration.changeLayoutMode(e.target.value);
    });
  }
  
  // Handle socket events for video
  setupVideoSocketListeners() {
    this.socket.on('user-video-enabled', ({ userId, name }) => {
      console.log(`User ${name} enabled video`);
      // Video track will be received via WebRTC peer connection
    });
    
    this.socket.on('user-video-disabled', ({ userId }) => {
      console.log(`User ${userId} disabled video`);
      this.videoIntegration.handleRemotePeerVideoRemoved(userId);
    });
    
    this.socket.on('user-screen-share-started', ({ userId, name }) => {
      console.log(`User ${name} started screen sharing`);
      // Screen share track will be received via WebRTC peer connection
    });
    
    this.socket.on('user-screen-share-stopped', ({ userId }) => {
      console.log(`User ${userId} stopped screen sharing`);
      this.videoIntegration.handleScreenShareStopped(userId);
    });
  }
}
*/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoIntegrationExample;
}
