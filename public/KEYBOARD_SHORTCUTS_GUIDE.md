# TeamUp Keyboard Shortcuts Guide

## Video & Screen Sharing Controls

### Quick Reference

| Key | Action | Description |
|-----|--------|-------------|
| **V** | Toggle Camera | Turn your camera on or off |
| **S** | Toggle Screen Share | Start or stop sharing your screen |
| **L** | Cycle Layout | Switch between Grid, Speaker, Sidebar, and PIP views |
| **F** | Toggle Fullscreen | Enter or exit fullscreen mode |

## Detailed Instructions

### 📹 V - Toggle Camera
**Action**: Turns your camera on or off

**Usage**:
1. Make sure no input field is focused
2. Press the **V** key
3. Your camera will toggle on/off
4. A notification will appear confirming the action
5. Screen readers will announce "Camera turned on/off"

**Note**: If your camera is disabled by an admin, this shortcut will not work.

---

### 🖥️ S - Toggle Screen Share
**Action**: Starts or stops screen sharing

**Usage**:
1. Make sure no input field is focused
2. Press the **S** key
3. If not sharing:
   - Browser's screen selection dialog will appear
   - Choose what to share (screen, window, or tab)
4. If already sharing:
   - Screen sharing will stop immediately
5. Screen readers will announce "Screen sharing started/stopped"

**Note**: Screen sharing requires browser permissions.

---

### 📐 L - Cycle Layout
**Action**: Cycles through different video layout modes

**Usage**:
1. Make sure no input field is focused
2. Press the **L** key repeatedly to cycle through:
   - **Grid View**: Equal-sized video feeds in a grid
   - **Speaker View**: Large main video with small thumbnails
   - **Sidebar View**: Main content with video sidebar
   - **Picture-in-Picture**: Floating draggable video window
3. Screen readers will announce "Layout changed to [mode name]"

**Tip**: Each layout mode is optimized for different use cases:
- Grid: Best for group discussions
- Speaker: Best for presentations
- Sidebar: Best for screen sharing with video
- PIP: Best for multitasking

---

### 🖼️ F - Toggle Fullscreen
**Action**: Enters or exits fullscreen mode

**Usage**:
1. Make sure no input field is focused
2. Press the **F** key
3. The video grid will enter fullscreen mode
4. Press **F** again or **Esc** to exit fullscreen
5. Screen readers will announce "Fullscreen toggled"

**Note**: Fullscreen mode hides browser UI for maximum viewing area.

---

## Accessibility Features

### Screen Reader Support
All keyboard shortcuts are announced to screen readers with clear, descriptive messages:
- "Camera turned on"
- "Screen sharing started"
- "Layout changed to Grid View"
- "Fullscreen toggled"

### ARIA Live Regions
Status updates are announced automatically without interrupting your workflow.

### Reduced Motion Support
If you have "Reduce motion" enabled in your system settings:
- All animations are disabled
- Transitions are instant
- Visual feedback is maintained without motion
- Functionality remains unchanged

### Focus Indicators
All interactive elements have clear focus indicators for keyboard navigation:
- Blue outline on focused buttons
- High contrast focus styles
- Visible focus on all controls

---

## Tips & Best Practices

### When Shortcuts Don't Work
Keyboard shortcuts are disabled when:
- An input field (text box, textarea) is focused
- A dropdown menu is open
- You're typing in the editor

**Solution**: Click outside the input field or press **Esc** to close menus.

### Combining with Mouse
You can use keyboard shortcuts and mouse controls interchangeably:
- Press **V** to toggle camera
- Click the camera button to toggle camera
- Both methods work the same way

### Screen Reader Users
For the best experience with screen readers:
1. Enable "Reduce motion" in your system settings
2. Use keyboard shortcuts for faster navigation
3. Listen for ARIA live region announcements
4. Use Tab key to navigate between controls

### Mobile Devices
Keyboard shortcuts are designed for desktop use. On mobile devices:
- Use the on-screen buttons instead
- Touch controls are optimized for mobile
- Accessibility features still apply

---

## Troubleshooting

### Shortcut Not Working
1. **Check focus**: Make sure no input field is focused
2. **Check permissions**: Camera/screen share require browser permissions
3. **Check admin restrictions**: Admins can disable your camera
4. **Try clicking**: Use mouse controls as an alternative

### Screen Reader Not Announcing
1. **Check ARIA support**: Ensure your screen reader supports ARIA live regions
2. **Check volume**: Ensure screen reader volume is not muted
3. **Check settings**: Some screen readers require ARIA live regions to be enabled

### Fullscreen Not Working
1. **Check browser support**: Fullscreen API is supported in modern browsers
2. **Check permissions**: Some browsers require user interaction
3. **Try F11**: Use browser's native fullscreen (F11) as alternative

---

## Feedback & Support

If you encounter any issues with keyboard shortcuts or accessibility features:
1. Check the browser console for error messages
2. Try refreshing the page
3. Clear browser cache and cookies
4. Contact support with details about your setup

---

## System Requirements

### Supported Browsers
- Chrome 74+ (recommended)
- Firefox 63+
- Safari 10.1+
- Edge 79+

### Supported Screen Readers
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

### Operating Systems
- Windows 10+
- macOS 10.14+
- Linux (Ubuntu 18.04+)
- iOS 12+
- Android 9+

---

## Additional Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
- [Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Reduced Motion](https://web.dev/prefers-reduced-motion/)

---

**Last Updated**: December 2024  
**Version**: 1.0.0
