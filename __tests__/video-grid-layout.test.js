/**
 * Unit tests for VideoGridLayout calculations and layout management
 * Requirements: 2.1, 2.2, 2.3, 2.5, 7.1, 7.2, 7.3, 7.4
 */

const fs = require('fs');
const path = require('path');

// Read and evaluate the video-grid-layout.js file
const videoGridCode = fs.readFileSync(
  path.join(__dirname, '../public/js/video-grid-layout.js'),
  'utf8'
);

// Execute the code
eval(videoGridCode);

describe('VideoGridLayout - Layout Calculations', () => {
  let container;
  let videoGrid;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create container element
    container = document.createElement('div');
    container.id = 'test-video-container';
    document.body.appendChild(container);

    // Create VideoGridLayout instance
    videoGrid = new VideoGridLayout(container);
  });

  afterEach(() => {
    // Cleanup
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Constructor', () => {
    test('should initialize with valid container', () => {
      // Requirements: 2.1
      expect(videoGrid.container).toBe(container);
      expect(videoGrid.videoFeeds).toBeInstanceOf(Map);
      expect(videoGrid.pinnedFeeds).toBeInstanceOf(Set);
      expect(videoGrid.layoutMode).toBe('grid');
    });

    test('should throw error without container', () => {
      // Requirements: 2.1
      expect(() => new VideoGridLayout(null)).toThrow(
        'Container element is required'
      );
    });

    test('should load layout mode from localStorage', () => {
      // Requirements: 7.5
      localStorage.getItem.mockReturnValue('speaker');
      
      const newGrid = new VideoGridLayout(document.createElement('div'));
      
      expect(newGrid.layoutMode).toBe('speaker');
    });
  });

  describe('calculateGridLayout()', () => {
    test('should calculate layout for 1 participant', () => {
      // Requirements: 2.2, 2.3
      const layout = videoGrid.calculateGridLayout(1);

      expect(layout.columns).toBe(1);
      expect(layout.rows).toBe(1);
      expect(layout.cellWidth).toBe('100%');
      expect(layout.cellHeight).toBe('100%');
    });

    test('should calculate layout for 2 participants', () => {
      // Requirements: 2.2, 2.3
      const layout = videoGrid.calculateGridLayout(2);

      expect(layout.columns).toBe(2);
      expect(layout.rows).toBe(1);
      expect(layout.cellWidth).toBe('50%');
      expect(layout.cellHeight).toBe('100%');
    });

    test('should calculate layout for 4 participants', () => {
      // Requirements: 2.2, 2.3
      const layout = videoGrid.calculateGridLayout(4);

      expect(layout.columns).toBe(2);
      expect(layout.rows).toBe(2);
      expect(layout.cellWidth).toBe('50%');
      expect(layout.cellHeight).toBe('50%');
    });

    test('should calculate layout for 6 participants', () => {
      // Requirements: 2.2, 2.3
      const layout = videoGrid.calculateGridLayout(6);

      expect(layout.columns).toBe(3);
      expect(layout.rows).toBe(2);
      expect(layout.cellWidth).toBe('33.33333333333333%');
    });

    test('should calculate layout for 9 participants', () => {
      // Requirements: 2.2, 2.3
      const layout = videoGrid.calculateGridLayout(9);

      expect(layout.columns).toBe(3);
      expect(layout.rows).toBe(3);
    });

    test('should calculate layout for 12 participants', () => {
      // Requirements: 2.2, 2.3, 2.5
      const layout = videoGrid.calculateGridLayout(12);

      expect(layout.columns).toBe(4);
      expect(layout.rows).toBe(3);
      expect(layout.cellWidth).toBe('25%');
    });

    test('should handle more than 12 participants', () => {
      // Requirements: 2.3
      const layout = videoGrid.calculateGridLayout(16);

      expect(layout.columns).toBe(4);
      expect(layout.rows).toBe(4);
    });

    test('should handle 0 participants', () => {
      // Requirements: 2.2
      const layout = videoGrid.calculateGridLayout(0);

      expect(layout.columns).toBe(0);
      expect(layout.rows).toBe(0);
    });
  });

  describe('addVideoFeed()', () => {
    test('should add video feed successfully', () => {
      // Requirements: 2.1, 2.2
      const stream = new MediaStream([new MediaStreamTrack('video')]);
      const metadata = { name: 'Test User', isLocal: false };

      const feedElement = videoGrid.addVideoFeed('user1', stream, metadata);

      expect(feedElement).toBeTruthy();
      expect(videoGrid.videoFeeds.has('user1')).toBe(true);
      expect(videoGrid.videoFeeds.size).toBe(1);
      expect(feedElement.dataset.userId).toBe('user1');
    });

    test('should create video element with correct attributes', () => {
      // Requirements: 2.1, 2.4
      const stream = new MediaStream([new MediaStreamTrack('video')]);
      const metadata = { name: 'Test User' };

      const feedElement = videoGrid.addVideoFeed('user1', stream, metadata);
      const video = feedElement.querySelector('video');

      expect(video).toBeTruthy();
      expect(video.autoplay).toBe(true);
      expect(video.playsinline).toBe(true);
      expect(video.srcObject).toBe(stream);
    });

    test('should mute local video to prevent feedback', () => {
      // Requirements: 2.1
      const stream = new MediaStream([new MediaStreamTrack('video')]);
      const metadata = { name: 'Local User', isLocal: true };

      const feedElement = videoGrid.addVideoFeed('local', stream, metadata);
      const video = feedElement.querySelector('video');

      expect(video.muted).toBe(true);
    });

    test('should not mute remote video', () => {
      // Requirements: 2.1
      const stream = new MediaStream([new MediaStreamTrack('video')]);
      const metadata = { name: 'Remote User', isLocal: false };

      const feedElement = videoGrid.addVideoFeed('remote', stream, metadata);
      const video = feedElement.querySelector('video');

      expect(video.muted).toBe(false);
    });

    test('should update existing feed if already exists', () => {
      // Requirements: 2.1
      const stream1 = new MediaStream([new MediaStreamTrack('video')]);
      const stream2 = new MediaStream([new MediaStreamTrack('video')]);

      videoGrid.addVideoFeed('user1', stream1, { name: 'User 1' });
      videoGrid.addVideoFeed('user1', stream2, { name: 'User 1 Updated' });

      expect(videoGrid.videoFeeds.size).toBe(1);
    });

    test('should trigger layout update after adding feed', () => {
      // Requirements: 2.2, 2.5
      const updateLayoutSpy = jest.spyOn(videoGrid, 'updateLayout');
      const stream = new MediaStream([new MediaStreamTrack('video')]);

      videoGrid.addVideoFeed('user1', stream, { name: 'User 1' });

      expect(updateLayoutSpy).toHaveBeenCalled();
    });
  });

  describe('removeVideoFeed()', () => {
    test('should remove video feed successfully', (done) => {
      // Requirements: 2.1, 2.5
      const stream = new MediaStream([new MediaStreamTrack('video')]);
      videoGrid.addVideoFeed('user1', stream, { name: 'User 1' });

      videoGrid.removeVideoFeed('user1');

      // Wait for animation to complete
      setTimeout(() => {
        expect(videoGrid.videoFeeds.has('user1')).toBe(false);
        expect(videoGrid.videoFeeds.size).toBe(0);
        done();
      }, 350);
    });

    test('should stop video stream when removing feed', (done) => {
      // Requirements: 2.1
      const track = new MediaStreamTrack('video');
      const stream = new MediaStream([track]);
      const stopSpy = jest.spyOn(track, 'stop');

      videoGrid.addVideoFeed('user1', stream, { name: 'User 1' });
      videoGrid.removeVideoFeed('user1');

      setTimeout(() => {
        expect(stopSpy).toHaveBeenCalled();
        done();
      }, 350);
    });

    test('should handle removing non-existent feed', () => {
      // Requirements: 2.1
      expect(() => {
        videoGrid.removeVideoFeed('non-existent');
      }).not.toThrow();
    });

    test('should remove from pinned feeds when removing', (done) => {
      // Requirements: 2.5
      const stream = new MediaStream([new MediaStreamTrack('video')]);
      videoGrid.addVideoFeed('user1', stream, { name: 'User 1' });
      videoGrid.pinFeed('user1');

      expect(videoGrid.pinnedFeeds.has('user1')).toBe(true);

      videoGrid.removeVideoFeed('user1');

      setTimeout(() => {
        expect(videoGrid.pinnedFeeds.has('user1')).toBe(false);
        done();
      }, 350);
    });
  });

  describe('setLayoutMode()', () => {
    test('should set grid layout mode', () => {
      // Requirements: 7.1
      videoGrid.setLayoutMode('grid');

      expect(videoGrid.layoutMode).toBe('grid');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'teamup-video-layout-mode',
        'grid'
      );
    });

    test('should set speaker layout mode', () => {
      // Requirements: 7.2
      videoGrid.setLayoutMode('speaker');

      expect(videoGrid.layoutMode).toBe('speaker');
    });

    test('should set sidebar layout mode', () => {
      // Requirements: 7.3
      videoGrid.setLayoutMode('sidebar');

      expect(videoGrid.layoutMode).toBe('sidebar');
    });

    test('should set PIP layout mode', () => {
      // Requirements: 7.4
      videoGrid.setLayoutMode('pip');

      expect(videoGrid.layoutMode).toBe('pip');
    });

    test('should reject invalid layout mode', () => {
      // Requirements: 7.1
      const originalMode = videoGrid.layoutMode;
      videoGrid.setLayoutMode('invalid');

      expect(videoGrid.layoutMode).toBe(originalMode);
    });

    test('should trigger layout update when changing mode', () => {
      // Requirements: 7.1, 7.2
      const updateLayoutSpy = jest.spyOn(videoGrid, 'updateLayout');

      videoGrid.setLayoutMode('speaker');

      expect(updateLayoutSpy).toHaveBeenCalled();
    });
  });

  describe('pinFeed() and unpinFeed()', () => {
    beforeEach(() => {
      // Add some video feeds
      for (let i = 1; i <= 3; i++) {
        const stream = new MediaStream([new MediaStreamTrack('video')]);
        videoGrid.addVideoFeed(`user${i}`, stream, { name: `User ${i}` });
      }
    });

    test('should pin video feed successfully', () => {
      // Requirements: 9.1, 9.2
      videoGrid.pinFeed('user1');

      expect(videoGrid.pinnedFeeds.has('user1')).toBe(true);
      expect(videoGrid.pinnedFeeds.size).toBe(1);
    });

    test('should support pinning multiple feeds', () => {
      // Requirements: 9.3
      videoGrid.pinFeed('user1');
      videoGrid.pinFeed('user2');
      videoGrid.pinFeed('user3');

      expect(videoGrid.pinnedFeeds.size).toBe(3);
    });

    test('should limit pinned feeds to 4', () => {
      // Requirements: 9.3
      for (let i = 1; i <= 5; i++) {
        const stream = new MediaStream([new MediaStreamTrack('video')]);
        videoGrid.addVideoFeed(`user${i}`, stream, { name: `User ${i}` });
        videoGrid.pinFeed(`user${i}`);
      }

      expect(videoGrid.pinnedFeeds.size).toBeLessThanOrEqual(4);
    });

    test('should unpin video feed successfully', () => {
      // Requirements: 9.5
      videoGrid.pinFeed('user1');
      expect(videoGrid.pinnedFeeds.has('user1')).toBe(true);

      videoGrid.unpinFeed('user1');
      expect(videoGrid.pinnedFeeds.has('user1')).toBe(false);
    });

    test('should update layout when pinning', () => {
      // Requirements: 9.2
      const updateLayoutSpy = jest.spyOn(videoGrid, 'updateLayout');

      videoGrid.pinFeed('user1');

      expect(updateLayoutSpy).toHaveBeenCalled();
    });

    test('should add pin indicator to pinned feed', () => {
      // Requirements: 9.4
      videoGrid.pinFeed('user1');
      videoGrid.updateLayout();

      const feedData = videoGrid.videoFeeds.get('user1');
      expect(feedData.element.classList.contains('pinned')).toBe(true);
    });
  });

  describe('calculateSpeakerLayout()', () => {
    test('should return speaker layout configuration', () => {
      // Requirements: 7.2
      const layout = videoGrid.calculateSpeakerLayout(5);

      expect(layout.mode).toBe('speaker');
      expect(layout.mainSize).toBe('70%');
      expect(layout.thumbnailSize).toBe('15%');
      expect(layout.thumbnailCount).toBe(4);
    });
  });

  describe('calculateSidebarLayout()', () => {
    test('should return sidebar layout configuration', () => {
      // Requirements: 7.3
      const layout = videoGrid.calculateSidebarLayout(4);

      expect(layout.mode).toBe('sidebar');
      expect(layout.mainSize).toBe('75%');
      expect(layout.sidebarWidth).toBe('25%');
      expect(layout.sidebarCount).toBe(3);
    });
  });

  describe('calculatePipLayout()', () => {
    test('should return PIP layout configuration', () => {
      // Requirements: 7.4
      const layout = videoGrid.calculatePipLayout(2);

      expect(layout.mode).toBe('pip');
      expect(layout.position).toBe('bottom-right');
      expect(layout.size).toEqual({ width: 320, height: 180 });
    });
  });

  describe('Screen Share Integration', () => {
    test('should set screen share feed', () => {
      // Requirements: 5.1, 5.2
      const stream = new MediaStream([new MediaStreamTrack('video')]);
      
      videoGrid.setScreenShare('user1', stream);

      expect(videoGrid.screenShareFeed).toBe('user1');
    });

    test('should prioritize screen share in speaker view', () => {
      // Requirements: 5.1, 5.2, 7.2
      const stream1 = new MediaStream([new MediaStreamTrack('video')]);
      const stream2 = new MediaStream([new MediaStreamTrack('video')]);
      
      videoGrid.addVideoFeed('user1', stream1, { name: 'User 1' });
      videoGrid.addVideoFeed('user2', stream2, { name: 'User 2', isScreenShare: true });
      videoGrid.setScreenShare('user2', stream2);
      videoGrid.setLayoutMode('speaker');

      // Screen share should be prioritized in speaker view
      expect(videoGrid.screenShareFeed).toBe('user2');
    });

    test('should clear screen share', () => {
      // Requirements: 6.3
      const stream = new MediaStream([new MediaStreamTrack('video')]);
      videoGrid.setScreenShare('user1', stream);
      
      videoGrid.clearScreenShare();

      expect(videoGrid.screenShareFeed).toBeNull();
    });
  });

  describe('Accessibility Features', () => {
    test('should create ARIA live region', () => {
      // Requirements: 3.4
      expect(videoGrid.liveRegion).toBeTruthy();
      expect(videoGrid.liveRegion.getAttribute('role')).toBe('status');
      expect(videoGrid.liveRegion.getAttribute('aria-live')).toBe('polite');
    });

    test('should announce when video feed is added', () => {
      // Requirements: 3.4
      const announceSpy = jest.spyOn(videoGrid, 'announceToScreenReader');
      const stream = new MediaStream([new MediaStreamTrack('video')]);

      videoGrid.addVideoFeed('user1', stream, { name: 'Test User' });

      expect(announceSpy).toHaveBeenCalledWith('Test User joined with video');
    });

    test('should announce when video feed is removed', (done) => {
      // Requirements: 3.4
      const stream = new MediaStream([new MediaStreamTrack('video')]);
      videoGrid.addVideoFeed('user1', stream, { name: 'Test User' });
      
      const announceSpy = jest.spyOn(videoGrid, 'announceToScreenReader');
      videoGrid.removeVideoFeed('user1');

      setTimeout(() => {
        expect(announceSpy).toHaveBeenCalledWith('Test User left video');
        done();
      }, 350);
    });

    test('should announce layout mode changes', () => {
      // Requirements: 3.4, 7.2
      const announceSpy = jest.spyOn(videoGrid, 'announceToScreenReader');

      videoGrid.setLayoutMode('speaker');

      expect(announceSpy).toHaveBeenCalledWith('Layout changed to Speaker View');
    });
  });

  describe('Layout Persistence', () => {
    test('should save layout mode to localStorage', () => {
      // Requirements: 7.5
      videoGrid.setLayoutMode('sidebar');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'teamup-video-layout-mode',
        'sidebar'
      );
    });

    test('should load layout mode from localStorage on init', () => {
      // Requirements: 7.5
      localStorage.getItem.mockReturnValue('pip');

      const newContainer = document.createElement('div');
      const newGrid = new VideoGridLayout(newContainer);

      expect(newGrid.layoutMode).toBe('pip');
    });
  });

  describe('Dynamic Layout Updates', () => {
    test('should update layout when participants join', () => {
      // Requirements: 2.5
      const updateLayoutSpy = jest.spyOn(videoGrid, 'updateLayout');
      const stream = new MediaStream([new MediaStreamTrack('video')]);

      videoGrid.addVideoFeed('user1', stream, { name: 'User 1' });

      expect(updateLayoutSpy).toHaveBeenCalled();
    });

    test('should update layout when participants leave', (done) => {
      // Requirements: 2.5
      const stream = new MediaStream([new MediaStreamTrack('video')]);
      videoGrid.addVideoFeed('user1', stream, { name: 'User 1' });
      
      const updateLayoutSpy = jest.spyOn(videoGrid, 'updateLayout');
      videoGrid.removeVideoFeed('user1');

      setTimeout(() => {
        expect(updateLayoutSpy).toHaveBeenCalled();
        done();
      }, 350);
    });

    test('should recalculate layout based on participant count', () => {
      // Requirements: 2.2, 2.3
      const calculateLayoutSpy = jest.spyOn(videoGrid, 'calculateLayout');

      // Add multiple participants
      for (let i = 1; i <= 5; i++) {
        const stream = new MediaStream([new MediaStreamTrack('video')]);
        videoGrid.addVideoFeed(`user${i}`, stream, { name: `User ${i}` });
      }

      expect(calculateLayoutSpy).toHaveBeenCalled();
    });
  });
});
