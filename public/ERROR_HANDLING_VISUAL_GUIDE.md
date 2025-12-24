# Error Handling Visual Guide

## Quick Reference for Common Errors

### 🎥 Camera Errors

#### Permission Denied
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Camera permission denied                        │
│                                                      │
│ Click the camera icon in your browser's address     │
│ bar and select "Allow". You can also go to          │
│ Settings > Privacy and security > Site Settings >   │
│ Camera to manage permissions.                       │
└─────────────────────────────────────────────────────┘
```

**What to do:**
1. Look for camera icon in address bar (🎥)
2. Click it and select "Allow"
3. Refresh the page if needed

#### No Camera Found
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  No camera found                                  │
│                                                      │
│ Please connect a camera device and try again.       │
│ Make sure your camera is properly connected and     │
│ not disabled in your system settings.               │
└─────────────────────────────────────────────────────┘
```

**What to do:**
1. Check if camera is plugged in
2. Check system settings (Device Manager on Windows, System Preferences on Mac)
3. Try a different USB port
4. Restart your computer if needed

#### Camera In Use
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Camera is already in use                         │
│                                                      │
│ Your camera is being used by another application.   │
│ Please close other applications that might be       │
│ using your camera (like Zoom, Skype, or other       │
│ video apps) and try again.                          │
└─────────────────────────────────────────────────────┘
```

**What to do:**
1. Close Zoom, Skype, Teams, or other video apps
2. Close other browser tabs using camera
3. Check for background apps using camera
4. Restart browser if needed

### 🖥️ Screen Share Errors

#### User Cancellation
```
No error shown - this is normal!
User clicked "Cancel" in screen share dialog
```

**What happened:**
- You clicked "Cancel" in the screen selection dialog
- This is not an error, just a normal action
- No notification is shown

#### Browser Not Supported
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Screen sharing is not supported in Chrome       │
│                                                      │
│ Please update to Chrome 72 or later.                │
└─────────────────────────────────────────────────────┘
```

**What to do:**
1. Check your browser version
2. Update to the latest version
3. Minimum versions:
   - Chrome 72+
   - Firefox 66+
   - Edge 79+
   - Safari 13+

#### Automatic Stop
```
┌─────────────────────────────────────────────────────┐
│ ℹ️  Screen sharing stopped automatically            │
│                                                      │
│ (window closed or sharing ended)                    │
└─────────────────────────────────────────────────────┘
```

**What happened:**
- You closed the shared window/tab
- You clicked "Stop Sharing" in browser UI
- The shared application closed
- This is automatic cleanup, not an error

## Browser-Specific Instructions

### Chrome
```
Camera/Screen Share Permissions:
1. Click camera icon (🎥) in address bar
2. Select "Allow"
3. Or go to: chrome://settings/content/camera
```

### Firefox
```
Camera/Screen Share Permissions:
1. Click camera icon (🎥) in address bar
2. Select "Allow"
3. Or go to: about:preferences#privacy
   → Permissions → Camera
```

### Safari
```
Camera Permissions:
1. Safari menu → Settings
2. Websites → Camera
3. Allow for this website
4. Reload page

Screen Share Permissions:
1. System Preferences
2. Security & Privacy
3. Screen Recording
4. Enable for Safari
```

### Edge
```
Camera/Screen Share Permissions:
1. Click camera icon (🎥) in address bar
2. Select "Allow"
3. Or go to: edge://settings/content/camera
```

## Testing Your Setup

### Quick Camera Test
1. Open: `teamup/public/error-handling-test.html`
2. Click "Test Camera Permission"
3. Allow camera access
4. ✅ Success: "Camera access granted successfully!"

### Quick Screen Share Test
1. Open: `teamup/public/error-handling-test.html`
2. Click "Test Screen Share"
3. Select a window/screen
4. ✅ Success: "Screen sharing started successfully!"

## Troubleshooting Flowchart

```
Camera Not Working?
│
├─ Permission Denied?
│  └─ Follow browser-specific instructions above
│
├─ No Camera Found?
│  ├─ Check physical connection
│  ├─ Check system settings
│  └─ Try different USB port
│
├─ Camera In Use?
│  ├─ Close other video apps
│  ├─ Close other browser tabs
│  └─ Restart browser
│
└─ Still Not Working?
   ├─ Restart computer
   ├─ Update browser
   └─ Check browser compatibility

Screen Share Not Working?
│
├─ Browser Not Supported?
│  └─ Update to minimum version
│
├─ Permission Denied?
│  └─ Check system permissions (macOS)
│
└─ Still Not Working?
   ├─ Restart browser
   ├─ Update browser
   └─ Try different browser
```

## Common Scenarios

### Scenario 1: First Time User
```
User Action: Clicks camera button
System: Shows permission dialog
User Action: Clicks "Allow"
Result: ✅ Camera enabled successfully
```

### Scenario 2: Permission Previously Denied
```
User Action: Clicks camera button
System: Shows error with instructions
User Action: Follows browser-specific steps
User Action: Clicks camera button again
Result: ✅ Camera enabled successfully
```

### Scenario 3: Camera In Use
```
User Action: Clicks camera button
System: Shows "Camera in use" error
User Action: Closes Zoom
User Action: Clicks camera button again
Result: ✅ Camera enabled successfully
```

### Scenario 4: Screen Share Cancellation
```
User Action: Clicks screen share button
System: Shows screen selection dialog
User Action: Clicks "Cancel"
Result: ℹ️ No error shown (normal action)
```

### Scenario 5: Automatic Screen Share Stop
```
User Action: Shares a window
System: Screen sharing active
User Action: Closes the shared window
System: Automatically stops sharing
Result: ℹ️ "Screen sharing stopped automatically"
```

## Error Severity Levels

### 🔴 Critical (Red)
- Permission denied
- Browser not supported
- No camera/screen available

**Action Required:** User must take action to resolve

### 🟡 Warning (Yellow)
- Camera in use
- Unsupported constraints
- Hardware errors

**Action Required:** User should take action, but may have workarounds

### 🔵 Info (Blue)
- Automatic screen share stop
- User cancellation

**Action Required:** No action needed, informational only

### 🟢 Success (Green)
- Camera enabled
- Screen share started
- Permissions granted

**Action Required:** None, everything working

## Quick Tips

### For Users
1. **Always allow permissions** when prompted
2. **Close other video apps** before using camera
3. **Update your browser** regularly
4. **Check system settings** if camera not found
5. **Don't panic on errors** - follow the instructions

### For Developers
1. **Test in multiple browsers** - behavior varies
2. **Test permission denial** - common scenario
3. **Test with no camera** - edge case
4. **Test camera in use** - common in video apps
5. **Test auto-stop** - important for cleanup

## Support Resources

### Browser Help
- **Chrome:** https://support.google.com/chrome/answer/2693767
- **Firefox:** https://support.mozilla.org/kb/how-manage-your-camera-and-microphone-permissions
- **Safari:** https://support.apple.com/guide/safari/websites-ibrwe2159f50/mac
- **Edge:** https://support.microsoft.com/microsoft-edge/camera-and-microphone-permissions

### System Settings
- **Windows:** Settings → Privacy → Camera
- **macOS:** System Preferences → Security & Privacy → Camera/Screen Recording
- **Linux:** Varies by distribution

## Summary

✅ **Clear Error Messages** - Know what went wrong
✅ **Actionable Instructions** - Know how to fix it
✅ **Browser-Specific Help** - Tailored to your browser
✅ **Visual Indicators** - Color-coded severity
✅ **Automatic Cleanup** - No manual intervention needed
✅ **Graceful Degradation** - App stays stable

**Remember:** Most errors are easily fixable by following the instructions provided in the error message!
