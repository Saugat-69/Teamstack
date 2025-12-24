# Connection Quality Monitoring Implementation

## Overview

The Connection Quality Monitoring system provides real-time monitoring of video connection quality, displays warnings for poor connections, detects frame rate and packet loss issues, implements automatic quality reduction on bandwidth problems, and provides troubleshooting suggestions.

**Requirements Implemented:** 12.1, 12.2, 12.3, 12.4, 12.5

## Features

### 1. Real-time Quality Monitoring (Requirement 12.1)
- Monitors video metrics using RTCPeerConnection.getStats()
- Tracks bitrate, packet loss, frame rate, jitter, and round-trip time
- Calculates connection quality levels (excellent, good, fair, poor)
- Updates metrics every 2 seconds by default
- Maintains metrics history for trend analysis

### 2. Quality Warning Indicators (Requirement 12.2)
- Displays visual warnings on video feeds with poor connections
- Shows warning icon on connection indicator
- Adds warning border and overlay to affected video feeds
- Tracks consecutive poor readings before triggering warnings
- Provides warning callbacks for custom handling

### 3. Connection Strength Indicators (Requirement 12.3)
- Per-participant connection quality indicators
- Color-coded quality levels:
  - **Excellent**: Green (≥2 Mbps, ≤1% packet loss, ≥28 fps)
  - **Good**: Blue (≥1 Mbps, ≤3% packet loss, ≥24 fps)
  - **Fair**: Yellow (≥400 kbps, ≤5% packet loss, ≥20 fps)
  - **Poor**: Red (< 400 kbps, >5% packet loss, <20 fps)
- Signal strength bars visualization
- Hover tooltips with detailed quality information

### 4. Automatic Quality Reduction (Requirement 12.4)
- Monitors bandwidth and adjusts quality automatically
- Triggers after 3 consecutive poor readings (configurable)
- Integrates with QualityController for seamless quality changes
- Implements cooldown period to prevent rapid adjustments
- Logs all automatic quality changes

### 5. Troubleshooting Suggestions (Requirement 12.5)
- Context-aware troubleshooting panel
- Detects specific issues:
  - Low bandwidth
  - High packet loss
  - Low frame rate
  - High latency
  - High jitter
- Provides actionable suggestions for each issue
- Beautiful modal interface with categorized suggestions
- Can be triggered manually or automatically

## Architecture

### ConnectionQualityMonitor Class

Main class that coordinates quality monitoring across all peer connections.

```javascript
const monitor = new ConnectionQualityMonitor({
  monitoringInterval: 2000,        // Check quality every 2 seconds
  warningThreshold: 3,             // Show warning after 3 poor readings
  autoQualityReduction: true       // Enable automatic quality adjustment
});
```

**Key Methods:**
- `addPeerMonitor(userId, qualityController, videoFeedElement)` - Start monitoring a peer
- `removePeerMonitor(userId)` - Stop monitoring a peer
- `updateConnectionIndicator(userId, quality)` - Update visual indicator
- `showTroubleshootingPanel(userId)` - Display troubleshooting suggestions
- `getGlobalMetrics()` - Get overall connection metrics
- `getPeerMetrics(userId)` - Get metrics for specific peer

### PeerQualityMonitor Class

Monitors quality for a single peer connection.

**Key Methods:**
- `startMonitoring()` - Begin quality checks
- `stopMonitoring()` - End quality checks
- `checkQuality()` - Perform quality check and update warnings
- `detectIssues(metrics)` - Identify specific connection issues
- `triggerQualityReduction(metrics)` - Initiate automatic quality reduction

## Quality Thresholds

```javascript
const QUALITY_THRESHOLDS = {
  excellent: {
    minBitrate: 2000000,      // 2 Mbps
    maxPacketLoss: 0.01,      // 1%
    minFrameRate: 28,
    maxJitter: 0.03,          // 30ms
    maxRTT: 0.15              // 150ms
  },
  good: {
    minBitrate: 1000000,      // 1 Mbps
    maxPacketLoss: 0.03,      // 3%
    minFrameRate: 24,
    maxJitter: 0.05,          // 50ms
    maxRTT: 0.25              // 250ms
  },
  fair: {
    minBitrate: 400000,       // 400 kbps
    maxPacketLoss: 0.05,      // 5%
    minFrameRate: 20,
    maxJitter: 0.08,          // 80ms
    maxRTT: 0.40              // 400ms
  },
  poor: {
    minBitrate: 0,
    maxPacketLoss: 0.10,      // 10%
    minFrameRate: 15,
    maxJitter: 0.15,          // 150ms
    maxRTT: 0.60              // 600ms
  }
};
```

## Integration with Existing Code

### 1. Integration with MediaManager

```javascript
// In MediaManager, when creating peer connections
const peerConnection = new MediaPeerConnection(userId, localStreams, isInitiator, socket);

// Create quality controller
const qualityController = new QualityController(peerConnection, userId);
qualityController.enableAutoQuality();

// Add to connection quality monitor
const videoFeedElement = document.getElementById(`feed-${userId}`);
connectionMonitor.addPeerMonitor(userId, qualityController, videoFeedElement);
```

### 2. Integration with VideoGridLayout

```javascript
// When adding video feed
addVideoFeed(userId, stream, metadata) {
  const videoFeed = this.createVideoFeedElement(userId, stream, metadata);
  
  // Add connection quality indicator
  const indicator = videoFeed.querySelector('.connection-indicator');
  
  // Monitor will update this indicator automatically
  
  return videoFeed;
}
```

### 3. Integration with QualityController

The ConnectionQualityMonitor works seamlessly with the existing QualityController:

```javascript
// Quality controller monitors stats
await qualityController.monitorStats();

// Connection monitor reads metrics
const metrics = qualityController.getQualityMetrics();

// Connection monitor triggers auto-adjustment
if (poorConnection) {
  await qualityController.adjustForBandwidth(metrics.bitrate);
}
```

## Usage Examples

### Basic Setup

```javascript
// Create connection quality monitor
const connectionMonitor = new ConnectionQualityMonitor({
  monitoringInterval: 2000,
  warningThreshold: 3,
  autoQualityReduction: true
});

// Add peer monitoring
connectionMonitor.addPeerMonitor(
  'user123',
  qualityController,
  videoFeedElement
);

// Listen for warnings
connectionMonitor.onWarning((event) => {
  if (event.type === 'warning-added') {
    console.log(`Warning: ${event.warningType} for ${event.userId}`);
    
    // Optionally show notification
    showNotification(`Connection quality degraded for ${event.userId}`);
  }
});
```

### Manual Troubleshooting

```javascript
// Show troubleshooting panel for specific user
document.getElementById('help-btn').addEventListener('click', () => {
  connectionMonitor.showTroubleshootingPanel('user123');
});

// Show troubleshooting for all users with issues
document.getElementById('global-help-btn').addEventListener('click', () => {
  connectionMonitor.showTroubleshootingPanel();
});
```

### Getting Metrics

```javascript
// Get global metrics
const globalMetrics = connectionMonitor.getGlobalMetrics();
console.log('Overall quality:', globalMetrics.overallQuality);
console.log('Average bitrate:', globalMetrics.averageBitrate);

// Get peer-specific metrics
const peerMetrics = connectionMonitor.getPeerMetrics('user123');
console.log('User quality:', peerMetrics.connectionQuality);
console.log('Packet loss:', peerMetrics.packetLoss);
```

### Custom Warning Handling

```javascript
connectionMonitor.onWarning((event) => {
  if (event.type === 'warning-added') {
    // Add custom warning badge
    const badge = document.createElement('div');
    badge.className = 'quality-warning-badge';
    badge.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      Poor connection
    `;
    
    const videoFeed = document.getElementById(`feed-${event.userId}`);
    videoFeed.appendChild(badge);
  } else if (event.type === 'warning-cleared') {
    // Remove warning badge
    const videoFeed = document.getElementById(`feed-${event.userId}`);
    const badge = videoFeed.querySelector('.quality-warning-badge');
    if (badge) badge.remove();
  }
});
```

## Troubleshooting Suggestions

The system provides context-aware suggestions for common issues:

### Low Bandwidth
- Close other applications using the internet
- Disable video to reduce bandwidth usage
- Switch to a wired connection if possible
- Reduce video quality in settings
- Ask others to disable their video temporarily

### High Packet Loss
- Check your network connection
- Move closer to your WiFi router
- Switch to a wired connection
- Restart your router
- Contact your network administrator

### Low Frame Rate
- Close other applications to free up CPU
- Reduce video quality settings
- Update your browser to the latest version
- Check if hardware acceleration is enabled
- Reduce the number of video participants

### High Latency
- Check your internet connection speed
- Switch to a wired connection
- Close bandwidth-intensive applications
- Contact your internet service provider
- Try connecting from a different location

### High Jitter
- Check for network interference
- Move closer to your WiFi router
- Switch to a wired connection
- Reduce other network activity
- Restart your network equipment

## Visual Indicators

### Connection Quality Indicator

Located in the top-right corner of each video feed:

- **Excellent** (Green): 4 signal bars, solid green background
- **Good** (Blue): 3 signal bars, solid blue background
- **Fair** (Yellow): 2 signal bars, solid yellow background
- **Poor** (Red): 1 signal bar, pulsing red background with warning icon

### Warning State

When connection quality is poor:
- Video feed gets red border
- Red overlay appears on video
- Connection indicator shows warning icon
- Warning badge appears with "Poor connection" text

### Troubleshooting Panel

Modal panel with:
- Header with close button
- List of detected issues
- Color-coded severity (warning/error)
- Actionable suggestions for each issue
- Smooth animations and transitions

## Performance Considerations

1. **Monitoring Interval**: Default 2 seconds balances responsiveness and performance
2. **Metrics History**: Limited to 10 entries per peer to prevent memory issues
3. **Warning Threshold**: Requires 3 consecutive poor readings to avoid false positives
4. **Cooldown Period**: 5 seconds between automatic quality adjustments
5. **Efficient DOM Updates**: Only updates changed indicators, not all elements

## Browser Compatibility

- **Chrome/Edge**: Full support for getStats() API
- **Firefox**: Full support with slightly different stats format
- **Safari**: Partial support, some metrics may be unavailable
- **Mobile Browsers**: Full support on modern mobile browsers

## Testing

Use the test page at `/connection-quality-test.html` to:
- Simulate different connection qualities
- Test warning indicators
- View troubleshooting suggestions
- Monitor metrics in real-time
- Test automatic quality reduction

## Configuration Options

```javascript
const monitor = new ConnectionQualityMonitor({
  // How often to check quality (milliseconds)
  monitoringInterval: 2000,
  
  // Number of consecutive poor readings before warning
  warningThreshold: 3,
  
  // Enable automatic quality reduction
  autoQualityReduction: true
});
```

## API Reference

### ConnectionQualityMonitor

#### Constructor
```javascript
new ConnectionQualityMonitor(options)
```

#### Methods
- `addPeerMonitor(userId, qualityController, videoFeedElement)` - Add peer to monitor
- `removePeerMonitor(userId)` - Remove peer from monitoring
- `updateConnectionIndicator(userId, quality)` - Update quality indicator
- `showTroubleshootingPanel(userId?)` - Show troubleshooting suggestions
- `hideTroubleshootingPanel()` - Hide troubleshooting panel
- `getGlobalMetrics()` - Get overall connection metrics
- `getPeerMetrics(userId)` - Get peer-specific metrics
- `onWarning(callback)` - Register warning event callback
- `destroy()` - Cleanup and destroy monitor

### PeerQualityMonitor

#### Methods
- `startMonitoring()` - Start quality checks
- `stopMonitoring()` - Stop quality checks
- `checkQuality()` - Perform immediate quality check
- `getMetrics()` - Get current metrics

## Best Practices

1. **Initialize Early**: Create ConnectionQualityMonitor when setting up video calls
2. **Clean Up**: Always call `removePeerMonitor()` when peers disconnect
3. **Handle Warnings**: Implement custom warning handlers for better UX
4. **Test Thoroughly**: Use the test page to verify behavior under different conditions
5. **Monitor Performance**: Watch for performance impact with many peers
6. **Provide Feedback**: Show users when quality is being adjusted automatically

## Future Enhancements

- Network bandwidth estimation
- Predictive quality adjustment
- Historical quality graphs
- Export quality reports
- Custom quality thresholds per user
- Integration with analytics

## Requirements Validation

✅ **12.1**: Monitors video stream quality metrics including frame rate and packet loss  
✅ **12.2**: Displays warning indicators when video quality degrades  
✅ **12.3**: Shows connection strength indicators for each video participant  
✅ **12.4**: Automatically reduces video quality when bandwidth is insufficient  
✅ **12.5**: Provides troubleshooting suggestions for poor video quality
