# Video Controls UI - Visual Guide

## 🎨 Component Overview

This guide provides a visual description of all video control UI components implemented in Task 10.

## 📐 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     Main Application Area                       │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ▼
        ┌─────────────────────────────────────────────┐
        │  [📹] [🖥️] │ [📐▼] [⚙️▼] │ [🎛️▼]  │  ← Controls Bar
        └─────────────────────────────────────────────┘
```

## 🎮 Control Components

### 1. Camera Toggle Button

```
┌──────────┐
│    📹    │  ← OFF State (White background, gray border)
└──────────┘
    ↓ Click
┌──────────┐
│    📹    │  ← ON State (Purple gradient, glowing)
└──────────┘
    ↓ Click
┌──────────┐
│    🚫    │  ← OFF State (Icon changes to video-slash)
└──────────┘
```

**States:**
- **Default**: White background, gray border, video icon
- **Hover**: Elevated, purple border, shadow
- **Active**: Purple gradient, white icon, glow effect
- **Disabled**: Red background, white icon

**Tooltip:**
- OFF: "Turn on camera"
- ON: "Turn off camera"

### 2. Screen Share Button

```
┌──────────┐
│    🖥️    │  ← OFF State (White background)
└──────────┘
    ↓ Click
┌──────────┐
│    🖥️    │  ← ON State (Green gradient, pulsing)
└──────────┘
    ↓ Click
┌──────────┐
│    ⏹️    │  ← ON State (Stop icon)
└──────────┘
```

**States:**
- **Default**: White background, desktop icon
- **Hover**: Elevated, purple border
- **Active**: Green gradient, pulsing glow, stop icon
- **Disabled**: Grayed out

**Tooltip:**
- OFF: "Share screen"
- ON: "Stop sharing"

### 3. Layout Mode Selector

```
┌──────────────┐
│  📐  Grid ▼  │  ← Button (shows current layout)
└──────────────┘
       ↓ Click
┌──────────────────────┐
│  📐  Grid View    ✓  │  ← Active option (purple gradient)
│  👤  Speaker View    │
│  📊  Sidebar View    │
│  🔗  Picture-in-PIP  │
└──────────────────────┘
```

**Layout Options:**
1. **Grid View** (📐 fa-th)
   - Equal-sized video feeds in grid
   - Best for 2-12 participants

2. **Speaker View** (👤 fa-user)
   - Large main feed + small thumbnails
   - Focus on active speaker

3. **Sidebar View** (📊 fa-columns)
   - Main content + video sidebar
   - Good for screen sharing

4. **Picture-in-Picture** (🔗 fa-external-link-alt)
   - Floating draggable window
   - Minimal screen space

**Interaction:**
- Click button to open dropdown
- Click option to select
- Button text updates to selection
- Active option highlighted in purple

### 4. Video Quality Settings

```
┌──────────────┐
│  ⚙️  HD ▼   │  ← Button (shows current quality)
└──────────────┘
       ↓ Click
┌─────────────────────────────┐
│  Low                        │
│  320x240, 15fps             │
├─────────────────────────────┤
│  Medium                     │
│  640x480, 24fps             │
├─────────────────────────────┤
│  High                    ✓  │  ← Active (purple gradient)
│  1280x720, 30fps            │
├─────────────────────────────┤
│  Full HD                    │
│  1920x1080, 30fps           │
├─────────────────────────────┤
│  Auto                       │
│  Adaptive quality           │
└─────────────────────────────┘
```

**Quality Presets:**
1. **Low (SD)** - 320x240, 15fps
   - Minimal bandwidth
   - Poor connections

2. **Medium (MD)** - 640x480, 24fps
   - Balanced quality
   - Default setting

3. **High (HD)** - 1280x720, 30fps
   - Good quality
   - Stable connections

4. **Full HD (FHD)** - 1920x1080, 30fps
   - Best quality
   - High bandwidth

5. **Auto** - Adaptive
   - Automatic adjustment
   - Based on network

**Quality Indicator:**
- Shows: SD / MD / HD / FHD / AUTO
- Updates when selection changes
- Visible on button

### 5. Device Selector

```
┌──────────┐
│    🎛️    │  ← Button
└──────────┘
    ↓ Click
┌─────────────────────────────────┐
│  📹 Camera                      │
│  ┌───────────────────────────┐ │
│  │ HD Webcam (Built-in)    ▼ │ │  ← Select dropdown
│  └───────────────────────────┘ │
│                                 │
│  🎤 Microphone                  │
│  ┌───────────────────────────┐ │
│  │ Default Microphone      ▼ │ │
│  └───────────────────────────┘ │
│                                 │
│  🔊 Speaker                     │
│  ┌───────────────────────────┐ │
│  │ Default Speaker         ▼ │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Device Categories:**
1. **Camera** (📹)
   - Lists all video input devices
   - Shows device labels
   - Fallback: "Camera 1", "Camera 2"

2. **Microphone** (🎤)
   - Lists all audio input devices
   - Shows device labels
   - Fallback: "Microphone 1", "Microphone 2"

3. **Speaker** (🔊)
   - Lists all audio output devices
   - Shows device labels
   - Fallback: "Default speaker"

**Features:**
- Auto-populated from MediaDevices API
- Custom styled select elements
- Device change triggers switch
- Preferences saved to localStorage

## 🎨 Visual States

### Button States

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Default │  │  Hover   │  │  Active  │  │ Disabled │
│    📹    │  │    📹    │  │    📹    │  │    📹    │
│  White   │  │ Elevated │  │  Purple  │  │   Gray   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### Dropdown States

```
Closed:                    Open:
┌──────────────┐          ┌──────────────┐
│  📐  Grid ▼  │          │  📐  Grid ▼  │
└──────────────┘          └──────────────┘
                          ┌──────────────┐
                          │  Grid    ✓   │ ← Active
                          │  Speaker     │ ← Hover
                          │  Sidebar     │
                          │  PIP         │
                          └──────────────┘
```

## 📱 Responsive Behavior

### Desktop (> 768px)
```
┌─────────────────────────────────────────────────────────┐
│  [📹] [🖥️] │ [📐 Grid ▼] [⚙️ HD ▼] │ [🎛️▼]  │
└─────────────────────────────────────────────────────────┘
     48px      Divider    Text visible    Divider
```

### Tablet (768px - 480px)
```
┌──────────────────────────────────────────────────┐
│  [📹] [🖥️]  [📐▼] [⚙️▼]  [🎛️▼]  │
└──────────────────────────────────────────────────┘
     44px     No dividers   Text hidden
```

### Mobile (< 480px)
```
┌────────────────────────────────────────┐
│  [📹] [🖥️] [📐] [⚙️] [🎛️]  │
└────────────────────────────────────────┘
     40px    Icon only    Compact
```

## 🎯 Color Scheme

### Primary Colors
- **Purple**: `#6f00ff` (Primary action)
- **Dark Purple**: `#3b0270` (Gradient end)
- **Light Purple**: `#e9b3fb` (Accents)

### State Colors
- **Active**: Purple gradient with glow
- **Success**: Green `#22c55e` (Screen share)
- **Danger**: Red `#ef4444` (Disabled)
- **Warning**: Orange `#f59e0b` (Warnings)

### Neutral Colors
- **White**: `#ffffff` (Default background)
- **Gray 50**: `#f9fafb` (Light background)
- **Gray 200**: `#e5e7eb` (Borders)
- **Gray 700**: `#374151` (Text)
- **Gray 900**: `#111827` (Dark text)

## ✨ Animations

### Button Hover
```
Default → Hover
  ↓
Transform: translateY(-2px)
Shadow: Elevated
Border: Purple
Duration: 150ms
```

### Dropdown Open
```
Closed → Opening
  ↓
Opacity: 0 → 1
Transform: translateY(10px) → translateY(0)
Duration: 200ms
Easing: ease
```

### Active State Glow
```
Screen Share Active:
  ↓
Box-shadow: 0 0 20px rgba(34, 197, 94, 0.3)
Animation: pulse-glow 2s infinite
  ↓
0%: shadow 20px
50%: shadow 30px
100%: shadow 20px
```

## ⌨️ Keyboard Shortcuts

```
┌─────┐
│  V  │  → Toggle Camera
└─────┘

┌─────┐
│  S  │  → Toggle Screen Share
└─────┘

┌─────┐
│  L  │  → Cycle Layout Mode
└─────┘
```

**Conditions:**
- Only active when not in input field
- No modifier keys required
- Case insensitive

## 🌙 Dark Mode

### Light Mode
```
┌──────────────────────────────────┐
│  White background                │
│  Gray borders                    │
│  Dark text                       │
└──────────────────────────────────┘
```

### Dark Mode
```
┌──────────────────────────────────┐
│  Dark background (#141414)       │
│  Dark borders (#404040)          │
│  Light text (#ffffff)            │
└──────────────────────────────────┘
```

**Automatic Switching:**
- Follows system preference
- Maintains contrast ratios
- Adjusts all components
- Smooth transitions

## 🎭 Tooltip Display

```
        ┌─────────────────┐
        │ Turn on camera  │  ← Tooltip
        └────────┬────────┘
                 │
            ┌────▼────┐
            │    📹   │  ← Button
            └─────────┘
```

**Behavior:**
- Appears on hover
- Positioned above button
- Dark background
- White text
- Small padding
- Rounded corners
- Fade in/out

## 📊 Component Hierarchy

```
VideoControlsUI
├── Controls Bar (container)
│   ├── Camera Button
│   │   └── Icon (fa-video / fa-video-slash)
│   ├── Screen Share Button
│   │   └── Icon (fa-desktop / fa-stop-circle)
│   ├── Divider
│   ├── Layout Selector
│   │   ├── Button
│   │   │   ├── Icon (fa-th / fa-user / fa-columns / fa-external-link-alt)
│   │   │   └── Text (Grid / Speaker / Sidebar / PIP)
│   │   └── Dropdown
│   │       ├── Grid Option
│   │       ├── Speaker Option
│   │       ├── Sidebar Option
│   │       └── PIP Option
│   ├── Quality Settings
│   │   ├── Button
│   │   │   ├── Icon (fa-cog)
│   │   │   └── Indicator (SD / MD / HD / FHD / AUTO)
│   │   └── Dropdown
│   │       ├── Low Option (320x240, 15fps)
│   │       ├── Medium Option (640x480, 24fps)
│   │       ├── High Option (1280x720, 30fps)
│   │       ├── Full HD Option (1920x1080, 30fps)
│   │       └── Auto Option (Adaptive)
│   ├── Divider
│   └── Device Selector
│       ├── Button (fa-sliders-h)
│       └── Dropdown
│           ├── Camera Group
│           │   ├── Label (fa-video)
│           │   └── Select
│           ├── Microphone Group
│           │   ├── Label (fa-microphone)
│           │   └── Select
│           └── Speaker Group
│               ├── Label (fa-volume-up)
│               └── Select
```

## 🎬 User Interaction Flow

### Enabling Camera
```
1. User clicks camera button
   ↓
2. Button shows loading state
   ↓
3. MediaManager requests camera permission
   ↓
4. Permission granted
   ↓
5. Camera stream starts
   ↓
6. Button updates to active state (purple)
   ↓
7. Icon changes to video
   ↓
8. Tooltip updates to "Turn off camera"
```

### Changing Layout
```
1. User clicks layout button
   ↓
2. Dropdown slides up and fades in
   ↓
3. User hovers over options (highlight)
   ↓
4. User clicks "Speaker View"
   ↓
5. Option gets active state (purple)
   ↓
6. Button text updates to "Speaker"
   ↓
7. Button icon changes to fa-user
   ↓
8. Dropdown closes
   ↓
9. Event emitted: videoControls:layoutChange
   ↓
10. VideoGrid updates layout
```

### Selecting Device
```
1. User clicks device button
   ↓
2. Dropdown opens with device lists
   ↓
3. User opens camera select
   ↓
4. User selects "HD Webcam"
   ↓
5. MediaManager switches camera
   ↓
6. Video stream updates
   ↓
7. Preference saved to localStorage
```

## 🎨 Design Tokens

### Spacing
- `--space-1`: 0.25rem (4px)
- `--space-2`: 0.5rem (8px)
- `--space-3`: 0.75rem (12px)
- `--space-4`: 1rem (16px)
- `--space-6`: 1.5rem (24px)
- `--space-8`: 2rem (32px)

### Border Radius
- `--radius-base`: 0.25rem (4px)
- `--radius-lg`: 0.5rem (8px)
- `--radius-xl`: 0.75rem (12px)
- `--radius-2xl`: 1rem (16px)
- `--radius-3xl`: 1.5rem (24px)
- `--radius-full`: 9999px (circle)

### Shadows
- `--shadow-sm`: Subtle shadow
- `--shadow-md`: Medium shadow
- `--shadow-lg`: Large shadow
- `--shadow-xl`: Extra large shadow
- `--shadow-2xl`: Massive shadow

### Typography
- `--text-xs`: 0.75rem (12px)
- `--text-sm`: 0.875rem (14px)
- `--text-base`: 1rem (16px)
- `--text-lg`: 1.125rem (18px)
- `--text-xl`: 1.25rem (20px)

## 🎯 Conclusion

This visual guide demonstrates the complete UI implementation of the video controls, showing all states, interactions, and responsive behaviors. The design is consistent with TeamUp's existing interface while providing intuitive controls for video calling and screen sharing features.
