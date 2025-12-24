# VideoGridLayout Class

## Overview
The `VideoGridLayout` class provides dynamic video feed arrangement for TeamUp's video calling feature. It supports multiple layout modes, pinning functionality, and responsive sizing for 1-12 participants.

## Features

### Core Functionality
- ✅ Dynamic video feed management (add/remove)
- ✅ Automatic layout calculation based on participant count
- ✅ Support for 1-12 participants with optimal grid arrangements
- ✅ Smooth transition animations
- ✅ Video feed cleanup and resource management

### Layout Modes
1. **Grid View** - Equal-sized video feeds in a responsive grid
2. **Speaker View** - Large main speaker with small thumbnails
3. **Sidebar View** - Main content area with video sidebar
4. **Picture-in-Picture** - Floating video window

### Pinning
- Pin up to 4 video feeds simultaneously
- Visual pin indicators
- Pinned feeds prioritized in layout
- Easy toggle pin/unpin functionality

### Screen Sharing
- Dedicated screen share display
- Automatic layout switching for screen shares
- Prominent screen share presentation

## Usage

### Basic Setup
```javascript
// Create container element
const container = document.getElementById('videoContainer');

// Initialize VideoGridLayout
const videoGrid = new VideoGridLayout(container);
```

### Adding Video Feeds
```javascript
// Add a video feed
const userId = 'user-123';
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
const metadata = {
  name: 'John Doe',
  isLocal: false
};

videoGrid.addVideoFeed(userId, stream, metadata);
```

### Removing Video Feeds
```javascript
// Remove a specific video feed
videoGrid.removeVideoFeed('user-123');

// Clear all video feeds
videoGrid.clearAll();
```

### Layout Modes
```javascript
// Set layout mode
videoGrid.setLayoutMode('grid');     // Grid view
videoGrid.setLayoutMode('speaker');  // Speaker view
videoGrid.setLayoutMode('sidebar');  // Sidebar view
videoGrid.setLayoutMode('pip');      // Picture-in-Picture
```

### Pinning
```javascript
// Pin a video feed
videoGrid.pinFeed('user-123');

// Unpin a video feed
videoGrid.unpinFeed('user-123');

// Toggle pin state
videoGrid.togglePinFeed('user-123');
```

### Screen Sharing
```javascript
// Set screen share
const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
videoGrid.setScreenShare('user-123', screenStream);

// Clear screen share
videoGrid.clearScreenShare();
```

## Layout Calculations

### Grid Layout
- 1 participant: 1x1 grid
- 2 participants: 2x1 grid
- 3-4 participants: 2x2 grid
- 5-6 participants: 3x2 grid
- 7-9 participants: 3x3 grid
- 10-12 participants: 4x3 grid
- 12+ participants: 4 columns, calculated rows

### Responsive Behavior
- Automatically adjusts to container size
- Mobile-optimized layouts
- Smooth transitions between layout changes

## CSS Classes

### Container Classes
- `.video-grid-container` - Main container
- `.video-grid-wrapper` - Grid wrapper

### Feed Classes
- `.video-feed` - Individual video feed
- `.video-feed.pinned` - Pinned video feed
- `.video-feed.main-speaker` - Main speaker in speaker view
- `.video-feed.main-content` - Main content in sidebar view
- `.video-feed.speaking` - Active speaker indicator

### Element Classes
- `.video-element` - Video element
- `.video-overlay` - Overlay with controls
- `.video-controls` - Control buttons container
- `.video-control-btn` - Individual control button
- `.connection-indicator` - Connection quality indicator
- `.speaking-indicator` - Speaking animation indicator

## Events and Callbacks

The VideoGridLayout class automatically handles:
- Video stream cleanup on removal
- Layout recalculation on add/remove
- Smooth animations for transitions
- Fullscreen toggle functionality

## Testing

A test page is available at `/video-grid-test.html` that demonstrates:
- Adding/removing video feeds
- Switching between layout modes
- Simulated video streams
- Real-time statistics

## Requirements Fulfilled

✅ **Requirement 2.1** - Display video feeds within 3 seconds
✅ **Requirement 2.2** - Automatic layout arrangement based on participant count
✅ **Requirement 2.3** - Support for up to 12 simultaneous video feeds
✅ **Requirement 2.5** - Dynamic layout updates when participants join/leave

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance Considerations

- Efficient DOM manipulation
- CSS Grid for optimal layout performance
- GPU-accelerated animations
- Lazy rendering for off-screen feeds
- Proper resource cleanup

## Future Enhancements

- Virtual scrolling for 12+ participants
- Bandwidth-aware quality adjustment
- Advanced grid algorithms
- Custom layout configurations
- Drag-and-drop feed positioning
