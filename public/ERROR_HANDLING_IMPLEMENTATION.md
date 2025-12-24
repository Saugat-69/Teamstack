# Error Handling and Permissions Implementation

## Overview

This document describes the comprehensive error handling and permissions system implemented for video calling and screen sharing features in TeamUp. The implementation ensures users receive clear, actionable error messages with browser-specific instructions when issues occur.

**Requirements Addressed:**
- 1.2: Camera permission handling
- 4.2: Screen share cancellation handling  
- 6.4: Browser compatibility detection and automatic screen share stop

## Camera Error Handling

### Supported Error Scenarios

#### 1. Permission Denied (NotAllowedError)
**Scenario:** User denies camera permission or has previously blocked camera access.

**Error Message:** "Camera permission denied. [Browser-specific instructions]"

**Browser-Specific Instructions:**
- **Chrome:** "Click the camera icon in your browser's address bar and select 'Allow'. You can also go to Settings > Privacy and security > Site Settings > Camera to manage permissions."
- **Firefox:** "Click the camera icon in your browser's address bar and select 'Allow'. You can also go to Settings > Privacy & Security > Permissions > Camera to manage permissions."
- **Safari:** "Go to Safari > Settings > Websites > Camera and allow access for this website. You may need to reload the page after changing permissions."
- **Edge:** "Click the camera icon in your browser's address bar and select 'Allow'. You can also go to Settings > Cookies and site permissions > Camera to manage permissions."

**Implementation:**
```javascript
if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
  errorMessage = 'Camera permission denied';
  errorDetails = this.getCameraPermissionInstructions();
}
```

#### 2. No Camera Found (NotFoundError)
**Scenario:** No camera device is connected to the system.

**Error Message:** "No camera found. Please connect a camera device and try again. Make sure your camera is properly connected and not disabled in your system settings."

**User Actions:**
- Connect a camera device
- Check system settings to ensure camera is enabled
- Verify camera is not disabled in device manager

#### 3. Camera In Use (NotReadableError)
**Scenario:** Camera is already being used by another application.

**Error Message:** "Camera is already in use. Your camera is being used by another application. Please close other applications that might be using your camera (like Zoom, Skype, or other video apps) and try again."

**User Actions:**
- Close other video conferencing applications
- Close browser tabs using the camera
- Restart the browser if needed

#### 4. Unsupported Constraints (OverconstrainedError)
**Scenario:** Camera doesn't support the requested video quality settings.

**Error Message:** "Camera settings not supported. Your camera does not support the requested video quality settings. Try lowering the video quality in settings."

**User Actions:**
- Lower video quality preset
- Try different quality settings
- Use a different camera if available

#### 5. Browser Not Supported (TypeError)
**Scenario:** Browser doesn't support getUserMedia API.

**Error Message:** "Camera not supported. Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, Edge, or Safari."

**User Actions:**
- Update browser to latest version
- Switch to a supported browser
- Check browser compatibility

#### 6. Hardware Error (AbortError)
**Scenario:** Hardware-level error accessing camera.

**Error Message:** "Camera hardware error. There was a problem accessing your camera hardware. Try unplugging and reconnecting your camera, or restart your browser."

**User Actions:**
- Reconnect camera hardware
- Restart browser
- Check system drivers

### Implementation Details

**Location:** `teamup/public/js/media-manager.js`

**Key Methods:**
- `enableVideo()`: Main camera activation with comprehensive error handling
- `getCameraPermissionInstructions()`: Returns browser-specific permission instructions

**Error Flow:**
1. Check browser support for getUserMedia
2. Request camera access with constraints
3. Catch and classify error by error.name
4. Generate user-friendly error message
5. Show notification with actionable instructions
6. Log error details for debugging

## Screen Share Error Handling

### Supported Error Scenarios

#### 1. User Cancellation (NotAllowedError)
**Scenario:** User cancels the screen share selection dialog.

**Behavior:** No error notification shown (normal user action)

**Implementation:**
```javascript
if (error.name === 'NotAllowedError') {
  console.log('ℹ️ User cancelled screen share selection');
  errorMessage = 'Screen share cancelled';
  shouldNotify = false; // Don't show notification
}
```

**Rationale:** User cancellation is an intentional action, not an error condition. Showing an error notification would be confusing and annoying.

#### 2. Browser Not Supported (NotSupportedError)
**Scenario:** Browser doesn't support getDisplayMedia API.

**Error Message:** "Screen sharing is not supported in this browser. Please use Chrome 72+, Firefox 66+, Edge 79+, or Safari 13+."

**Browser Requirements:**
- Chrome: Version 72 or later
- Firefox: Version 66 or later
- Edge: Version 79 or later
- Safari: Version 13 or later
- Opera: Version 60 or later

#### 3. No Screen Available (NotFoundError)
**Scenario:** No screen or window available to share.

**Error Message:** "No screen or window available to share. Please make sure you have at least one window or screen available."

#### 4. Screen Capture Error (NotReadableError)
**Scenario:** System-level error capturing screen.

**Error Message:** "Unable to capture screen. This may be due to system permissions or hardware issues. Try restarting your browser."

**Common Causes:**
- macOS: Screen recording permission not granted in System Preferences
- Windows: Display driver issues
- Linux: X11/Wayland permission issues

#### 5. Constraints Not Satisfied (OverconstrainedError)
**Scenario:** Screen capture constraints cannot be met.

**Error Message:** "Screen sharing settings are not supported. Try adjusting the quality settings."

#### 6. Capture Aborted (AbortError)
**Scenario:** Screen capture was aborted.

**Error Message:** "Screen sharing was aborted. Please try again."

### Browser Compatibility Detection

**Location:** `teamup/public/js/screen-share-manager.js`

**Method:** `checkBrowserCompatibility()`

**Implementation:**
```javascript
checkBrowserCompatibility() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    // Detect browser and provide specific recommendations
    const userAgent = navigator.userAgent.toLowerCase();
    // Return browser-specific error message
  }
  return { supported: true, message: 'Screen sharing is supported' };
}
```

**Features:**
- Detects browser type from user agent
- Provides version-specific recommendations
- Returns structured compatibility result
- Called before attempting screen share

### Automatic Screen Share Stop

**Requirement:** 6.4 - Implement automatic screen share stop on source close

**Scenarios Handled:**
1. User clicks "Stop Sharing" in browser UI
2. User closes the shared window/tab
3. User switches to sharing a different source

**Implementation:**
```javascript
setupStreamEndedHandler(stream) {
  const videoTrack = stream.getVideoTracks()[0];
  
  videoTrack.onended = () => {
    console.log('🖥️ Screen share track ended');
    this.handleStreamEnded();
  };
}

handleStreamEnded() {
  // Clean up state
  this.screenStream = null;
  this.isSharing = false;
  this.shareType = null;
  
  // Notify user
  this.mediaManager.app.showNotification(
    'Screen sharing stopped automatically (window closed or sharing ended)',
    'info'
  );
  
  // Notify server and app
  // ...
}
```

**Features:**
- Listens to track.onended event
- Prevents double cleanup with state checks
- Notifies user of automatic stop
- Updates UI and server state
- Cleans up resources properly

## Testing

### Test File
**Location:** `teamup/public/error-handling-test.html`

### Test Coverage

#### Camera Tests
1. **Test Camera Permission** - Request actual camera access
2. **Simulate No Camera** - Mock NotFoundError
3. **Simulate Camera In Use** - Mock NotReadableError
4. **Test Browser Support** - Check getUserMedia availability

#### Screen Share Tests
1. **Test Screen Share** - Request actual screen share
2. **Test Cancellation** - User cancels dialog
3. **Test Compatibility** - Check getDisplayMedia availability
4. **Test Auto-Stop** - Verify automatic cleanup

### Running Tests

1. Open `teamup/public/error-handling-test.html` in a browser
2. Click test buttons to trigger different scenarios
3. Observe error messages and notifications
4. Check event log for detailed information
5. Verify browser information is detected correctly

### Expected Results

**Camera Permission Test:**
- ✅ Shows permission dialog
- ✅ Grants access on allow
- ✅ Shows detailed error on deny
- ✅ Provides browser-specific instructions

**Screen Share Test:**
- ✅ Shows screen selection dialog
- ✅ Starts sharing on selection
- ✅ No error on cancellation
- ✅ Auto-stops when window closes
- ✅ Shows compatibility errors

## Error Message Design Principles

### 1. Clear and Actionable
Every error message includes:
- What went wrong (error type)
- Why it happened (context)
- How to fix it (actionable steps)

### 2. User-Friendly Language
- Avoid technical jargon
- Use plain English
- Explain in terms users understand

### 3. Browser-Specific Guidance
- Detect user's browser
- Provide browser-specific instructions
- Include exact menu paths

### 4. Progressive Disclosure
- Show brief error in notification
- Log detailed error in console
- Provide troubleshooting steps

### 5. Graceful Degradation
- Don't show errors for user actions (cancellation)
- Provide fallback options when possible
- Maintain app stability on errors

## Integration with TeamUp

### Notification System
Errors are displayed using TeamUp's existing notification system:

```javascript
if (this.app && this.app.showNotification) {
  this.app.showNotification(errorMessage, 'error');
}
```

**Features:**
- Consistent UI across app
- Auto-dismiss after 5 seconds
- Color-coded by severity
- Icon-based visual indicators

### Activity Feed
Errors are also logged to the room activity feed for reference:

```javascript
this.app.addRoomActivity(`Camera error: ${errorMessage}`, 'error');
```

### Console Logging
Detailed error information is logged to console for debugging:

```javascript
console.error('❌ Failed to enable video:', error);
console.error('📹 Camera permission denied by user');
```

## Browser Compatibility

### Supported Browsers

| Browser | Camera | Screen Share | Min Version |
|---------|--------|--------------|-------------|
| Chrome  | ✅     | ✅           | 72+         |
| Firefox | ✅     | ✅           | 66+         |
| Edge    | ✅     | ✅           | 79+         |
| Safari  | ✅     | ✅           | 13+         |
| Opera   | ✅     | ✅           | 60+         |

### Feature Detection
The implementation uses feature detection rather than browser detection:

```javascript
// Check for getUserMedia support
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  // Show error with browser-specific guidance
}

// Check for getDisplayMedia support
if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
  // Show error with browser-specific guidance
}
```

## Security Considerations

### Permission Handling
- Permissions are requested only when needed
- Clear explanation before requesting
- Respect user's permission decisions
- No automatic retry on denial

### Privacy Protection
- Camera indicator shown when active
- Easy disable controls
- No recording or storage
- Peer-to-peer transmission only

### Error Information
- Don't expose system details
- Sanitize error messages
- Log sensitive info only to console
- User-friendly public messages

## Future Enhancements

### Potential Improvements
1. **Permission Pre-check** - Check permissions before showing controls
2. **Retry Mechanism** - Smart retry with exponential backoff
3. **Fallback Quality** - Auto-reduce quality on constraints error
4. **Device Recommendations** - Suggest compatible devices
5. **Troubleshooting Guide** - Link to detailed help documentation
6. **Error Analytics** - Track common errors for improvement

### Accessibility
1. **Screen Reader Support** - Announce errors to screen readers
2. **Keyboard Navigation** - Navigate error dialogs with keyboard
3. **High Contrast** - Ensure error messages are visible
4. **Focus Management** - Return focus after error dismissal

## Conclusion

The error handling implementation provides comprehensive coverage of camera and screen sharing error scenarios with clear, actionable user guidance. The system is designed to be user-friendly, browser-aware, and maintainable while ensuring a smooth user experience even when errors occur.

**Key Achievements:**
- ✅ All camera error scenarios handled
- ✅ Screen share cancellation handled gracefully
- ✅ Browser compatibility detection implemented
- ✅ Automatic screen share stop on source close
- ✅ Browser-specific user instructions
- ✅ Comprehensive test suite
- ✅ Clear documentation

**Requirements Satisfied:**
- ✅ 1.2: Camera permission denied error handling with instructions
- ✅ 1.2: No camera available detection and messaging
- ✅ 1.2: Camera in use error handling
- ✅ 4.2: Screen share cancellation handling
- ✅ 6.4: Browser compatibility detection for screen share
- ✅ 6.4: Automatic screen share stop on source close
