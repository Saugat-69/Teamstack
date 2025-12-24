/**
 * ConnectionQualityMonitor - Real-time connection quality monitoring for TeamUp
 * Monitors video metrics, displays warnings, and provides troubleshooting suggestions
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

console.log('📜 connection-quality-monitor.js loading...');

// Quality thresholds for warnings (renamed to avoid conflict with quality-controller.js)
const CONNECTION_QUALITY_THRESHOLDS = {
  excellent: {
    minBitrate: 2000000, // 2 Mbps
    maxPacketLoss: 0.01, // 1%
    minFrameRate: 28,
    maxJitter: 0.03, // 30ms
    maxRTT: 0.15 // 150ms
  },
  good: {
    minBitrate: 1000000, // 1 Mbps
    maxPacketLoss: 0.03, // 3%
    minFrameRate: 24,
    maxJitter: 0.05, // 50ms
    maxRTT: 0.25 // 250ms
  },
  fair: {
    minBitrate: 400000, // 400 kbps
    maxPacketLoss: 0.05, // 5%
    minFrameRate: 20,
    maxJitter: 0.08, // 80ms
    maxRTT: 0.40 // 400ms
  },
  poor: {
    minBitrate: 0,
    maxPacketLoss: 0.10, // 10%
    minFrameRate: 15,
    maxJitter: 0.15, // 150ms
    maxRTT: 0.60 // 600ms
  }
};

// Troubleshooting suggestions based on issues
const TROUBLESHOOTING_SUGGESTIONS = {
  lowBitrate: {
    title: 'Low Bandwidth Detected',
    icon: 'fa-tachometer-alt',
    severity: 'warning',
    suggestions: [
      'Close other applications using the internet',
      'Disable video to reduce bandwidth usage',
      'Switch to a wired connection if possible',
      'Reduce video quality in settings',
      'Ask others to disable their video temporarily'
    ]
  },
  highPacketLoss: {
    title: 'High Packet Loss',
    icon: 'fa-exclamation-triangle',
    severity: 'error',
    suggestions: [
      'Check your network connection',
      'Move closer to your WiFi router',
      'Switch to a wired connection',
      'Restart your router',
      'Contact your network administrator'
    ]
  },
  lowFrameRate: {
    title: 'Low Frame Rate',
    icon: 'fa-film',
    severity: 'warning',
    suggestions: [
      'Close other applications to free up CPU',
      'Reduce video quality settings',
      'Update your browser to the latest version',
      'Check if hardware acceleration is enabled',
      'Reduce the number of video participants'
    ]
  },
  highLatency: {
    title: 'High Latency',
    icon: 'fa-clock',
    severity: 'warning',
    suggestions: [
      'Check your internet connection speed',
      'Switch to a wired connection',
      'Close bandwidth-intensive applications',
      'Contact your internet service provider',
      'Try connecting from a different location'
    ]
  },
  highJitter: {
    title: 'Unstable Connection',
    icon: 'fa-wave-square',
    severity: 'warning',
    suggestions: [
      'Check for network interference',
      'Move closer to your WiFi router',
      'Switch to a wired connection',
      'Reduce other network activity',
      'Restart your network equipment'
    ]
  }
};

class ConnectionQualityMonitor {
  /**
   * Create a ConnectionQualityMonitor instance
   * Requirements: 12.1
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      monitoringInterval: options.monitoringInterval || 2000, // 2 seconds
      warningThreshold: options.warningThreshold || 3, // Show warning after 3 consecutive poor readings
      autoQualityReduction: options.autoQualityReduction !== false, // Enabled by default
      ...options
    };
    
    // Monitoring state
    this.peerMonitors = new Map(); // userId -> PeerQualityMonitor
    this.globalMetrics = {
      averageBitrate: 0,
      averagePacketLoss: 0,
      averageFrameRate: 0,
      averageLatency: 0,
      overallQuality: 'unknown'
    };
    
    // Warning state
    this.activeWarnings = new Map(); // userId -> Set of warning types
    this.warningCallbacks = [];
    
    // UI elements
    this.warningContainer = null;
    this.troubleshootingPanel = null;
    
    console.log('✅ ConnectionQualityMonitor initialized');
  }

  /**
   * Add a peer connection to monitor
   * Requirements: 12.1, 12.3
   * 
   * @param {string} userId - User ID
   * @param {QualityController} qualityController - Quality controller for this peer
   * @param {HTMLElement} videoFeedElement - Video feed element for this peer
   */
  addPeerMonitor(userId, qualityController, videoFeedElement) {
    try {
      console.log(`📊 Adding peer monitor for user ${userId}`);
      
      if (this.peerMonitors.has(userId)) {
        console.warn(`⚠️ Peer monitor for user ${userId} already exists`);
        return;
      }
      
      const peerMonitor = new PeerQualityMonitor(
        userId,
        qualityController,
        videoFeedElement,
        this
      );
      
      this.peerMonitors.set(userId, peerMonitor);
      
      // Start monitoring
      peerMonitor.startMonitoring();
      
      console.log(`✅ Peer monitor added for user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to add peer monitor for user ${userId}:`, error);
    }
  }

  /**
   * Remove a peer monitor
   * Requirements: 12.1
   * 
   * @param {string} userId - User ID
   */
  removePeerMonitor(userId) {
    try {
      console.log(`📊 Removing peer monitor for user ${userId}`);
      
      const peerMonitor = this.peerMonitors.get(userId);
      if (!peerMonitor) {
        console.warn(`⚠️ Peer monitor for user ${userId} not found`);
        return;
      }
      
      // Stop monitoring
      peerMonitor.stopMonitoring();
      
      // Remove from map
      this.peerMonitors.delete(userId);
      
      // Clear warnings for this peer
      this.clearWarningsForPeer(userId);
      
      console.log(`✅ Peer monitor removed for user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to remove peer monitor for user ${userId}:`, error);
    }
  }

  /**
   * Update global metrics based on all peer monitors
   * Requirements: 12.1
   */
  updateGlobalMetrics() {
    if (this.peerMonitors.size === 0) {
      this.globalMetrics = {
        averageBitrate: 0,
        averagePacketLoss: 0,
        averageFrameRate: 0,
        averageLatency: 0,
        overallQuality: 'unknown'
      };
      return;
    }
    
    let totalBitrate = 0;
    let totalPacketLoss = 0;
    let totalFrameRate = 0;
    let totalLatency = 0;
    let qualityScores = { excellent: 0, good: 0, fair: 0, poor: 0, unknown: 0 };
    
    this.peerMonitors.forEach(peerMonitor => {
      const metrics = peerMonitor.getMetrics();
      totalBitrate += metrics.bitrate;
      totalPacketLoss += metrics.packetLoss;
      totalFrameRate += metrics.frameRate;
      totalLatency += metrics.roundTripTime;
      qualityScores[metrics.connectionQuality]++;
    });
    
    const count = this.peerMonitors.size;
    
    this.globalMetrics = {
      averageBitrate: totalBitrate / count,
      averagePacketLoss: totalPacketLoss / count,
      averageFrameRate: totalFrameRate / count,
      averageLatency: totalLatency / count,
      overallQuality: this.calculateOverallQuality(qualityScores)
    };
  }

  /**
   * Calculate overall quality from individual peer qualities
   * Requirements: 12.1
   * 
   * @param {Object} qualityScores - Count of each quality level
   * @returns {string} Overall quality level
   */
  calculateOverallQuality(qualityScores) {
    // If any peer has poor quality, overall is poor
    if (qualityScores.poor > 0) return 'poor';
    
    // If more than half have fair quality, overall is fair
    const total = Object.values(qualityScores).reduce((a, b) => a + b, 0);
    if (qualityScores.fair > total / 2) return 'fair';
    
    // If any peer has fair quality, overall is fair
    if (qualityScores.fair > 0) return 'fair';
    
    // If all are good or excellent, overall is good
    if (qualityScores.good > 0 || qualityScores.excellent > 0) return 'good';
    
    return 'unknown';
  }

  /**
   * Register a warning for a peer
   * Requirements: 12.2
   * 
   * @param {string} userId - User ID
   * @param {string} warningType - Type of warning
   * @param {Object} metrics - Current metrics
   */
  registerWarning(userId, warningType, metrics) {
    if (!this.activeWarnings.has(userId)) {
      this.activeWarnings.set(userId, new Set());
    }
    
    const userWarnings = this.activeWarnings.get(userId);
    const wasEmpty = userWarnings.size === 0;
    
    userWarnings.add(warningType);
    
    // Notify callbacks
    this.warningCallbacks.forEach(callback => {
      callback({
        type: 'warning-added',
        userId,
        warningType,
        metrics
      });
    });
    
    // Show warning UI if this is the first warning for this user
    if (wasEmpty) {
      this.showWarningForPeer(userId, warningType, metrics);
    }
  }

  /**
   * Clear a warning for a peer
   * Requirements: 12.2
   * 
   * @param {string} userId - User ID
   * @param {string} warningType - Type of warning
   */
  clearWarning(userId, warningType) {
    const userWarnings = this.activeWarnings.get(userId);
    if (!userWarnings) return;
    
    userWarnings.delete(warningType);
    
    // Notify callbacks
    this.warningCallbacks.forEach(callback => {
      callback({
        type: 'warning-cleared',
        userId,
        warningType
      });
    });
    
    // If no more warnings, clear warning UI
    if (userWarnings.size === 0) {
      this.clearWarningForPeer(userId);
    }
  }

  /**
   * Clear all warnings for a peer
   * Requirements: 12.2
   * 
   * @param {string} userId - User ID
   */
  clearWarningsForPeer(userId) {
    const userWarnings = this.activeWarnings.get(userId);
    if (!userWarnings) return;
    
    userWarnings.forEach(warningType => {
      this.clearWarning(userId, warningType);
    });
    
    this.activeWarnings.delete(userId);
  }

  /**
   * Show warning indicator on video feed
   * Requirements: 12.2
   * 
   * @param {string} userId - User ID
   * @param {string} warningType - Type of warning
   * @param {Object} metrics - Current metrics
   */
  showWarningForPeer(userId, warningType, metrics) {
    const peerMonitor = this.peerMonitors.get(userId);
    if (!peerMonitor || !peerMonitor.videoFeedElement) return;
    
    // Add warning class to video feed
    peerMonitor.videoFeedElement.classList.add('connection-warning');
    
    // Update connection indicator
    const indicator = peerMonitor.videoFeedElement.querySelector('.connection-indicator');
    if (indicator) {
      indicator.classList.add('warning');
      indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
      indicator.title = 'Poor connection quality';
    }
  }

  /**
   * Clear warning indicator from video feed
   * Requirements: 12.2
   * 
   * @param {string} userId - User ID
   */
  clearWarningForPeer(userId) {
    const peerMonitor = this.peerMonitors.get(userId);
    if (!peerMonitor || !peerMonitor.videoFeedElement) return;
    
    // Remove warning class
    peerMonitor.videoFeedElement.classList.remove('connection-warning');
    
    // Update connection indicator
    const indicator = peerMonitor.videoFeedElement.querySelector('.connection-indicator');
    if (indicator) {
      indicator.classList.remove('warning');
      
      // Restore quality indicator
      const metrics = peerMonitor.getMetrics();
      this.updateConnectionIndicator(userId, metrics.connectionQuality);
    }
  }

  /**
   * Update connection quality indicator on video feed
   * Requirements: 12.3
   * 
   * @param {string} userId - User ID
   * @param {string} quality - Connection quality level
   */
  updateConnectionIndicator(userId, quality) {
    const peerMonitor = this.peerMonitors.get(userId);
    if (!peerMonitor || !peerMonitor.videoFeedElement) return;
    
    const indicator = peerMonitor.videoFeedElement.querySelector('.connection-indicator');
    if (!indicator) return;
    
    // Remove all quality classes
    indicator.classList.remove('excellent', 'good', 'fair', 'poor', 'warning');
    
    // Add new quality class
    indicator.classList.add(quality);
    
    // Update icon and title
    const qualityInfo = {
      excellent: { icon: 'fa-signal', text: 'Excellent connection', bars: 4 },
      good: { icon: 'fa-signal', text: 'Good connection', bars: 3 },
      fair: { icon: 'fa-signal', text: 'Fair connection', bars: 2 },
      poor: { icon: 'fa-exclamation-triangle', text: 'Poor connection', bars: 1 }
    };
    
    const info = qualityInfo[quality] || qualityInfo.good;
    indicator.innerHTML = `<i class="fas ${info.icon}"></i>`;
    indicator.title = info.text;
    indicator.dataset.quality = quality;
    indicator.dataset.bars = info.bars;
  }

  /**
   * Show troubleshooting suggestions panel
   * Requirements: 12.5
   * 
   * @param {string} userId - User ID (optional, for peer-specific suggestions)
   */
  showTroubleshootingPanel(userId = null) {
    // Remove existing panel if any
    if (this.troubleshootingPanel) {
      this.troubleshootingPanel.remove();
    }
    
    // Determine which issues to show
    const issues = this.getActiveIssues(userId);
    
    if (issues.length === 0) {
      console.log('✅ No connection issues to display');
      return;
    }
    
    // Create panel
    this.troubleshootingPanel = document.createElement('div');
    this.troubleshootingPanel.className = 'troubleshooting-panel';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'troubleshooting-header';
    header.innerHTML = `
      <h3><i class="fas fa-tools"></i> Connection Troubleshooting</h3>
      <button class="close-btn" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Close button handler
    header.querySelector('.close-btn').addEventListener('click', () => {
      this.hideTroubleshootingPanel();
    });
    
    // Create issues container
    const issuesContainer = document.createElement('div');
    issuesContainer.className = 'troubleshooting-issues';
    
    // Add each issue
    issues.forEach(issue => {
      const issueElement = this.createIssueElement(issue);
      issuesContainer.appendChild(issueElement);
    });
    
    // Assemble panel
    this.troubleshootingPanel.appendChild(header);
    this.troubleshootingPanel.appendChild(issuesContainer);
    
    // Add to document
    document.body.appendChild(this.troubleshootingPanel);
    
    // Animate in
    setTimeout(() => {
      this.troubleshootingPanel.classList.add('visible');
    }, 10);
    
    console.log('✅ Troubleshooting panel displayed');
  }

  /**
   * Hide troubleshooting suggestions panel
   * Requirements: 12.5
   */
  hideTroubleshootingPanel() {
    if (!this.troubleshootingPanel) return;
    
    this.troubleshootingPanel.classList.remove('visible');
    
    setTimeout(() => {
      if (this.troubleshootingPanel) {
        this.troubleshootingPanel.remove();
        this.troubleshootingPanel = null;
      }
    }, 300);
    
    console.log('✅ Troubleshooting panel hidden');
  }

  /**
   * Get active issues for troubleshooting
   * Requirements: 12.5
   * 
   * @param {string} userId - User ID (optional)
   * @returns {Array} Array of issue objects
   */
  getActiveIssues(userId = null) {
    const issues = [];
    const issueTypes = new Set();
    
    // Collect issues from specified user or all users
    const usersToCheck = userId ? [userId] : Array.from(this.peerMonitors.keys());
    
    usersToCheck.forEach(uid => {
      const warnings = this.activeWarnings.get(uid);
      if (warnings) {
        warnings.forEach(warningType => {
          if (!issueTypes.has(warningType)) {
            issueTypes.add(warningType);
            issues.push({
              type: warningType,
              ...TROUBLESHOOTING_SUGGESTIONS[warningType]
            });
          }
        });
      }
    });
    
    return issues;
  }

  /**
   * Create issue element for troubleshooting panel
   * Requirements: 12.5
   * 
   * @param {Object} issue - Issue object
   * @returns {HTMLElement} Issue element
   */
  createIssueElement(issue) {
    const issueElement = document.createElement('div');
    issueElement.className = `troubleshooting-issue ${issue.severity}`;
    
    // Issue header
    const issueHeader = document.createElement('div');
    issueHeader.className = 'issue-header';
    issueHeader.innerHTML = `
      <i class="fas ${issue.icon}"></i>
      <h4>${issue.title}</h4>
    `;
    
    // Suggestions list
    const suggestionsList = document.createElement('ul');
    suggestionsList.className = 'issue-suggestions';
    
    issue.suggestions.forEach(suggestion => {
      const li = document.createElement('li');
      li.innerHTML = `<i class="fas fa-check-circle"></i> ${suggestion}`;
      suggestionsList.appendChild(li);
    });
    
    issueElement.appendChild(issueHeader);
    issueElement.appendChild(suggestionsList);
    
    return issueElement;
  }

  /**
   * Register a callback for warning events
   * Requirements: 12.2
   * 
   * @param {Function} callback - Callback function
   */
  onWarning(callback) {
    this.warningCallbacks.push(callback);
  }

  /**
   * Get global metrics
   * Requirements: 12.1
   * 
   * @returns {Object} Global metrics
   */
  getGlobalMetrics() {
    this.updateGlobalMetrics();
    return this.globalMetrics;
  }

  /**
   * Get metrics for a specific peer
   * Requirements: 12.1
   * 
   * @param {string} userId - User ID
   * @returns {Object|null} Peer metrics or null
   */
  getPeerMetrics(userId) {
    const peerMonitor = this.peerMonitors.get(userId);
    return peerMonitor ? peerMonitor.getMetrics() : null;
  }

  /**
   * Destroy the connection quality monitor
   */
  destroy() {
    console.log('🗑️ Destroying ConnectionQualityMonitor');
    
    // Stop all peer monitors
    this.peerMonitors.forEach(peerMonitor => {
      peerMonitor.stopMonitoring();
    });
    
    this.peerMonitors.clear();
    this.activeWarnings.clear();
    this.warningCallbacks = [];
    
    // Remove UI elements
    this.hideTroubleshootingPanel();
    
    console.log('✅ ConnectionQualityMonitor destroyed');
  }
}

/**
 * PeerQualityMonitor - Monitors quality for a single peer connection
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */
class PeerQualityMonitor {
  constructor(userId, qualityController, videoFeedElement, parentMonitor) {
    this.userId = userId;
    this.qualityController = qualityController;
    this.videoFeedElement = videoFeedElement;
    this.parentMonitor = parentMonitor;
    
    // Monitoring state
    this.monitoringInterval = null;
    this.consecutivePoorReadings = 0;
    this.lastQuality = 'unknown';
    
    // Metrics history for trend analysis
    this.metricsHistory = [];
    this.maxHistoryLength = 10;
    
    console.log(`✅ PeerQualityMonitor created for user ${userId}`);
  }

  /**
   * Start monitoring this peer
   * Requirements: 12.1
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      console.warn(`⚠️ Monitoring already started for user ${this.userId}`);
      return;
    }
    
    console.log(`📊 Starting quality monitoring for user ${this.userId}`);
    
    // Monitor at regular intervals
    this.monitoringInterval = setInterval(() => {
      this.checkQuality();
    }, this.parentMonitor.options.monitoringInterval);
    
    // Do initial check
    this.checkQuality();
  }

  /**
   * Stop monitoring this peer
   * Requirements: 12.1
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log(`📊 Quality monitoring stopped for user ${this.userId}`);
    }
  }

  /**
   * Check connection quality and update warnings
   * Requirements: 12.1, 12.2, 12.3, 12.4
   */
  async checkQuality() {
    try {
      // Get current metrics from quality controller
      const metrics = this.qualityController.getQualityMetrics();
      
      // Store in history
      this.metricsHistory.push({
        timestamp: Date.now(),
        ...metrics
      });
      
      // Trim history
      if (this.metricsHistory.length > this.maxHistoryLength) {
        this.metricsHistory.shift();
      }
      
      // Detect issues
      const issues = this.detectIssues(metrics);
      
      // Update warnings
      this.updateWarnings(issues, metrics);
      
      // Update connection indicator
      if (metrics.connectionQuality !== this.lastQuality) {
        this.parentMonitor.updateConnectionIndicator(this.userId, metrics.connectionQuality);
        this.lastQuality = metrics.connectionQuality;
      }
      
      // Track consecutive poor readings for auto quality reduction
      if (metrics.connectionQuality === 'poor' || metrics.connectionQuality === 'fair') {
        this.consecutivePoorReadings++;
        
        // Trigger automatic quality reduction if enabled
        if (
          this.parentMonitor.options.autoQualityReduction &&
          this.consecutivePoorReadings >= this.parentMonitor.options.warningThreshold
        ) {
          await this.triggerQualityReduction(metrics);
        }
      } else {
        this.consecutivePoorReadings = 0;
      }
    } catch (error) {
      console.error(`❌ Failed to check quality for user ${this.userId}:`, error);
    }
  }

  /**
   * Detect specific issues from metrics
   * Requirements: 12.2, 12.3
   * 
   * @param {Object} metrics - Current metrics
   * @returns {Set} Set of detected issue types
   */
  detectIssues(metrics) {
    const issues = new Set();
    
    // Check bitrate
    if (metrics.bitrate < CONNECTION_QUALITY_THRESHOLDS.fair.minBitrate) {
      issues.add('lowBitrate');
    }
    
    // Check packet loss
    if (metrics.packetLoss > CONNECTION_QUALITY_THRESHOLDS.fair.maxPacketLoss) {
      issues.add('highPacketLoss');
    }
    
    // Check frame rate
    if (metrics.frameRate < CONNECTION_QUALITY_THRESHOLDS.fair.minFrameRate && metrics.frameRate > 0) {
      issues.add('lowFrameRate');
    }
    
    // Check latency (RTT)
    if (metrics.roundTripTime > CONNECTION_QUALITY_THRESHOLDS.fair.maxRTT) {
      issues.add('highLatency');
    }
    
    // Check jitter
    if (metrics.jitter > CONNECTION_QUALITY_THRESHOLDS.fair.maxJitter) {
      issues.add('highJitter');
    }
    
    return issues;
  }

  /**
   * Update warnings based on detected issues
   * Requirements: 12.2
   * 
   * @param {Set} issues - Set of detected issues
   * @param {Object} metrics - Current metrics
   */
  updateWarnings(issues, metrics) {
    // Get current warnings for this peer
    const currentWarnings = this.parentMonitor.activeWarnings.get(this.userId) || new Set();
    
    // Add new warnings
    issues.forEach(issue => {
      if (!currentWarnings.has(issue)) {
        this.parentMonitor.registerWarning(this.userId, issue, metrics);
      }
    });
    
    // Clear resolved warnings
    currentWarnings.forEach(warning => {
      if (!issues.has(warning)) {
        this.parentMonitor.clearWarning(this.userId, warning);
      }
    });
  }

  /**
   * Trigger automatic quality reduction
   * Requirements: 12.4
   * 
   * @param {Object} metrics - Current metrics
   */
  async triggerQualityReduction(metrics) {
    try {
      console.log(`📊 Triggering automatic quality reduction for user ${this.userId}`);
      
      // Let the quality controller handle the reduction
      if (this.qualityController.autoQualityEnabled) {
        await this.qualityController.adjustForBandwidth(metrics.bitrate);
      }
      
      // Reset counter after triggering
      this.consecutivePoorReadings = 0;
    } catch (error) {
      console.error(`❌ Failed to trigger quality reduction for user ${this.userId}:`, error);
    }
  }

  /**
   * Get current metrics
   * Requirements: 12.1
   * 
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return this.qualityController.getQualityMetrics();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConnectionQualityMonitor, PeerQualityMonitor, CONNECTION_QUALITY_THRESHOLDS, TROUBLESHOOTING_SUGGESTIONS };
} else if (typeof window !== 'undefined') {
  // Make available globally in browser
  window.ConnectionQualityMonitor = ConnectionQualityMonitor;
  window.PeerQualityMonitor = PeerQualityMonitor;
  window.CONNECTION_QUALITY_THRESHOLDS = CONNECTION_QUALITY_THRESHOLDS;
  window.TROUBLESHOOTING_SUGGESTIONS = TROUBLESHOOTING_SUGGESTIONS;
  console.log('✅ connection-quality-monitor.js loaded successfully, ConnectionQualityMonitor available:', typeof ConnectionQualityMonitor);
}
