# Video Controls Integration Example

## Quick Start Integration

This guide shows how to integrate the VideoControlsUI component into the main TeamUp application.

## Step 1: Include Required Files

Add to `index.html`:

```html
<!-- In <head> section -->
<link rel="stylesheet" href="./css/video-controls.css" />

<!-- Before closing </body> tag -->
<script src="./js/video-controls-ui.js"></script>
```

## Step 2: Initialize in TeamUpApp

Add to `js/app.js` in the `TeamUpApp` class:

```javascript
class TeamUpApp {
  constructor() {
    // ... existing code ...
    
    // Add video controls reference
    this.videoControls = null;
    this.mediaManager = null;
  }

  async init() {
    // ... existing initialization ...
    
    // Initialize media manager (if not already done)
    this.initializeMediaManager();
    
    // Initialize video controls
    this.initializeVideoControls();
  }

  initializeMediaManager() {
    // Create MediaManager instance
    this.mediaManager = new MediaManager(this.socket, this);
    console.log('✅ MediaManager initialized');
  }

  initializeVideoControls() {
    // Create VideoControlsUI instance
    this.videoControls = new VideoControlsUI(this.mediaManager);
    this.videoControls.init();
    
    // Initially hidden until user joins a room
    this.videoControls.hide();
    
    // Listen for layout changes
    document.addEventListener('videoControls:layoutChange', (e) => {
      this.handleLayoutChange(e.detail);
    });
    
    console.log('✅ VideoControlsUI initialized');
  }

  handleLayoutChange(layout) {
    console.log(`Layout changed to: ${layout}`);
    
    // Update video grid layout if it exists
    if (this.videoGrid) {
      this.videoGrid.setLayoutMode(layout);
    }
    
    // Add activity log
    this.addRoomActivity(`Layout changed to ${layout} view`, 'info');
  }
}
```

## Step 3: Show/Hide Controls Based on Room State

Add to room join/leave handlers:

```javascript
class TeamUpApp {
  // ... existing code ...

  handleSuccessfulJoin() {
    // ... existing join code ...
    
    // Show video controls when joining a room
    if (this.videoControls) {
      this.videoControls.show();
      
      // Populate available devices
      this.videoControls.populateDevices();
    }
  }

  leaveRoom() {
    // ... existing leave code ...
    
    // Hide video controls when leaving
    if (this.videoControls) {
      this.videoControls.hide();
    }
    
    // Disable video and screen share
    if (this.mediaManager) {
      if (this.mediaManager.videoEnabled) {
        this.mediaManager.disableVideo();
      }
      if (this.mediaManager.screenShareEnabled) {
        this.mediaManager.stopScreenShare();
      }
    }
  }
}
```

## Step 4: Sync Button States with MediaManager

Add event listeners to sync UI with media state:

```javascript
class TeamUpApp {
  initializeMediaManager() {
    this.mediaManager = new MediaManager(this.socket, this);
    
    // Listen for media state changes
    this.setupMediaEventListeners();
    
    console.log('✅ MediaManager initialized');
  }

  setupMediaEventListeners() {
    // Camera state changes
    this.socket.on('user-video-enabled', (data) => {
      if (data.userId === this.state.currentUserId) {
        this.videoControls?.updateCameraButton(true);
        this.addRoomActivity('Camera enabled', 'success');
      }
    });

    this.socket.on('user-video-disabled', (data) => {
      if (data.userId === this.state.currentUserId) {
        this.videoControls?.updateCameraButton(false);
        this.addRoomActivity('Camera disabled', 'info');
      }
    });

    // Screen share state changes
    this.socket.on('user-screen-share-started', (data) => {
      if (data.userId === this.state.currentUserId) {
        this.videoControls?.updateScreenShareButton(true);
        this.addRoomActivity('Screen sharing started', 'success');
      }
    });

    this.socket.on('user-screen-share-stopped', (data) => {
      if (data.userId === this.state.currentUserId) {
        this.videoControls?.updateScreenShareButton(false);
        this.addRoomActivity('Screen sharing stopped', 'info');
      }
    });
  }
}
```

## Step 5: Handle Errors

Add error handling for media operations:

```javascript
class TeamUpApp {
  initializeVideoControls() {
    this.videoControls = new VideoControlsUI(this.mediaManager);
    this.videoControls.init();
    this.videoControls.hide();
    
    // Override error handler to use app's notification system
    const originalShowError = this.videoControls.showError.bind(this.videoControls);
    this.videoControls.showError = (message) => {
      this.showNotification(message, 'error');
      this.addRoomActivity(message, 'error');
    };
    
    console.log('✅ VideoControlsUI initialized');
  }
}
```

## Complete Integration Example

Here's a complete example showing all the pieces together:

```javascript
// In js/app.js

class TeamUpApp {
  constructor() {
    this.socket = io();
    this.state = {
      currentRoom: '',
      currentUserId: null,
      currentUserRole: null,
      isMuted: false,
      isConnected: false
    };
    
    // Media components
    this.mediaManager = null;
    this.videoControls = null;
    this.videoGrid = null;
    
    this.init();
  }

  async init() {
    try {
      await this.cacheElements();
      this.setupEventListeners();
      this.initializeUI();
      this.loadUserPreferences();
      this.setupSocketListeners();
      
      // Initialize media components
      this.initializeMediaManager();
      this.initializeVideoControls();
      this.initializeVideoGrid();
      
      console.log('✅ TeamUp initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize TeamUp:', error);
      this.showNotification('Initialization failed', 'error');
    }
  }

  initializeMediaManager() {
    this.mediaManager = new MediaManager(this.socket, this);
    this.setupMediaEventListeners();
    console.log('✅ MediaManager initialized');
  }

  initializeVideoControls() {
    this.videoControls = new VideoControlsUI(this.mediaManager);
    this.videoControls.init();
    this.videoControls.hide();
    
    // Listen for layout changes
    document.addEventListener('videoControls:layoutChange', (e) => {
      this.handleLayoutChange(e.detail);
    });
    
    // Override error handler
    this.videoControls.showError = (message) => {
      this.showNotification(message, 'error');
      this.addRoomActivity(message, 'error');
    };
    
    console.log('✅ VideoControlsUI initialized');
  }

  initializeVideoGrid() {
    const container = document.getElementById('videoGridContainer');
    if (container) {
      this.videoGrid = new VideoGridLayout(container);
      console.log('✅ VideoGridLayout initialized');
    }
  }

  setupMediaEventListeners() {
    // Camera events
    this.socket.on('user-video-enabled', (data) => {
      if (data.userId === this.state.currentUserId) {
        this.videoControls?.updateCameraButton(true);
        this.addRoomActivity('Camera enabled', 'success');
      } else {
        this.addRoomActivity(`${data.name} enabled camera`, 'info');
      }
    });

    this.socket.on('user-video-disabled', (data) => {
      if (data.userId === this.state.currentUserId) {
        this.videoControls?.updateCameraButton(false);
        this.addRoomActivity('Camera disabled', 'info');
      } else {
        this.addRoomActivity(`${data.name} disabled camera`, 'info');
      }
    });

    // Screen share events
    this.socket.on('user-screen-share-started', (data) => {
      if (data.userId === this.state.currentUserId) {
        this.videoControls?.updateScreenShareButton(true);
        this.addRoomActivity('Screen sharing started', 'success');
      } else {
        this.addRoomActivity(`${data.name} started screen sharing`, 'info');
      }
    });

    this.socket.on('user-screen-share-stopped', (data) => {
      if (data.userId === this.state.currentUserId) {
        this.videoControls?.updateScreenShareButton(false);
        this.addRoomActivity('Screen sharing stopped', 'info');
      } else {
        this.addRoomActivity(`${data.name} stopped screen sharing`, 'info');
      }
    });
  }

  handleLayoutChange(layout) {
    console.log(`Layout changed to: ${layout}`);
    
    if (this.videoGrid) {
      this.videoGrid.setLayoutMode(layout);
    }
    
    this.addRoomActivity(`Layout changed to ${layout} view`, 'info');
  }

  handleSuccessfulJoin() {
    this.clearConnectionTimeout();
    this.showNotification(`Successfully joined room: ${this.state.currentRoom}`, 'success');
    this.updateConnectionStatus('connected', 'Connected');
    this.resetJoinButton();
    
    this.hideRoomConfig();
    this.showLeaveRoomButton();
    
    // Show video controls
    if (this.videoControls) {
      this.videoControls.show();
      this.videoControls.populateDevices();
    }
    
    this.addRoomActivity(`Successfully joined room: ${this.state.currentRoom}`, 'success');
    
    this.socket.emit('who');
    this.socket.emit('get-typing-lock-status');
  }

  leaveRoom() {
    if (!this.state.currentRoom) return;
    
    this.addRoomActivity(`Left room: ${this.state.currentRoom}`, 'warning');
    this.socket.emit('leave', { room: this.state.currentRoom });
    this.state.currentRoom = '';
    
    // Disable media
    if (this.mediaManager) {
      if (this.mediaManager.videoEnabled) {
        this.mediaManager.disableVideo();
      }
      if (this.mediaManager.screenShareEnabled) {
        this.mediaManager.stopScreenShare();
      }
    }
    
    // Hide video controls
    if (this.videoControls) {
      this.videoControls.hide();
    }
    
    this.showRoomConfig();
    this.hideLeaveRoomButton();
    this.resetJoinButton();
  }

  destroy() {
    // Cleanup
    if (this.videoControls) {
      this.videoControls.destroy();
    }
    if (this.mediaManager) {
      this.mediaManager.cleanup();
    }
    if (this.videoGrid) {
      this.videoGrid.destroy();
    }
    
    Object.keys(this.timers).forEach(timer => this.clearTimer(timer));
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    console.log('TeamUp app destroyed');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Content Loaded');
  
  setTimeout(() => {
    try {
      if (typeof io === 'undefined') {
        throw new Error('Socket.IO is not available');
      }
      
      console.log('🚀 Initializing TeamUp application...');
      window.teamUpApp = new TeamUpApp();
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      // Show error to user
    }
  }, 100);
});
```

## HTML Structure

Add a container for the video grid in `index.html`:

```html
<!-- Add after workspace section -->
<section class="video-section" id="videoSection" style="display: none;">
  <div class="video-container" id="videoGridContainer">
    <!-- Video feeds will be added here dynamically -->
  </div>
</section>
```

## CSS Additions

Add to `styles.css`:

```css
/* Video Section */
.video-section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-3xl);
  padding: var(--space-8);
  margin-bottom: var(--space-8);
  box-shadow: var(--shadow-2xl);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.video-container {
  min-height: 400px;
  position: relative;
}
```

## Testing the Integration

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Open the application**:
   ```
   http://localhost:3000
   ```

3. **Join a room**:
   - Enter a room name
   - Click "Join Room"
   - Video controls should appear at the bottom

4. **Test camera**:
   - Click camera button
   - Grant permissions
   - Button should turn purple
   - Icon should change

5. **Test screen share**:
   - Click screen share button
   - Select screen/window
   - Button should turn green
   - Icon should change to stop

6. **Test layout**:
   - Click layout button
   - Select different layouts
   - Button text should update

7. **Test quality**:
   - Click quality button
   - Select different qualities
   - Indicator should update

8. **Test devices**:
   - Click device button
   - Check device lists
   - Select different devices

9. **Test keyboard shortcuts**:
   - Press `V` to toggle camera
   - Press `S` to toggle screen share
   - Press `L` to cycle layouts

## Troubleshooting

### Controls don't appear
- Check if `videoControls.show()` is called after joining room
- Verify CSS file is loaded
- Check browser console for errors

### Camera/screen share doesn't work
- Check browser permissions
- Verify HTTPS or localhost
- Check MediaManager implementation
- Look for errors in console

### Dropdowns don't open
- Check z-index conflicts
- Verify click event listeners
- Check for JavaScript errors

### Devices don't populate
- Check browser permissions
- Call `populateDevices()` after permissions granted
- Verify MediaDevices API support

### Keyboard shortcuts don't work
- Check if input field is focused
- Verify event listener is attached
- Check for key conflicts

## Advanced Features

### Custom Styling

Override default styles:

```css
/* Custom button colors */
.media-control-btn.btn-camera.active {
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
}

/* Custom dropdown position */
.layout-dropdown {
  bottom: auto;
  top: calc(100% + var(--space-2));
}
```

### Custom Events

Listen for additional events:

```javascript
// Quality change event
document.addEventListener('videoControls:qualityChange', (e) => {
  console.log('Quality changed:', e.detail);
  // Update analytics, etc.
});

// Device change event
document.addEventListener('videoControls:deviceChange', (e) => {
  console.log('Device changed:', e.detail);
  // Update settings, etc.
});
```

### Programmatic Control

Control the UI programmatically:

```javascript
// Show/hide controls
app.videoControls.show();
app.videoControls.hide();

// Update button states
app.videoControls.updateCameraButton(true);
app.videoControls.updateScreenShareButton(false);

// Change layout
app.videoControls.handleLayoutChange('speaker');

// Change quality
app.videoControls.handleQualityChange('hd');

// Populate devices
await app.videoControls.populateDevices();
```

## Best Practices

1. **Initialize after MediaManager**: Always create VideoControlsUI after MediaManager is ready
2. **Show only in rooms**: Hide controls when not in a room
3. **Sync states**: Keep button states in sync with actual media state
4. **Handle errors**: Provide clear error messages to users
5. **Cleanup**: Destroy controls when leaving room or closing app
6. **Permissions**: Request permissions before showing controls
7. **Responsive**: Test on different screen sizes
8. **Accessibility**: Ensure keyboard navigation works
9. **Performance**: Avoid unnecessary re-renders
10. **Persistence**: Save user preferences

## Conclusion

This integration guide provides everything needed to add the video controls UI to the TeamUp application. Follow the steps in order, test thoroughly, and refer to the troubleshooting section if issues arise.
