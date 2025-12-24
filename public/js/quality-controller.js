/**
 * QualityController - Adaptive video quality management for TeamUp
 * Monitors connection quality and adjusts video settings dynamically
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

// Video Quality Presets with bitrate specifications
const QUALITY_PRESETS = {
  low: {
    name: 'Low (240p)',
    width: { ideal: 320 },
    height: { ideal: 240 },
    frameRate: { ideal: 15, max: 20 },
    bitrate: 150000 // 150 kbps
  },
  medium: {
    name: 'Medium (480p)',
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 24, max: 30 },
    bitrate: 500000 // 500 kbps
  },
  high: {
    name: 'High (720p)',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    bitrate: 1500000 // 1.5 Mbps
  },
  hd: {
    name: 'HD (1080p)',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
    bitrate: 3000000 // 3 Mbps
  }
};

// Quality thresholds for auto-adjustment
const QUALITY_THRESHOLDS = {
  excellent: { minBitrate: 2000000, maxPacketLoss: 0.01, minFrameRate: 28 },
  good: { minBitrate: 1000000, maxPacketLoss: 0.03, minFrameRate: 24 },
  fair: { minBitrate: 400000, maxPacketLoss: 0.05, minFrameRate: 20 },
  poor: { minBitrate: 0, maxPacketLoss: 0.10, minFrameRate: 15 }
};

class QualityController {
  /**
   * Create a QualityController instance
   * Requirements: 8.1
   * 
   * @param {MediaPeerConnection} peerConnection - The peer connection to monitor
   * @param {string} userId - User ID for this connection
   */
  constructor(peerConnection, userId) {
    if (!peerConnection || !peerConnection.pc) {
      throw new Error('Valid peer connection is required for QualityController');
    }
    
    this.peerConnection = peerConnection;
    this.pc = peerConnection.pc;
    this.userId = userId;
    
    // Quality settings
    this.currentQuality = 'medium'; // Default quality
    this.autoQualityEnabled = false;
    this.qualityPresets = QUALITY_PRESETS;
    
    // Stats monitoring
    this.statsInterval = null;
    this.statsIntervalMs = 2000; // Check stats every 2 seconds
    this.lastStats = null;
    
    // Quality metrics
    this.metrics = {
      bitrate: 0,
      packetLoss: 0,
      frameRate: 0,
      resolution: { width: 0, height: 0 },
      jitter: 0,
      roundTripTime: 0,
      connectionQuality: 'unknown'
    };
    
    // Auto-quality adjustment
    this.adjustmentCooldown = false;
    this.cooldownDuration = 5000; // 5 seconds between adjustments
    this.consecutivePoorReadings = 0;
    this.poorReadingsThreshold = 3; // Adjust after 3 consecutive poor readings
    
    // Event handlers (can be set externally)
    this.onQualityChange = null;
    this.onMetricsUpdate = null;
    
    console.log(`✅ QualityController initialized for user ${userId}`);
  }

  /**
   * Set video quality preset manually
   * Requirements: 8.1, 8.2
   * 
   * @param {string} preset - Quality preset name (low, medium, high, hd)
   * @returns {Promise<boolean>} Success status
   */
  async setQuality(preset) {
    try {
      console.log(`📊 Setting quality to: ${preset}`);
      
      // Validate preset
      if (!this.qualityPresets[preset]) {
        throw new Error(`Invalid quality preset: ${preset}. Valid options: ${Object.keys(this.qualityPresets).join(', ')}`);
      }
      
      const qualityConfig = this.qualityPresets[preset];
      
      // Get video sender from peer connection
      const senders = this.pc.getSenders();
      const videoSender = senders.find(sender => sender.track?.kind === 'video');
      
      if (!videoSender || !videoSender.track) {
        console.warn('⚠️ No video track found, quality will be applied when video is enabled');
        this.currentQuality = preset;
        return true;
      }
      
      // Apply constraints to video track
      const constraints = {
        width: qualityConfig.width,
        height: qualityConfig.height,
        frameRate: qualityConfig.frameRate
      };
      
      await videoSender.track.applyConstraints(constraints);
      
      // Apply bitrate limit using setParameters
      const parameters = videoSender.getParameters();
      if (!parameters.encodings) {
        parameters.encodings = [{}];
      }
      
      parameters.encodings[0].maxBitrate = qualityConfig.bitrate;
      await videoSender.setParameters(parameters);
      
      this.currentQuality = preset;
      
      console.log(`✅ Quality set to ${preset} (${qualityConfig.name})`);
      
      // Notify about quality change
      if (this.onQualityChange) {
        this.onQualityChange(preset, qualityConfig);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to set quality to ${preset}:`, error);
      throw error;
    }
  }

  /**
   * Enable automatic quality adjustment based on network conditions
   * Requirements: 8.2, 8.3
   * 
   * @returns {boolean} Success status
   */
  enableAutoQuality() {
    try {
      console.log('📊 Enabling automatic quality adjustment');
      
      if (this.autoQualityEnabled) {
        console.warn('⚠️ Auto quality is already enabled');
        return true;
      }
      
      this.autoQualityEnabled = true;
      
      // Start monitoring stats
      this.startMonitoring();
      
      console.log('✅ Automatic quality adjustment enabled');
      return true;
    } catch (error) {
      console.error('❌ Failed to enable auto quality:', error);
      return false;
    }
  }

  /**
   * Disable automatic quality adjustment
   * Requirements: 8.2
   * 
   * @returns {boolean} Success status
   */
  disableAutoQuality() {
    try {
      console.log('📊 Disabling automatic quality adjustment');
      
      if (!this.autoQualityEnabled) {
        console.warn('⚠️ Auto quality is already disabled');
        return true;
      }
      
      this.autoQualityEnabled = false;
      
      // Stop monitoring stats
      this.stopMonitoring();
      
      console.log('✅ Automatic quality adjustment disabled');
      return true;
    } catch (error) {
      console.error('❌ Failed to disable auto quality:', error);
      return false;
    }
  }

  /**
   * Start monitoring connection statistics
   * Requirements: 8.3, 8.4
   */
  startMonitoring() {
    if (this.statsInterval) {
      console.warn('⚠️ Stats monitoring is already running');
      return;
    }
    
    console.log('📊 Starting stats monitoring');
    
    // Monitor stats at regular intervals
    this.statsInterval = setInterval(() => {
      this.monitorStats();
    }, this.statsIntervalMs);
    
    // Do initial stats check
    this.monitorStats();
  }

  /**
   * Stop monitoring connection statistics
   * Requirements: 8.3
   */
  stopMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
      console.log('📊 Stats monitoring stopped');
    }
  }

  /**
   * Monitor connection statistics using RTCPeerConnection.getStats()
   * Requirements: 8.3, 8.4
   * 
   * @returns {Promise<Object>} Current quality metrics
   */
  async monitorStats() {
    try {
      if (!this.pc || this.pc.connectionState !== 'connected') {
        return this.metrics;
      }
      
      const stats = await this.pc.getStats();
      const currentTime = Date.now();
      
      // Parse stats and extract relevant metrics
      let inboundVideoStats = null;
      let outboundVideoStats = null;
      let candidatePairStats = null;
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          inboundVideoStats = report;
        } else if (report.type === 'outbound-rtp' && report.kind === 'video') {
          outboundVideoStats = report;
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          candidatePairStats = report;
        }
      });
      
      // Calculate metrics from inbound video stats (receiving video)
      if (inboundVideoStats) {
        // Calculate bitrate
        if (this.lastStats && this.lastStats.inbound) {
          const timeDelta = (currentTime - this.lastStats.timestamp) / 1000; // seconds
          const bytesDelta = inboundVideoStats.bytesReceived - this.lastStats.inbound.bytesReceived;
          this.metrics.bitrate = Math.round((bytesDelta * 8) / timeDelta); // bits per second
        }
        
        // Calculate packet loss
        const packetsReceived = inboundVideoStats.packetsReceived || 0;
        const packetsLost = inboundVideoStats.packetsLost || 0;
        const totalPackets = packetsReceived + packetsLost;
        this.metrics.packetLoss = totalPackets > 0 ? packetsLost / totalPackets : 0;
        
        // Get frame rate
        if (this.lastStats && this.lastStats.inbound) {
          const timeDelta = (currentTime - this.lastStats.timestamp) / 1000;
          const framesDelta = (inboundVideoStats.framesDecoded || 0) - (this.lastStats.inbound.framesDecoded || 0);
          this.metrics.frameRate = Math.round(framesDelta / timeDelta);
        }
        
        // Get resolution
        this.metrics.resolution = {
          width: inboundVideoStats.frameWidth || 0,
          height: inboundVideoStats.frameHeight || 0
        };
        
        // Get jitter
        this.metrics.jitter = inboundVideoStats.jitter || 0;
      }
      
      // Get round trip time from candidate pair
      if (candidatePairStats) {
        this.metrics.roundTripTime = candidatePairStats.currentRoundTripTime || 0;
      }
      
      // Determine connection quality
      this.metrics.connectionQuality = this.calculateConnectionQuality();
      
      // Store current stats for next calculation
      this.lastStats = {
        timestamp: currentTime,
        inbound: inboundVideoStats,
        outbound: outboundVideoStats
      };
      
      // Notify about metrics update
      if (this.onMetricsUpdate) {
        this.onMetricsUpdate(this.metrics);
      }
      
      // Adjust quality if auto-quality is enabled
      if (this.autoQualityEnabled) {
        await this.adjustForBandwidth(this.metrics.bitrate);
      }
      
      return this.metrics;
    } catch (error) {
      console.error('❌ Failed to monitor stats:', error);
      return this.metrics;
    }
  }

  /**
   * Calculate connection quality based on metrics
   * Requirements: 8.4, 12.1, 12.2
   * 
   * @returns {string} Connection quality (excellent, good, fair, poor)
   */
  calculateConnectionQuality() {
    const { bitrate, packetLoss, frameRate } = this.metrics;
    
    // Check against quality thresholds
    if (
      bitrate >= QUALITY_THRESHOLDS.excellent.minBitrate &&
      packetLoss <= QUALITY_THRESHOLDS.excellent.maxPacketLoss &&
      frameRate >= QUALITY_THRESHOLDS.excellent.minFrameRate
    ) {
      return 'excellent';
    } else if (
      bitrate >= QUALITY_THRESHOLDS.good.minBitrate &&
      packetLoss <= QUALITY_THRESHOLDS.good.maxPacketLoss &&
      frameRate >= QUALITY_THRESHOLDS.good.minFrameRate
    ) {
      return 'good';
    } else if (
      bitrate >= QUALITY_THRESHOLDS.fair.minBitrate &&
      packetLoss <= QUALITY_THRESHOLDS.fair.maxPacketLoss &&
      frameRate >= QUALITY_THRESHOLDS.fair.minFrameRate
    ) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Adjust video quality based on available bandwidth
   * Requirements: 8.3, 8.4, 8.5
   * 
   * @param {number} availableBandwidth - Available bandwidth in bits per second
   * @returns {Promise<boolean>} Success status
   */
  async adjustForBandwidth(availableBandwidth) {
    try {
      // Don't adjust if in cooldown period
      if (this.adjustmentCooldown) {
        return false;
      }
      
      // Don't adjust if auto-quality is disabled
      if (!this.autoQualityEnabled) {
        return false;
      }
      
      const quality = this.metrics.connectionQuality;
      
      // Track consecutive poor readings
      if (quality === 'poor' || quality === 'fair') {
        this.consecutivePoorReadings++;
      } else {
        this.consecutivePoorReadings = 0;
      }
      
      // Only adjust after threshold of consecutive poor readings
      if (this.consecutivePoorReadings < this.poorReadingsThreshold) {
        return false;
      }
      
      console.log(`📊 Adjusting quality based on bandwidth: ${Math.round(availableBandwidth / 1000)} kbps, quality: ${quality}`);
      
      let targetQuality = this.currentQuality;
      
      // Determine target quality based on available bandwidth and current quality
      if (quality === 'poor' || quality === 'fair') {
        // Downgrade quality
        if (this.currentQuality === 'hd') {
          targetQuality = 'high';
        } else if (this.currentQuality === 'high') {
          targetQuality = 'medium';
        } else if (this.currentQuality === 'medium') {
          targetQuality = 'low';
        }
        // Already at lowest quality, can't downgrade further
      } else if (quality === 'excellent') {
        // Upgrade quality if bandwidth allows
        if (this.currentQuality === 'low' && availableBandwidth >= QUALITY_PRESETS.medium.bitrate * 1.5) {
          targetQuality = 'medium';
        } else if (this.currentQuality === 'medium' && availableBandwidth >= QUALITY_PRESETS.high.bitrate * 1.5) {
          targetQuality = 'high';
        } else if (this.currentQuality === 'high' && availableBandwidth >= QUALITY_PRESETS.hd.bitrate * 1.5) {
          targetQuality = 'hd';
        }
      }
      
      // Apply quality change if different from current
      if (targetQuality !== this.currentQuality) {
        console.log(`📊 Auto-adjusting quality from ${this.currentQuality} to ${targetQuality}`);
        
        await this.setQuality(targetQuality);
        
        // Reset consecutive poor readings counter
        this.consecutivePoorReadings = 0;
        
        // Set cooldown to prevent rapid adjustments
        this.adjustmentCooldown = true;
        setTimeout(() => {
          this.adjustmentCooldown = false;
        }, this.cooldownDuration);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to adjust quality for bandwidth:', error);
      return false;
    }
  }

  /**
   * Get current quality metrics
   * Requirements: 8.4, 8.5
   * 
   * @returns {Object} Current quality metrics
   */
  getQualityMetrics() {
    return {
      ...this.metrics,
      currentQuality: this.currentQuality,
      qualityName: this.qualityPresets[this.currentQuality]?.name || 'Unknown',
      autoQualityEnabled: this.autoQualityEnabled
    };
  }

  /**
   * Get formatted quality metrics for display
   * Requirements: 8.5
   * 
   * @returns {Object} Formatted metrics for UI display
   */
  getFormattedMetrics() {
    const metrics = this.getQualityMetrics();
    
    return {
      quality: metrics.qualityName,
      bitrate: `${Math.round(metrics.bitrate / 1000)} kbps`,
      resolution: `${metrics.resolution.width}x${metrics.resolution.height}`,
      frameRate: `${metrics.frameRate} fps`,
      packetLoss: `${(metrics.packetLoss * 100).toFixed(2)}%`,
      jitter: `${(metrics.jitter * 1000).toFixed(2)} ms`,
      roundTripTime: `${(metrics.roundTripTime * 1000).toFixed(0)} ms`,
      connectionQuality: metrics.connectionQuality,
      autoQuality: metrics.autoQualityEnabled ? 'Enabled' : 'Disabled'
    };
  }

  /**
   * Create quality metrics UI element
   * Requirements: 8.5
   * 
   * @returns {HTMLElement} Quality metrics display element
   */
  createMetricsDisplay() {
    const container = document.createElement('div');
    container.className = 'quality-metrics-display';
    container.dataset.userId = this.userId;
    
    // Title
    const title = document.createElement('div');
    title.className = 'metrics-title';
    title.innerHTML = '<i class="fas fa-chart-line"></i> Video Quality Metrics';
    
    // Metrics grid
    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'metrics-grid';
    
    // Create metric items
    const metricItems = [
      { key: 'quality', label: 'Quality', icon: 'video' },
      { key: 'connectionQuality', label: 'Connection', icon: 'signal' },
      { key: 'bitrate', label: 'Bitrate', icon: 'tachometer-alt' },
      { key: 'resolution', label: 'Resolution', icon: 'expand' },
      { key: 'frameRate', label: 'Frame Rate', icon: 'film' },
      { key: 'packetLoss', label: 'Packet Loss', icon: 'exclamation-triangle' },
      { key: 'roundTripTime', label: 'Latency', icon: 'clock' },
      { key: 'autoQuality', label: 'Auto Quality', icon: 'magic' }
    ];
    
    metricItems.forEach(item => {
      const metricItem = document.createElement('div');
      metricItem.className = 'metric-item';
      metricItem.dataset.metric = item.key;
      
      const metricLabel = document.createElement('span');
      metricLabel.className = 'metric-label';
      metricLabel.innerHTML = `<i class="fas fa-${item.icon}"></i> ${item.label}`;
      
      const metricValue = document.createElement('span');
      metricValue.className = 'metric-value';
      metricValue.textContent = '-';
      
      metricItem.appendChild(metricLabel);
      metricItem.appendChild(metricValue);
      metricsGrid.appendChild(metricItem);
    });
    
    container.appendChild(title);
    container.appendChild(metricsGrid);
    
    // Update metrics display
    this.updateMetricsDisplay(container);
    
    return container;
  }

  /**
   * Update quality metrics display
   * Requirements: 8.5
   * 
   * @param {HTMLElement} displayElement - Metrics display element
   */
  updateMetricsDisplay(displayElement) {
    if (!displayElement) return;
    
    const formattedMetrics = this.getFormattedMetrics();
    
    // Update each metric value
    Object.keys(formattedMetrics).forEach(key => {
      const metricItem = displayElement.querySelector(`[data-metric="${key}"]`);
      if (metricItem) {
        const valueElement = metricItem.querySelector('.metric-value');
        if (valueElement) {
          valueElement.textContent = formattedMetrics[key];
          
          // Add quality-specific styling
          if (key === 'connectionQuality') {
            valueElement.className = `metric-value quality-${formattedMetrics[key]}`;
          }
        }
      }
    });
  }

  /**
   * Destroy the quality controller and cleanup resources
   */
  destroy() {
    console.log(`🗑️ Destroying QualityController for user ${this.userId}`);
    
    // Stop monitoring
    this.stopMonitoring();
    
    // Clear references
    this.peerConnection = null;
    this.pc = null;
    this.onQualityChange = null;
    this.onMetricsUpdate = null;
    
    console.log('✅ QualityController destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QualityController, QUALITY_PRESETS, QUALITY_THRESHOLDS };
} else if (typeof window !== 'undefined') {
  window.QualityController = QualityController;
  window.QUALITY_PRESETS = QUALITY_PRESETS;
  window.QUALITY_THRESHOLDS = QUALITY_THRESHOLDS;
}

