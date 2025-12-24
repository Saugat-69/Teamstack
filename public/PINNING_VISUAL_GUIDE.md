# Video Pinning Visual Guide

## Visual Elements

### 1. Pin Button (Unpinned State)
```
┌─────────────────────────────────┐
│                    [📌]  [⛶]    │  ← Pin button (gray)
│                                 │
│         Video Feed              │
│                                 │
│  User Name                      │
└─────────────────────────────────┘
```

### 2. Pin Button (Pinned State)
```
┌═════════════════════════════════┐  ← Yellow border glow
║                    [📌]  [⛶]    ║  ← Pin button (yellow/active)
║                                 ║
║         Video Feed              ║
║                                 ║
║  User Name              (📌)    ║  ← Pin badge
└═════════════════════════════════┘
```

## Pin Indicator Badge

The pin badge appears in the bottom-right corner when a feed is pinned:

```
     ┌──────┐
     │  📌  │  ← 32x32px circular badge
     └──────┘
     
- Background: Yellow (#eab308)
- Border: 2px white
- Icon: Thumbtack
- Animation: Pop effect
```

## Layout Prioritization

### Grid Layout (4 participants, 2 pinned)

**Before Pinning:**
```
┌─────────┬─────────┐
│ User 1  │ User 2  │
├─────────┼─────────┤
│ User 3  │ User 4  │
└─────────┴─────────┘
```

**After Pinning User 3 and User 4:**
```
┌─────────┬─────────┐
│ User 3  │ User 4  │  ← Pinned feeds appear first
│  (📌)   │  (📌)   │
├─────────┼─────────┤
│ User 1  │ User 2  │
└─────────┴─────────┘
```

### Speaker Layout (4 participants, 1 pinned)

**Before Pinning:**
```
┌─────────────────────────────────┐
│                                 │
│         User 1 (Main)           │
│                                 │
├─────────┬─────────┬─────────────┤
│ User 2  │ User 3  │   User 4    │
└─────────┴─────────┴─────────────┘
```

**After Pinning User 3:**
```
┌─────────────────────────────────┐
│                                 │
│      User 3 (Main) (📌)         │  ← Pinned feed becomes main
│                                 │
├─────────┬─────────┬─────────────┤
│ User 1  │ User 2  │   User 4    │
└─────────┴─────────┴─────────────┘
```

## Color Scheme

### Unpinned State
- Pin button background: `rgba(0, 0, 0, 0.7)` (dark gray)
- Pin button border: `rgba(255, 255, 255, 0.2)` (light gray)
- Pin button icon: `white`

### Pinned State
- Feed border: `#eab308` (yellow) - 3px glow
- Pin button background: `#eab308` (yellow)
- Pin button border: `#eab308` (yellow)
- Pin badge background: `#eab308` (yellow)
- Pin badge border: `white` (2px)

## Hover States

### Unpinned Feed Hover
```
┌─────────────────────────────────┐
│ [📌] [⛶]                        │  ← Buttons visible
│                                 │
│         Video Feed              │
│                                 │
│  User Name                      │
└─────────────────────────────────┘
```

### Pinned Feed Hover
```
┌═════════════════════════════════┐
║ [📌] [⛶]                        ║  ← Buttons visible
║                                 ║
║         Video Feed              ║
║                                 ║
║  User Name              (📌)    ║  ← Badge always visible
└═════════════════════════════════┘
```

## Animation Sequence

### Pin Animation
```
1. User clicks pin button
   ↓
2. Border glow appears (fade in 0.3s)
   ↓
3. Pin badge pops in:
   - Scale: 0 → 1.2 → 1
   - Rotate: -45° → 5° → 0°
   - Duration: 0.3s
   ↓
4. Pin button changes to yellow (0.2s)
   ↓
5. Layout updates (0.3s transition)
```

### Unpin Animation
```
1. User clicks pin button
   ↓
2. Border glow fades out (0.3s)
   ↓
3. Pin badge fades out (0.3s)
   ↓
4. Pin button returns to gray (0.2s)
   ↓
5. Layout updates (0.3s transition)
```

## Pin Limit Indicator

When attempting to pin a 5th feed:

```
Console Output:
⚠️ Maximum of 4 feeds can be pinned

No visual change occurs
Pin button remains in unpinned state
```

## Responsive Behavior

### Desktop (>1024px)
- Pin button: 36x36px
- Pin badge: 32x32px
- Border glow: 3px

### Tablet (768px - 1024px)
- Pin button: 32x32px
- Pin badge: 28x28px
- Border glow: 2px

### Mobile (<768px)
- Pin button: 28x28px
- Pin badge: 24x24px
- Border glow: 2px

## Accessibility

### Keyboard Navigation
- Tab to focus video feed
- Enter/Space to toggle pin
- Visual focus indicator (2px outline)

### Screen Reader
- Pin button: "Pin video" / "Unpin video"
- Pin badge: "Pinned"
- Feed state: "Video feed pinned" / "Video feed unpinned"

### Reduced Motion
When `prefers-reduced-motion` is enabled:
- No pop animation on pin badge
- Instant appearance/disappearance
- No border glow animation
- Layout changes without transition

## Dark Mode

### Unpinned State
- Pin button background: `rgba(255, 255, 255, 0.1)`
- Pin button border: `rgba(255, 255, 255, 0.2)`

### Pinned State
- Same yellow colors as light mode
- Pin badge maintains white border for contrast

## Icon Reference

All icons use Font Awesome 6:
- Pin button: `fa-thumbtack` (📌)
- Fullscreen button: `fa-expand` (⛶)
- Connection indicator: `fa-signal` (📶)

## CSS Classes

```css
/* Feed states */
.video-feed              /* Normal feed */
.video-feed.pinned       /* Pinned feed */

/* Pin button states */
.pin-btn                 /* Normal pin button */
.pin-btn.active          /* Active (pinned) state */

/* Pin indicator */
.pin-indicator           /* Badge (hidden by default) */
.pinned .pin-indicator   /* Badge (visible when pinned) */
```

## Testing Checklist

Visual verification checklist:

- [ ] Pin button appears on hover
- [ ] Pin button has thumbtack icon
- [ ] Clicking pin button adds yellow border
- [ ] Pin badge appears in bottom-right
- [ ] Pin badge has pop animation
- [ ] Pin button turns yellow when active
- [ ] Pinned feeds appear first in grid
- [ ] Pinned feed becomes main in speaker view
- [ ] Unpinning removes all indicators
- [ ] Maximum 4 feeds can be pinned
- [ ] Pin state persists across layout changes
- [ ] Animations are smooth (60fps)
- [ ] Reduced motion is respected
- [ ] Dark mode colors are correct

## Conclusion

The video pinning feature provides clear, intuitive visual feedback through:
- Prominent yellow border glow
- Animated pin badge
- Active button state
- Layout prioritization

All visual elements are designed to be:
- Immediately recognizable
- Accessible to all users
- Performant and smooth
- Consistent across devices
