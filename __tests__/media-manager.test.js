/**
 * Unit tests for MediaManager video methods
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2
 */

// Load the MediaManager class
const fs = require('fs');
const path = require('path');

// Read and evaluate the media-manager.js file
const mediaManagerCode = fs.readFileSync(
  path.join(__dirname, '../public/js/media-manager.js'),
  'utf8'
);

// Execute the code in the current context
eval(mediaManagerCode);

describe('MediaManager - Video Methods', () => {
  let mediaManager;
  let mockSocket;
  let mockApp;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock socket
    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    // Create mock app
    mockApp = {
      state: { currentRoom: 'test-room' },
      showNotification: jest.fn(),
      handleVideoEnabled: jest.fn(),
      handleVideoDisabled: jest.fn(),
      handleCameraSwitched: jest.fn()
    };

    // Create MediaManager instance
    mediaManager = new MediaManager(mockSocket, mockApp);
  });

  afterEach(() => {
    // Cleanup
    if (mediaManager.localVideoStream) {
      mediaManager.localVideoStream.getTracks().forEach(track => track.stop());
    }
  });

  describe('enableVideo()', () => {
    test('should enable video successfully with camera permissions', async () => {
      // Requirements: 1.1, 1.2, 1.3
      const result = await mediaManager.enableVideo();

      expect(result).toBe(true);
      expect(mediaManager.videoEnabled).toBe(true);
      expect(mediaManager.localVideoStream).toBeTruthy();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.any(Object),
          audio: false
        })
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('enable-video', {
        room: 'test-room'
      });
      expect(mockApp.handleVideoEnabled).toHaveBeenCalled();
    });

    test('should not enable video twice if already enabled', async () => {
      // Requirements: 1.1
      await mediaManager.enableVideo();
      const getUserMediaCallCount = navigator.mediaDevices.getUserMedia.mock.calls.length;

      const result = await mediaManager.enableVideo();

      expect(result).toBe(true);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(getUserMediaCallCount);
    });

    test('should handle camera permission denied error', async () => {
      // Requirements: 1.2
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(permissionError);

      await expect(mediaManager.enableVideo()).rejects.toThrow();
      expect(mediaManager.videoEnabled).toBe(false);
      expect(mockApp.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('Camera permission denied'),
        'error'
      );
    });

    test('should handle no camera available error', async () => {
      // Requirements: 1.2
      const notFoundError = new Error('No camera found');
      notFoundError.name = 'NotFoundError';
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(notFoundError);

      await expect(mediaManager.enableVideo()).rejects.toThrow();
      expect(mediaManager.videoEnabled).toBe(false);
      expect(mockApp.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('No camera found'),
        'error'
      );
    });

    test('should handle camera in use error', async () => {
      // Requirements: 1.2
      const inUseError = new Error('Camera in use');
      inUseError.name = 'NotReadableError';
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(inUseError);

      await expect(mediaManager.enableVideo()).rejects.toThrow();
      expect(mediaManager.videoEnabled).toBe(false);
      expect(mockApp.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('Camera is already in use'),
        'error'
      );
    });

    test('should apply video quality constraints', async () => {
      // Requirements: 3.1
      mediaManager.videoQuality = 'high';

      await mediaManager.enableVideo();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          })
        })
      );
    });

    test('should use selected camera device if specified', async () => {
      // Requirements: 1.4
      mediaManager.selectedDevices.camera = 'camera2';

      await mediaManager.enableVideo();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            deviceId: { exact: 'camera2' }
          })
        })
      );
    });
  });

  describe('disableVideo()', () => {
    test('should disable video successfully', async () => {
      // Requirements: 3.1, 3.2
      await mediaManager.enableVideo();
      const videoTrack = mediaManager.localVideoStream.getVideoTracks()[0];
      const stopSpy = jest.spyOn(videoTrack, 'stop');

      const result = await mediaManager.disableVideo();

      expect(result).toBe(true);
      expect(mediaManager.videoEnabled).toBe(false);
      expect(mediaManager.localVideoStream).toBeNull();
      expect(stopSpy).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('disable-video', {
        room: 'test-room'
      });
      expect(mockApp.handleVideoDisabled).toHaveBeenCalled();
    });

    test('should handle disabling video when already disabled', async () => {
      // Requirements: 3.2
      const result = await mediaManager.disableVideo();

      expect(result).toBe(true);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test('should stop all video tracks when disabling', async () => {
      // Requirements: 3.2
      await mediaManager.enableVideo();
      const tracks = mediaManager.localVideoStream.getVideoTracks();
      const stopSpies = tracks.map(track => jest.spyOn(track, 'stop'));

      await mediaManager.disableVideo();

      stopSpies.forEach(spy => {
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('switchCamera()', () => {
    test('should switch camera device successfully', async () => {
      // Requirements: 1.4
      await mediaManager.enableVideo();
      const oldStream = mediaManager.localVideoStream;

      const result = await mediaManager.switchCamera('camera2');

      expect(result).toBe(true);
      expect(mediaManager.selectedDevices.camera).toBe('camera2');
      expect(mediaManager.localVideoStream).not.toBe(oldStream);
      expect(mockApp.handleCameraSwitched).toHaveBeenCalled();
    });

    test('should save camera preference when video is disabled', async () => {
      // Requirements: 1.4
      const result = await mediaManager.switchCamera('camera2');

      expect(result).toBe(true);
      expect(mediaManager.selectedDevices.camera).toBe('camera2');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mediaDevicePreferences',
        expect.stringContaining('camera2')
      );
    });

    test('should stop old video tracks when switching camera', async () => {
      // Requirements: 1.4
      await mediaManager.enableVideo();
      const oldTrack = mediaManager.localVideoStream.getVideoTracks()[0];
      const stopSpy = jest.spyOn(oldTrack, 'stop');

      await mediaManager.switchCamera('camera2');

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('setVideoQuality()', () => {
    test('should set video quality preset successfully', async () => {
      // Requirements: 3.1
      const result = await mediaManager.setVideoQuality('high');

      expect(result).toBe(true);
      expect(mediaManager.videoQuality).toBe('high');
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('should reject invalid quality preset', async () => {
      // Requirements: 3.1
      await expect(mediaManager.setVideoQuality('invalid')).rejects.toThrow(
        'Invalid quality preset'
      );
    });

    test('should apply quality constraints to active video track', async () => {
      // Requirements: 3.1
      await mediaManager.enableVideo();
      const videoTrack = mediaManager.localVideoStream.getVideoTracks()[0];
      const applyConstraintsSpy = jest.spyOn(videoTrack, 'applyConstraints');

      await mediaManager.setVideoQuality('low');

      expect(applyConstraintsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          width: { ideal: 320 },
          height: { ideal: 240 }
        })
      );
    });

    test('should notify server about quality change', async () => {
      // Requirements: 3.1
      await mediaManager.setVideoQuality('hd');

      expect(mockSocket.emit).toHaveBeenCalledWith('video-quality-change', {
        room: 'test-room',
        quality: 'hd'
      });
    });
  });

  describe('getVideoConstraints()', () => {
    test('should return constraints for current quality preset', () => {
      // Requirements: 3.1
      mediaManager.videoQuality = 'medium';

      const constraints = mediaManager.getVideoConstraints();

      expect(constraints).toEqual(
        expect.objectContaining({
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user'
        })
      );
    });

    test('should default to medium quality if invalid preset', () => {
      // Requirements: 3.1
      mediaManager.videoQuality = 'invalid';

      const constraints = mediaManager.getVideoConstraints();

      expect(constraints).toEqual(
        expect.objectContaining({
          width: { ideal: 640 },
          height: { ideal: 480 }
        })
      );
    });
  });

  describe('Device Preferences', () => {
    test('should save device preferences to localStorage', () => {
      mediaManager.selectedDevices.camera = 'camera1';
      mediaManager.selectedDevices.microphone = 'mic1';
      mediaManager.videoQuality = 'high';

      mediaManager.saveDevicePreferences();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mediaDevicePreferences',
        expect.stringContaining('camera1')
      );
    });

    test('should load device preferences from localStorage', () => {
      const mockPrefs = {
        camera: 'camera2',
        microphone: 'mic2',
        speaker: 'speaker1',
        videoQuality: 'hd'
      };
      localStorage.getItem.mockReturnValue(JSON.stringify(mockPrefs));

      mediaManager.loadDevicePreferences();

      expect(mediaManager.selectedDevices.camera).toBe('camera2');
      expect(mediaManager.videoQuality).toBe('hd');
    });
  });

  describe('Browser-specific error handling', () => {
    test('should provide Chrome-specific permission instructions', () => {
      // Requirements: 1.2
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        configurable: true
      });

      const instructions = mediaManager.getCameraPermissionInstructions();

      expect(instructions).toContain('address bar');
      expect(instructions).toContain('Settings');
    });

    test('should provide Firefox-specific permission instructions', () => {
      // Requirements: 1.2
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        configurable: true
      });

      const instructions = mediaManager.getCameraPermissionInstructions();

      expect(instructions).toContain('camera icon');
      expect(instructions).toContain('Privacy & Security');
    });
  });
});

describe('MediaPeerConnection - Video Track Management', () => {
  let peerConnection;
  let mockSocket;
  let localStreams;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      emit: jest.fn()
    };

    localStreams = {
      audio: new MediaStream([new MediaStreamTrack('audio')]),
      video: new MediaStream([new MediaStreamTrack('video')])
    };

    peerConnection = new MediaPeerConnection(
      'test-user',
      localStreams,
      true,
      mockSocket
    );
  });

  afterEach(() => {
    peerConnection.close();
  });

  describe('addVideoTrack()', () => {
    test('should add video track to peer connection', () => {
      // Requirements: 1.4, 1.5
      const newVideoTrack = new MediaStreamTrack('video');
      const addTrackSpy = jest.spyOn(peerConnection.pc, 'addTrack');

      const result = peerConnection.addVideoTrack(newVideoTrack);

      expect(result).toBe(true);
      expect(addTrackSpy).toHaveBeenCalledWith(
        newVideoTrack,
        peerConnection.localVideoStream
      );
    });

    test('should replace existing video track if already present', () => {
      // Requirements: 1.4
      const firstTrack = new MediaStreamTrack('video');
      const secondTrack = new MediaStreamTrack('video');

      peerConnection.addVideoTrack(firstTrack);
      const result = peerConnection.addVideoTrack(secondTrack);

      expect(result).toBe(true);
    });
  });

  describe('removeVideoTrack()', () => {
    test('should remove video track from peer connection', () => {
      // Requirements: 3.3
      const videoTrack = new MediaStreamTrack('video');
      peerConnection.addVideoTrack(videoTrack);
      const removeTrackSpy = jest.spyOn(peerConnection.pc, 'removeTrack');

      const result = peerConnection.removeVideoTrack();

      expect(result).toBe(true);
      expect(removeTrackSpy).toHaveBeenCalled();
    });

    test('should handle removing video track when none exists', () => {
      // Requirements: 3.3
      const result = peerConnection.removeVideoTrack();

      expect(result).toBe(true);
    });
  });

  describe('replaceVideoTrack()', () => {
    test('should replace video track successfully', async () => {
      // Requirements: 1.4
      const oldTrack = new MediaStreamTrack('video');
      const newTrack = new MediaStreamTrack('video');
      
      peerConnection.addVideoTrack(oldTrack);
      const result = await peerConnection.replaceVideoTrack(newTrack);

      expect(result).toBe(true);
    });

    test('should add track if no existing video track', async () => {
      // Requirements: 1.4
      const newTrack = new MediaStreamTrack('video');
      const addTrackSpy = jest.spyOn(peerConnection.pc, 'addTrack');

      const result = await peerConnection.replaceVideoTrack(newTrack);

      expect(result).toBe(true);
      expect(addTrackSpy).toHaveBeenCalled();
    });
  });

  describe('Video track event handlers', () => {
    test('should setup video track ended handler', () => {
      // Requirements: 2.1, 3.3
      const videoTrack = new MediaStreamTrack('video');
      peerConnection.onVideoTrackEnded = jest.fn();

      peerConnection.setupVideoTrackHandlers(videoTrack);
      videoTrack.stop(); // Triggers onended

      expect(peerConnection.onVideoTrackEnded).toHaveBeenCalledWith('test-user');
    });

    test('should setup video track muted handler', () => {
      // Requirements: 2.1, 3.3
      const videoTrack = new MediaStreamTrack('video');
      peerConnection.onVideoTrackMuted = jest.fn();

      peerConnection.setupVideoTrackHandlers(videoTrack);
      
      // Simulate mute event
      if (videoTrack.onmute) {
        videoTrack.onmute();
      }

      expect(peerConnection.onVideoTrackMuted).toHaveBeenCalledWith('test-user', true);
    });
  });

  describe('renderVideoElement()', () => {
    test('should create video element with proper attributes', () => {
      // Requirements: 1.5, 2.1
      const videoFeed = peerConnection.renderVideoElement();

      expect(videoFeed).toBeTruthy();
      expect(videoFeed.className).toBe('video-feed');
      expect(videoFeed.dataset.userId).toBe('test-user');

      const video = videoFeed.querySelector('video');
      expect(video).toBeTruthy();
      expect(video.autoplay).toBe(true);
      expect(video.playsinline).toBe(true);
    });

    test('should not create duplicate video elements', () => {
      // Requirements: 2.1
      peerConnection.renderVideoElement();
      const secondCall = peerConnection.renderVideoElement();

      expect(secondCall).toBeUndefined();
    });
  });
});
