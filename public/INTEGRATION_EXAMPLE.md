# Screen Share Integration - Code Examples

## Complete Integration Example

This document provides practical code examples for integrating the screen share functionality into the TeamUp application.

## Basic Setup

```javascript
// Initialize VideoGridLayout
const videoGridContainer = document.getElementById('video-grid-container');
const videoGrid = new VideoGridLayout(videoGridContainer);

// Initialize ScreenShareManager
const screenShareManager = new ScreenShareManager(mediaManager);

// Listen for stop screen share events from the UI
videoGridContainer.addEventListener('stop-screen-share', async (event) => {
  const userId = event.detail.userId;
  console.log(`Stop sharing requested for ${userId}`);
  
  // Stop the screen share
  await screenShareManager.stopSharing();
  
  // Notify server
  socket.emit('stop-screen-share', { 
    room: currentRoom,
    userId: userId
  });
});
```

## Starting Screen Share

```javascript
async function startScreenShare() {
  try {
    // Start screen sharing
    const stream = await screenShareManager.startSharing();
    
    // Get current user info
    const currentUser = getCurrentUser();
    
    // Add screen share to video grid
    videoGrid.setScreenShare(currentUser.id, stream, {
      name: currentUser.name,
      isLocal: true
    });
    
    // Update UI
    updateScreenShareButton(true);
    
    // Notify server
    socket.emit('start-screen-share', {
      room: currentRoom,
      userId: currentUser.id,
      userName: currentUser.name
    });
    
    // Show notification
    showNotification('Screen sharing started', 'success');
    
  } catch (error) {
    if (error.message === 'Screen share cancelled') {
      // User cancelled - no error needed
      console.log('User cancelled screen share');
    } else {
      // Show error to user
      showNotification(`Failed to start screen share: ${error.message}`, 'error');
    }
  }
}
```

## Stopping Screen Share

```javascript
async function stopScreenShare() {
  try {
    // Stop screen sharing
    await screenShareManager.stopSharing();
    
    // Clear from video grid
    videoGrid.clearScreenShare();
    
    // Update UI
    updateScreenShareButton(false);
    
    // Notify server
    socket.emit('stop-screen-share', {
      room: currentRoom,
      userId: getCurrentUser().id
    });
    
    // Show notification
    showNotification('Screen sharing stopped', 'info');
    
  } catch (error) {
    showNotification(`Failed to stop screen share: ${error.message}`, 'error');
  }
}
```

## Handling Remote Screen Shares

```javascript
// Listen for remote user starting screen share
socket.on('user-screen-share-started', (data) => {
  const { userId, userName, stream } = data;
  
  console.log(`${userName} started sharing their screen`);
  
  // Add remote screen share to video grid
  videoGrid.setScreenShare(userId, stream, {
    name: userName,
    isLocal: false
  });
  
  // Show notification
  showNotification(`${userName} is sharing their screen`, 'info');
  
  // Update participant list
  updateParticipantScreenShareStatus(userId, true);
});

// Listen for remote user stopping screen share
socket.on('user-screen-share-stopped', (data) => {
  const { userId, userName } = data;
  
  console.log(`${userName} stopped sharing their screen`);
  
  // Clear screen share from video grid
  videoGrid.clearScreenShare();
  
  // Show notification
  showNotification(`${userName} stopped sharing`, 'info');
  
  // Update participant list
  updateParticipantScreenShareStatus(userId, false);
});
```

## UI Button Integration

```javascript
// Screen share button in HTML
<button id="screenShareBtn" class="control-btn" title="Share screen">
  <i class="fas fa-desktop"></i>
  <span class="btn-label">Share Screen</span>
</button>

// Button event handler
const screenShareBtn = document.getElementById('screenShareBtn');

screenShareBtn.addEventListener('click', async () => {
  if (screenShareManager.isSharingScreen()) {
    await stopScreenShare();
  } else {
    await startScreenShare();
  }
});

// Update button state
function updateScreenShareButton(isSharing) {
  const icon = screenShareBtn.querySelector('i');
  const label = screenShareBtn.querySelector('.btn-label');
  
  if (isSharing) {
    screenShareBtn.classList.add('active');
    icon.className = 'fas fa-stop-circle';
    label.textContent = 'Stop Sharing';
    screenShareBtn.title = 'Stop sharing your screen';
  } else {
    screenShareBtn.classList.remove('active');
    icon.className = 'fas fa-desktop';
    label.textContent = 'Share Screen';
    screenShareBtn.title = 'Share your screen';
  }
}
```

## Layout Control Integration

```javascript
// Layout mode selector
const layoutSelector = document.getElementById('layoutSelector');

layoutSelector.addEventListener('change', (e) => {
  const mode = e.target.value;
  videoGrid.setLayoutMode(mode);
  
  // Save preference
  localStorage.setItem('preferred-layout', mode);
});

// Restore saved layout on load
function restoreLayoutPreference() {
  const savedLayout = localStorage.getItem('preferred-layout');
  if (savedLayout) {
    videoGrid.setLayoutMode(savedLayout);
    layoutSelector.value = savedLayout;
  }
}
```

## Fullscreen Integration

```javascript
// Listen for fullscreen changes
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    console.log('Entered fullscreen mode');
    // Update UI for fullscreen
    document.body.classList.add('fullscreen-mode');
  } else {
    console.log('Exited fullscreen mode');
    // Restore normal UI
    document.body.classList.remove('fullscreen-mode');
  }
});

// Keyboard shortcut for fullscreen (F key)
document.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') {
    const screenShareElement = document.querySelector('.screen-share-feed');
    if (screenShareElement) {
      const fullscreenBtn = screenShareElement.querySelector('.fullscreen-btn');
      if (fullscreenBtn) {
        fullscreenBtn.click();
      }
    }
  }
});
```

## Error Handling

```javascript
// Comprehensive error handling
async function handleScreenShare() {
  try {
    const stream = await screenShareManager.startSharing();
    videoGrid.setScreenShare(currentUser.id, stream, {
      name: currentUser.name,
      isLocal: true
    });
  } catch (error) {
    // Handle specific error types
    switch (error.name) {
      case 'NotAllowedError':
        showNotification(
          'Camera permission denied. Please allow screen sharing in your browser settings.',
          'error'
        );
        break;
        
      case 'NotSupportedError':
        showNotification(
          'Screen sharing is not supported in this browser. Please use Chrome, Firefox, or Edge.',
          'error'
        );
        break;
        
      case 'NotFoundError':
        showNotification(
          'No screen or window available to share.',
          'error'
        );
        break;
        
      default:
        if (error.message === 'Screen share cancelled') {
          // User cancelled - silent
          console.log('User cancelled screen share');
        } else {
          showNotification(
            `Failed to start screen share: ${error.message}`,
            'error'
          );
        }
    }
  }
}
```

## Participant List Integration

```javascript
// Update participant list with screen share status
function updateParticipantScreenShareStatus(userId, isSharing) {
  const participantElement = document.querySelector(`[data-user-id="${userId}"]`);
  if (!participantElement) return;
  
  const statusIndicator = participantElement.querySelector('.screen-share-indicator');
  
  if (isSharing) {
    if (!statusIndicator) {
      const indicator = document.createElement('span');
      indicator.className = 'screen-share-indicator';
      indicator.innerHTML = '<i class="fas fa-desktop"></i>';
      indicator.title = 'Sharing screen';
      participantElement.appendChild(indicator);
    }
  } else {
    if (statusIndicator) {
      statusIndicator.remove();
    }
  }
}
```

## Activity Feed Integration

```javascript
// Add screen share events to activity feed
function addScreenShareActivity(userName, action) {
  const activityFeed = document.getElementById('activity-feed');
  
  const activity = document.createElement('div');
  activity.className = 'activity-item screen-share-activity';
  
  const icon = document.createElement('i');
  icon.className = 'fas fa-desktop';
  
  const message = document.createElement('span');
  message.textContent = action === 'started' 
    ? `${userName} started sharing their screen`
    : `${userName} stopped sharing their screen`;
  
  const timestamp = document.createElement('span');
  timestamp.className = 'timestamp';
  timestamp.textContent = new Date().toLocaleTimeString();
  
  activity.appendChild(icon);
  activity.appendChild(message);
  activity.appendChild(timestamp);
  
  activityFeed.prepend(activity);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    activity.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => activity.remove(), 300);
  }, 10000);
}

// Usage
socket.on('user-screen-share-started', (data) => {
  addScreenShareActivity(data.userName, 'started');
  // ... rest of handler
});

socket.on('user-screen-share-stopped', (data) => {
  addScreenShareActivity(data.userName, 'stopped');
  // ... rest of handler
});
```

## Quality Monitoring

```javascript
// Monitor screen share quality
function monitorScreenShareQuality() {
  if (!screenShareManager.isSharingScreen()) return;
  
  const stats = screenShareManager.getShareStats();
  
  if (stats) {
    console.log('Screen Share Stats:', {
      resolution: `${stats.width}x${stats.height}`,
      frameRate: `${stats.frameRate} fps`,
      shareType: stats.shareType
    });
    
    // Update quality indicator in UI
    updateQualityIndicator(stats);
  }
}

// Run every 5 seconds
setInterval(monitorScreenShareQuality, 5000);
```

## Cleanup on Room Leave

```javascript
// Clean up when leaving room
function leaveRoom() {
  // Stop screen sharing if active
  if (screenShareManager.isSharingScreen()) {
    screenShareManager.stopSharing();
  }
  
  // Clear video grid
  videoGrid.clearAll();
  
  // Notify server
  socket.emit('leave-room', { room: currentRoom });
  
  // Reset UI
  updateScreenShareButton(false);
  
  console.log('Left room and cleaned up resources');
}
```

## Complete Integration Class

```javascript
class ScreenShareIntegration {
  constructor(videoGrid, screenShareManager, socket) {
    this.videoGrid = videoGrid;
    this.screenShareManager = screenShareManager;
    this.socket = socket;
    this.currentRoom = null;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Listen for stop sharing from UI
    this.videoGrid.container.addEventListener('stop-screen-share', 
      this.handleStopSharing.bind(this)
    );
    
    // Listen for remote screen shares
    this.socket.on('user-screen-share-started', 
      this.handleRemoteScreenShareStarted.bind(this)
    );
    
    this.socket.on('user-screen-share-stopped', 
      this.handleRemoteScreenShareStopped.bind(this)
    );
  }
  
  async startSharing(currentUser) {
    try {
      const stream = await this.screenShareManager.startSharing();
      
      this.videoGrid.setScreenShare(currentUser.id, stream, {
        name: currentUser.name,
        isLocal: true
      });
      
      this.socket.emit('start-screen-share', {
        room: this.currentRoom,
        userId: currentUser.id,
        userName: currentUser.name
      });
      
      return true;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }
  
  async stopSharing(userId) {
    try {
      await this.screenShareManager.stopSharing();
      this.videoGrid.clearScreenShare();
      
      this.socket.emit('stop-screen-share', {
        room: this.currentRoom,
        userId: userId
      });
      
      return true;
    } catch (error) {
      console.error('Failed to stop screen share:', error);
      throw error;
    }
  }
  
  handleStopSharing(event) {
    const userId = event.detail.userId;
    this.stopSharing(userId);
  }
  
  handleRemoteScreenShareStarted(data) {
    const { userId, userName, stream } = data;
    
    this.videoGrid.setScreenShare(userId, stream, {
      name: userName,
      isLocal: false
    });
  }
  
  handleRemoteScreenShareStopped(data) {
    this.videoGrid.clearScreenShare();
  }
  
  setRoom(roomId) {
    this.currentRoom = roomId;
  }
  
  cleanup() {
    if (this.screenShareManager.isSharingScreen()) {
      this.screenShareManager.stopSharing();
    }
    this.videoGrid.clearAll();
  }
}

// Usage
const screenShareIntegration = new ScreenShareIntegration(
  videoGrid,
  screenShareManager,
  socket
);

screenShareIntegration.setRoom('room-123');
```

## Summary

These examples demonstrate how to integrate the screen share functionality into your TeamUp application. Key points:

1. **Initialize** VideoGridLayout and ScreenShareManager
2. **Handle Events** for starting/stopping screen shares
3. **Update UI** to reflect screen share state
4. **Notify Server** of screen share changes
5. **Handle Errors** gracefully with user feedback
6. **Clean Up** resources when leaving rooms

The integration is designed to be modular and easy to incorporate into existing code.
