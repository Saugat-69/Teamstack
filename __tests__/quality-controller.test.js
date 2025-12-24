/**
 * Unit tests for QualityController logic
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

const fs = require('fs');
const path = require('path');

// Read and evaluate the quality-controller.js file
const qualityControllerCode = fs.readFileSync(
  path.join(__dirname, '../public/js/quality-controller.js'),
  'utf8'
);

// Execute the code
eval(qualityControllerCode);

describe('QualityController - Quality Management', () => {
  let qualityController;
  let mockPeerConnection;
  let mockRTCPeerConnection;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock RTCPeerConnection
    mockRTCPeerConnection = new RTCPeerConnection();

    // Create mock peer connection wrapper
    mockPeerConnection = {
      pc: mockRTCPeerConnection,
      userId: 'test-user'
    };

    // Create QualityController instance
    qualityController = new QualityController(mockPeerConnection, 'test-user');
  });

  afterEach(() => {
    if (qualityController) {
      qualityController.destroy();
    }
  });

  describe('Constructor', () => {
    test('should initialize with valid peer connection', () => {
      // Requirements: 8.1
      expect(qualityController.peerConnection).toBe(mockPeerConnection);
      expect(qualityController.pc).toBe(mockRTCPeerConnection);
      expect(qualityController.userId).toBe('test-user');
      expect(qualityController.currentQuality).toBe('medium');
      expect(qualityController.autoQualityEnabled).toBe(false);
    });

    test('should throw error without valid peer connection', () => {
      // Requirements: 8.1
      expect(() => new QualityController(null, 'user')).toThrow(
        'Valid peer connection is required'
      );
    });

    test('should initialize with default quality presets', () => {
      // Requirements: 8.1
      expect(qualityController.qualityPresets).toBeDefined();
      expect(qualityController.qualityPresets.low).toBeDefined();
      expect(qualityController.qualityPresets.medium).toBeDefined();
      expect(qualityController.qualityPresets.high).toBeDefined();
      expect(qualityController.qualityPresets.hd).toBeDefined();
    });
  });

  describe('setQuality()', () => {
    test('should set quality to low preset', async () => {
      // Requirements: 8.1, 8.2
      const result = await qualityController.setQuality('low');

      expect(result).toBe(true);
      expect(qualityController.currentQuality).toBe('low');
    });

    test('should set quality to medium preset', async () => {
      // Requirements: 8.1, 8.2
      const result = await qualityController.setQuality('medium');

      expect(result).toBe(true);
      expect(qualityController.currentQuality).toBe('medium');
    });

    test('should set quality to high preset', async () => {
      // Requirements: 8.1, 8.2
      const result = await qualityController.setQuality('high');

      expect(result).toBe(true);
      expect(qualityController.currentQuality).toBe('high');
    });

    test('should set quality to HD preset', async () => {
      // Requirements: 8.1, 8.2
      const result = await qualityController.setQuality('hd');

      expect(result).toBe(true);
      expect(qualityController.currentQuality).toBe('hd');
    });

    test('should reject invalid quality preset', async () => {
      // Requirements: 8.1
      await expect(qualityController.setQuality('invalid')).rejects.toThrow(
        'Invalid quality preset'
      );
    });

    test('should apply constraints when video track exists', async () => {
      // Requirements: 8.2
      const videoTrack = new MediaStreamTrack('video');
      const videoSender = { track: videoTrack, getParameters: () => ({ encodings: [{}] }), setParameters: jest.fn() };
      mockRTCPeerConnection._senders = [videoSender];

      await qualityController.setQuality('high');

      expect(videoSender.setParameters).toHaveBeenCalled();
    });

    test('should call onQualityChange callback when quality changes', async () => {
      // Requirements: 8.2
      qualityController.onQualityChange = jest.fn();

      await qualityController.setQuality('low');

      expect(qualityController.onQualityChange).toHaveBeenCalledWith(
        'low',
        expect.objectContaining({ name: 'Low (240p)' })
      );
    });

    test('should apply bitrate limits', async () => {
      // Requirements: 8.2
      const videoTrack = new MediaStreamTrack('video');
      const setParametersMock = jest.fn();
      const videoSender = {
        track: videoTrack,
        getParameters: () => ({ encodings: [{}] }),
        setParameters: setParametersMock
      };
      mockRTCPeerConnection._senders = [videoSender];

      await qualityController.setQuality('high');

      expect(setParametersMock).toHaveBeenCalledWith(
        expect.objectContaining({
          encodings: expect.arrayContaining([
            expect.objectContaining({ maxBitrate: 1500000 })
          ])
        })
      );
    });
  });

  describe('enableAutoQuality() and disableAutoQuality()', () => {
    test('should enable automatic quality adjustment', () => {
      // Requirements: 8.2, 8.3
      const result = qualityController.enableAutoQuality();

      expect(result).toBe(true);
      expect(qualityController.autoQualityEnabled).toBe(true);
      expect(qualityController.statsInterval).toBeTruthy();
    });

    test('should disable automatic quality adjustment', () => {
      // Requirements: 8.2
      qualityController.enableAutoQuality();
      const result = qualityController.disableAutoQuality();

      expect(result).toBe(true);
      expect(qualityController.autoQualityEnabled).toBe(false);
      expect(qualityController.statsInterval).toBeNull();
    });

    test('should not enable auto quality twice', () => {
      // Requirements: 8.2
      qualityController.enableAutoQuality();
      const firstInterval = qualityController.statsInterval;
      
      qualityController.enableAutoQuality();
      
      expect(qualityController.statsInterval).toBe(firstInterval);
    });

    test('should start monitoring when enabling auto quality', () => {
      // Requirements: 8.3
      const startMonitoringSpy = jest.spyOn(qualityController, 'startMonitoring');

      qualityController.enableAutoQuality();

      expect(startMonitoringSpy).toHaveBeenCalled();
    });

    test('should stop monitoring when disabling auto quality', () => {
      // Requirements: 8.3
      qualityController.enableAutoQuality();
      const stopMonitoringSpy = jest.spyOn(qualityController, 'stopMonitoring');

      qualityController.disableAutoQuality();

      expect(stopMonitoringSpy).toHaveBeenCalled();
    });
  });

  describe('monitorStats()', () => {
    test('should collect connection statistics', async () => {
      // Requirements: 8.3, 8.4
      const metrics = await qualityController.monitorStats();

      expect(metrics).toBeDefined();
      expect(metrics.bitrate).toBeDefined();
      expect(metrics.packetLoss).toBeDefined();
      expect(metrics.frameRate).toBeDefined();
      expect(metrics.resolution).toBeDefined();
    });

    test('should calculate bitrate from stats', async () => {
      // Requirements: 8.4
      // First call to establish baseline
      await qualityController.monitorStats();
      
      // Wait a bit and call again
      await new Promise(resolve => setTimeout(resolve, 100));
      const metrics = await qualityController.monitorStats();

      expect(metrics.bitrate).toBeGreaterThanOrEqual(0);
    });

    test('should calculate packet loss percentage', async () => {
      // Requirements: 8.4
      const metrics = await qualityController.monitorStats();

      expect(metrics.packetLoss).toBeGreaterThanOrEqual(0);
      expect(metrics.packetLoss).toBeLessThanOrEqual(1);
    });

    test('should extract resolution from stats', async () => {
      // Requirements: 8.4
      const metrics = await qualityController.monitorStats();

      expect(metrics.resolution).toEqual(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number)
        })
      );
    });

    test('should call onMetricsUpdate callback', async () => {
      // Requirements: 8.4
      qualityController.onMetricsUpdate = jest.fn();

      await qualityController.monitorStats();

      expect(qualityController.onMetricsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          bitrate: expect.any(Number),
          packetLoss: expect.any(Number)
        })
      );
    });

    test('should handle disconnected peer connection', async () => {
      // Requirements: 8.3
      mockRTCPeerConnection.connectionState = 'disconnected';

      const metrics = await qualityController.monitorStats();

      expect(metrics).toBeDefined();
    });
  });

  describe('calculateConnectionQuality()', () => {
    test('should return excellent for high quality metrics', () => {
      // Requirements: 8.4, 12.1, 12.2
      qualityController.metrics = {
        bitrate: 2500000,
        packetLoss: 0.005,
        frameRate: 30
      };

      const quality = qualityController.calculateConnectionQuality();

      expect(quality).toBe('excellent');
    });

    test('should return good for medium quality metrics', () => {
      // Requirements: 8.4, 12.2
      qualityController.metrics = {
        bitrate: 1200000,
        packetLoss: 0.02,
        frameRate: 25
      };

      const quality = qualityController.calculateConnectionQuality();

      expect(quality).toBe('good');
    });

    test('should return fair for lower quality metrics', () => {
      // Requirements: 8.4, 12.2
      qualityController.metrics = {
        bitrate: 500000,
        packetLoss: 0.04,
        frameRate: 20
      };

      const quality = qualityController.calculateConnectionQuality();

      expect(quality).toBe('fair');
    });

    test('should return poor for bad quality metrics', () => {
      // Requirements: 8.4, 12.2
      qualityController.metrics = {
        bitrate: 200000,
        packetLoss: 0.08,
        frameRate: 12
      };

      const quality = qualityController.calculateConnectionQuality();

      expect(quality).toBe('poor');
    });
  });

  describe('adjustForBandwidth()', () => {
    beforeEach(() => {
      qualityController.enableAutoQuality();
    });

    test('should downgrade quality when bandwidth is poor', async () => {
      // Requirements: 8.3, 8.4, 8.5
      qualityController.currentQuality = 'high';
      qualityController.metrics.connectionQuality = 'poor';
      qualityController.consecutivePoorReadings = 3;

      const result = await qualityController.adjustForBandwidth(300000);

      expect(result).toBe(true);
      expect(qualityController.currentQuality).toBe('medium');
    });

    test('should upgrade quality when bandwidth is excellent', async () => {
      // Requirements: 8.3, 8.4
      qualityController.currentQuality = 'medium';
      qualityController.metrics.connectionQuality = 'excellent';

      const result = await qualityController.adjustForBandwidth(2000000);

      expect(result).toBe(true);
      expect(qualityController.currentQuality).toBe('high');
    });

    test('should not adjust during cooldown period', async () => {
      // Requirements: 8.4
      qualityController.currentQuality = 'high';
      qualityController.metrics.connectionQuality = 'poor';
      qualityController.consecutivePoorReadings = 3;
      qualityController.adjustmentCooldown = true;

      const result = await qualityController.adjustForBandwidth(300000);

      expect(result).toBe(false);
    });

    test('should require consecutive poor readings before adjusting', async () => {
      // Requirements: 8.4
      qualityController.currentQuality = 'high';
      qualityController.metrics.connectionQuality = 'poor';
      qualityController.consecutivePoorReadings = 1;

      const result = await qualityController.adjustForBandwidth(300000);

      expect(result).toBe(false);
    });

    test('should reset consecutive poor readings after adjustment', async () => {
      // Requirements: 8.4
      qualityController.currentQuality = 'high';
      qualityController.metrics.connectionQuality = 'poor';
      qualityController.consecutivePoorReadings = 3;

      await qualityController.adjustForBandwidth(300000);

      expect(qualityController.consecutivePoorReadings).toBe(0);
    });

    test('should not adjust if auto quality is disabled', async () => {
      // Requirements: 8.2
      qualityController.disableAutoQuality();
      qualityController.currentQuality = 'high';
      qualityController.metrics.connectionQuality = 'poor';

      const result = await qualityController.adjustForBandwidth(300000);

      expect(result).toBe(false);
    });

    test('should downgrade from HD to high', async () => {
      // Requirements: 8.4
      qualityController.currentQuality = 'hd';
      qualityController.metrics.connectionQuality = 'poor';
      qualityController.consecutivePoorReadings = 3;

      await qualityController.adjustForBandwidth(500000);

      expect(qualityController.currentQuality).toBe('high');
    });

    test('should downgrade from high to medium', async () => {
      // Requirements: 8.4
      qualityController.currentQuality = 'high';
      qualityController.metrics.connectionQuality = 'poor';
      qualityController.consecutivePoorReadings = 3;

      await qualityController.adjustForBandwidth(300000);

      expect(qualityController.currentQuality).toBe('medium');
    });

    test('should downgrade from medium to low', async () => {
      // Requirements: 8.4
      qualityController.currentQuality = 'medium';
      qualityController.metrics.connectionQuality = 'poor';
      qualityController.consecutivePoorReadings = 3;

      await qualityController.adjustForBandwidth(100000);

      expect(qualityController.currentQuality).toBe('low');
    });

    test('should not downgrade below low quality', async () => {
      // Requirements: 8.4
      qualityController.currentQuality = 'low';
      qualityController.metrics.connectionQuality = 'poor';
      qualityController.consecutivePoorReadings = 3;

      await qualityController.adjustForBandwidth(50000);

      expect(qualityController.currentQuality).toBe('low');
    });
  });

  describe('getQualityMetrics()', () => {
    test('should return current quality metrics', () => {
      // Requirements: 8.4, 8.5
      qualityController.metrics = {
        bitrate: 1000000,
        packetLoss: 0.02,
        frameRate: 30,
        resolution: { width: 1280, height: 720 },
        connectionQuality: 'good'
      };

      const metrics = qualityController.getQualityMetrics();

      expect(metrics).toEqual(
        expect.objectContaining({
          bitrate: 1000000,
          packetLoss: 0.02,
          frameRate: 30,
          currentQuality: 'medium',
          autoQualityEnabled: false
        })
      );
    });

    test('should include quality name', () => {
      // Requirements: 8.5
      qualityController.currentQuality = 'high';

      const metrics = qualityController.getQualityMetrics();

      expect(metrics.qualityName).toBe('High (720p)');
    });
  });

  describe('getFormattedMetrics()', () => {
    test('should return formatted metrics for display', () => {
      // Requirements: 8.5
      qualityController.currentQuality = 'high';
      qualityController.metrics = {
        bitrate: 1500000,
        packetLoss: 0.02,
        frameRate: 30,
        resolution: { width: 1280, height: 720 },
        jitter: 0.01,
        roundTripTime: 0.05,
        connectionQuality: 'good'
      };

      const formatted = qualityController.getFormattedMetrics();

      expect(formatted).toEqual({
        quality: 'High (720p)',
        bitrate: '1500 kbps',
        resolution: '1280x720',
        frameRate: '30 fps',
        packetLoss: '2.00%',
        jitter: '10.00 ms',
        roundTripTime: '50 ms',
        connectionQuality: 'good',
        autoQuality: 'Disabled'
      });
    });

    test('should format bitrate in kbps', () => {
      // Requirements: 8.5
      qualityController.metrics.bitrate = 2500000;

      const formatted = qualityController.getFormattedMetrics();

      expect(formatted.bitrate).toBe('2500 kbps');
    });

    test('should format packet loss as percentage', () => {
      // Requirements: 8.5
      qualityController.metrics.packetLoss = 0.035;

      const formatted = qualityController.getFormattedMetrics();

      expect(formatted.packetLoss).toBe('3.50%');
    });

    test('should show auto quality status', () => {
      // Requirements: 8.5
      qualityController.enableAutoQuality();

      const formatted = qualityController.getFormattedMetrics();

      expect(formatted.autoQuality).toBe('Enabled');
    });
  });

  describe('createMetricsDisplay()', () => {
    test('should create metrics display element', () => {
      // Requirements: 8.5
      const display = qualityController.createMetricsDisplay();

      expect(display).toBeTruthy();
      expect(display.className).toBe('quality-metrics-display');
      expect(display.dataset.userId).toBe('test-user');
    });

    test('should include all metric items', () => {
      // Requirements: 8.5
      const display = qualityController.createMetricsDisplay();
      const metricItems = display.querySelectorAll('.metric-item');

      expect(metricItems.length).toBeGreaterThan(0);
      
      const metricKeys = Array.from(metricItems).map(item => item.dataset.metric);
      expect(metricKeys).toContain('quality');
      expect(metricKeys).toContain('bitrate');
      expect(metricKeys).toContain('resolution');
      expect(metricKeys).toContain('frameRate');
    });
  });

  describe('updateMetricsDisplay()', () => {
    test('should update metrics display with current values', () => {
      // Requirements: 8.5
      const display = qualityController.createMetricsDisplay();
      qualityController.metrics = {
        bitrate: 1000000,
        packetLoss: 0.02,
        frameRate: 30,
        resolution: { width: 1280, height: 720 },
        connectionQuality: 'good'
      };

      qualityController.updateMetricsDisplay(display);

      const bitrateValue = display.querySelector('[data-metric="bitrate"] .metric-value');
      expect(bitrateValue.textContent).toBe('1000 kbps');
    });

    test('should apply quality-specific styling', () => {
      // Requirements: 8.5
      const display = qualityController.createMetricsDisplay();
      qualityController.metrics.connectionQuality = 'excellent';

      qualityController.updateMetricsDisplay(display);

      const qualityValue = display.querySelector('[data-metric="connectionQuality"] .metric-value');
      expect(qualityValue.className).toContain('quality-excellent');
    });
  });

  describe('destroy()', () => {
    test('should cleanup resources', () => {
      // Requirements: 8.3
      qualityController.enableAutoQuality();
      qualityController.onQualityChange = jest.fn();
      qualityController.onMetricsUpdate = jest.fn();

      qualityController.destroy();

      expect(qualityController.statsInterval).toBeNull();
      expect(qualityController.peerConnection).toBeNull();
      expect(qualityController.pc).toBeNull();
    });

    test('should stop monitoring when destroyed', () => {
      // Requirements: 8.3
      qualityController.enableAutoQuality();
      const stopMonitoringSpy = jest.spyOn(qualityController, 'stopMonitoring');

      qualityController.destroy();

      expect(stopMonitoringSpy).toHaveBeenCalled();
    });
  });

  describe('Quality Presets', () => {
    test('should have correct low quality settings', () => {
      // Requirements: 8.1
      const preset = QUALITY_PRESETS.low;

      expect(preset.width.ideal).toBe(320);
      expect(preset.height.ideal).toBe(240);
      expect(preset.bitrate).toBe(150000);
    });

    test('should have correct medium quality settings', () => {
      // Requirements: 8.1
      const preset = QUALITY_PRESETS.medium;

      expect(preset.width.ideal).toBe(640);
      expect(preset.height.ideal).toBe(480);
      expect(preset.bitrate).toBe(500000);
    });

    test('should have correct high quality settings', () => {
      // Requirements: 8.1
      const preset = QUALITY_PRESETS.high;

      expect(preset.width.ideal).toBe(1280);
      expect(preset.height.ideal).toBe(720);
      expect(preset.bitrate).toBe(1500000);
    });

    test('should have correct HD quality settings', () => {
      // Requirements: 8.1
      const preset = QUALITY_PRESETS.hd;

      expect(preset.width.ideal).toBe(1920);
      expect(preset.height.ideal).toBe(1080);
      expect(preset.bitrate).toBe(3000000);
    });
  });
});
