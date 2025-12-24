# Video Layout Modes Implementation

## Overview

This document describes the implementation of multiple layout modes for the TeamUp video grid system. The implementation supports four distinct layout modes with full persistence and drag support for Picture-in-Picture mode.

## Implemented Features

### 1. Layout Modes

#### Grid View (Default)
- **Description**: Equal-sized video feeds arranged in an optimal grid
- **Use Case**: Best for meetings with equal participation
- **Features**:
  - Automatic grid calculation based on participant count
  - Responsive sizing (1-12+ participants)
  - Pinned feeds appear first in the grid
  - Smooth transitions when participants join/leave

#### Speaker View
- **Description**: Large main speaker with small thumbnails
- **Use Case**: Presentations or meetings with a primary speaker
- **Features**:
  - Main feed takes 70% of space
  - Thumbnails at 15% size
  - Pinned feed becomes main speaker
  - Automatic layout when screen sharing starts

#### Sidebar View
- **Description**: Main content area with video sidebar
- **Use Case**: Collaborative work with persistent video presence
- **Features**:
  - Main content takes 75% width
  - Sidebar at 25% width
  - Pinned feed becomes main content
  - Responsive on mobile (switches to column layout)

#### Picture-in-Picture (PIP)
- **Description**: Floating draggable video window
- **Use Case**: Multitasking while maintaining video presence
- **Features**:
  - Fixed size (320x180px, responsive on mobile)
  - Fully draggable with mouse
  - Position constrained to viewport
  - Position persisted to localStorage
  - Shows only first video feed
  - High z-index for always-on-top behavior

### 2. Layout Mode Persistence

All layout preferences are automatically saved to localStorage:

- **Layout Mode**: `teamup-video-layout-mode`
  - Stores: Current layout mode (grid/speaker/sidebar/pip)
  - Restored on page load
  
- **PIP Position**: `teamup-pip-position`
  - Stores: { left: "XXpx", top: "YYpx" }
  - Restored when switching to PIP mode

### 3. Drag Support for PIP Mode

The Picture-in-Picture mode includes full drag support:

- **Mouse Events**: mousedown, mousemove, mouseup
- **Drag State**: Tracks dragging status and position
- **Viewport Constraints**: Prevents dragging outside visible area
- **Visual Feedback**: Cursor changes and shadow effects
- **Smooth Movement**: No lag or jitter during drag
- **Position Persistence**: Saves position on drag end

## API Reference

### VideoGridLayout Class

#### Constructor
```javascript
new VideoGridLayout(container)
```
- Automatically loads saved layout mode from localStorage
- Initializes PIP drag state
- Sets up container with proper classes

#### Methods

##### setLayoutMode(mode)
```javascript
videoGrid.setLayoutMode('grid' | 'speaker' | 'sidebar' | 'pip')
```
- Switches to specified layout mode
- Saves preference to localStorage
- Handles PIP drag handlers automatically
- Updates layout immediately

##### saveLayoutMode(mode)
```javascript
videoGrid.saveLayoutMode(mode)
```
- Saves layout mode to localStorage
- Called automatically by setLayoutMode()

##### loadLayoutMode()
```javascript
const mode = videoGrid.loadLayoutMode()
```
- Loads saved layout mode from localStorage
- Returns null if no saved mode
- Validates mode against LAYOUT_MODES

##### setupPipDragHandlers()
```javascript
videoGrid.setupPipDragHandlers()
```
- Adds mouse event listeners for dragging
- Called automatically when switching to PIP mode
- Handles drag state and position updates

##### removePipDragHandlers()
```javascript
videoGrid.removePipDragHandlers()
```
- Removes mouse event listeners
- Called automatically when switching away from PIP
- Cleans up drag state

##### savePipPosition(position)
```javascript
videoGrid.savePipPosition({ left: '100px', top: '50px' })
```
- Saves PIP window position to localStorage
- Called automatically on drag end

##### loadPipPosition()
```javascript
const position = videoGrid.loadPipPosition()
```
- Loads saved PIP position from localStorage
- Returns null if no saved position

## CSS Classes

### Layout Mode Classes

The container element receives a data attribute for the current mode:
```html
<div class="video-grid-container" data-layout-mode="grid">
```

### Video Feed Classes

- `.video-feed` - Base video feed element
- `.video-feed.pinned` - Pinned video feed (yellow border)
- `.video-feed.main-speaker` - Main speaker in speaker view
- `.video-feed.main-content` - Main content in sidebar view
- `.video-feed.speaking` - Active speaker indicator

### PIP Classes

- `.video-grid-wrapper.dragging` - Applied during drag operation

## Usage Examples

### Basic Layout Switching

```javascript
// Initialize video grid
const container = document.getElementById('videoContainer');
const videoGrid = new VideoGridLayout(container);

// Add some video feeds
videoGrid.addVideoFeed('user1', stream1, { name: 'Alice' });
videoGrid.addVideoFeed('user2', stream2, { name: 'Bob' });

// Switch to speaker view
videoGrid.setLayoutMode('speaker');

// Switch to PIP mode (enables drag)
videoGrid.setLayoutMode('pip');

// Back to grid
videoGrid.setLayoutMode('grid');
```

### With Layout Selector UI

```javascript
// Create layout selector buttons
const modes = ['grid', 'speaker', 'sidebar', 'pip'];
modes.forEach(mode => {
  const button = document.createElement('button');
  button.textContent = mode;
  button.onclick = () => {
    videoGrid.setLayoutMode(mode);
    updateActiveButton(mode);
  };
  container.appendChild(button);
});
```

### Checking Current Layout

```javascript
// Get current layout mode
const currentMode = videoGrid.layoutMode;
console.log(`Current layout: ${currentMode}`);

// Check if in PIP mode
if (videoGrid.layoutMode === 'pip') {
  console.log('PIP mode is active');
}
```

## Testing

A comprehensive test page is available at `layout-modes-test.html`:

### Test Features
- Add/remove video feeds dynamically
- Switch between all layout modes
- Test pinning functionality
- View localStorage persistence status
- Test PIP drag functionality
- Responsive design testing

### Running Tests
1. Open `teamup/public/layout-modes-test.html` in a browser
2. Click "Add Video Feed" to add test videos
3. Use layout mode buttons to switch modes
4. In PIP mode, drag the video window around
5. Refresh page to verify persistence

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile**: Responsive layouts, touch drag not implemented

## Accessibility

- **Keyboard Navigation**: Not yet implemented (future enhancement)
- **Screen Readers**: ARIA labels on controls
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **High Contrast**: Works with system high contrast modes

## Performance Considerations

- Layout calculations are optimized for up to 12 participants
- CSS Grid and Flexbox used for efficient rendering
- Drag operations use requestAnimationFrame internally (browser optimized)
- localStorage operations are wrapped in try-catch for safety

## Future Enhancements

1. **Touch Support**: Add touch event handlers for mobile drag
2. **Keyboard Shortcuts**: V for grid, S for speaker, etc.
3. **Layout Animations**: Smooth transitions between modes
4. **Custom Layouts**: User-defined grid configurations
5. **Multi-PIP**: Support multiple PIP windows
6. **Snap to Edges**: Magnetic edge snapping for PIP

## Requirements Mapping

This implementation satisfies the following requirements:

- **7.1**: Multiple layout modes (grid, speaker, sidebar, PIP)
- **7.2**: Speaker view with large main feed and thumbnails
- **7.3**: Sidebar view with main content and video sidebar
- **7.4**: Picture-in-Picture with drag support
- **7.5**: Layout mode persistence to localStorage

## Files Modified

1. `teamup/public/js/video-grid-layout.js`
   - Added layout mode persistence methods
   - Implemented PIP drag handlers
   - Enhanced layout mode switching

2. `teamup/public/css/styles.css`
   - Added video grid layout styles
   - Implemented mode-specific layouts
   - Added PIP drag styles
   - Added responsive breakpoints

3. `teamup/public/layout-modes-test.html` (new)
   - Comprehensive test page
   - Interactive layout switching
   - Visual feedback and info panel

## Conclusion

The layout modes implementation provides a flexible, user-friendly video grid system with full persistence and drag support. All requirements have been met, and the system is ready for integration into the main TeamUp application.
