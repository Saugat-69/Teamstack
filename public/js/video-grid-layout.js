/**
 * VideoGridLayout - Dynamic video feed layout manager for TeamUp
 * Handles video grid arrangement, layout modes, and pinning functionality
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */

// Layout mode configurations
const LAYOUT_MODES = {
  grid: {
    name: 'Grid View',
    maxColumns: 4,
    aspectRatio: '16:9',
    showNames: true
  },
  speaker: {
    name: 'Speaker View',
    mainSize: '70%',
    thumbnailSize: '15%',
    showNames: true
  },
  sidebar: {
    name: 'Sidebar View',
    mainSize: '75%',
    sidebarWidth: '25%',
    showNames: true
  },
  pip: {
    name: 'Picture in Picture',
    position: 'bottom-right',
    size: { width: 320, height: 180 },
    draggable: true
  }
};

class VideoGridLayout {
  constructor(container) {
    if (!container) {
      throw new Error('Container element is required for VideoGridLayout');
    }

    this.container = container;
    this.videoFeeds = new Map(); // userId -> VideoFeedElement
    this.pinnedFeeds = new Set(); // Set of pinned user IDs
    this.screenShareFeed = null; // Current screen share feed

    // Load layout mode from localStorage or use default
    this.layoutMode = this.loadLayoutMode() || 'grid';

    // PIP drag state
    this.pipDragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0
    };

    // Initialize container
    this.initializeContainer();

    console.log('✅ VideoGridLayout initialized');
  }

  /**
   * Initialize the video grid container
   * Requirements: 2.1, 3.4
   */
  initializeContainer() {
    // Add video grid class
    this.container.classList.add('video-grid-container');

    // Set initial layout mode
    this.container.dataset.layoutMode = this.layoutMode;

    // Create grid wrapper
    this.gridWrapper = document.createElement('div');
    this.gridWrapper.className = 'video-grid-wrapper';
    this.container.appendChild(this.gridWrapper);

    // Create ARIA live region for video state announcements
    // Requirements: 3.4
    this.createAriaLiveRegion();

    console.log('✅ Video grid container initialized');
  }

  /**
   * Create ARIA live region for screen reader announcements
   * Requirements: 3.4
   */
  createAriaLiveRegion() {
    // Check if live region already exists
    let liveRegion = document.getElementById('video-grid-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'video-grid-live-region';
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(liveRegion);
    }
    this.liveRegion = liveRegion;
  }

  /**
   * Announce message to screen readers
   * Requirements: 3.4
   * 
   * @param {string} message - Message to announce
   */
  announceToScreenReader(message) {
    if (!this.liveRegion) {
      this.createAriaLiveRegion();
    }

    // Update the live region with the message
    this.liveRegion.textContent = message;

    // Clear after a short delay to allow for new announcements
    setTimeout(() => {
      this.liveRegion.textContent = '';
    }, 1000);
  }

  /**
   * Add a video feed to the grid
   * Requirements: 2.1, 2.2
   * 
   * @param {string} userId - Unique user identifier
   * @param {MediaStream} stream - Video media stream
   * @param {Object} metadata - User metadata (name, etc.)
   * @returns {HTMLElement} The created video feed element
   */
  addVideoFeed(userId, stream, metadata = {}) {
    try {
      console.log(`📹 Adding video feed for user ${userId}`, { stream, metadata });

      // Check if feed already exists
      if (this.videoFeeds.has(userId)) {
        console.warn(`⚠️ Video feed for user ${userId} already exists, updating instead`);
        return this.updateVideoFeed(userId, stream, metadata);
      }

      // Validate stream
      if (!stream || !(stream instanceof MediaStream)) {
        throw new Error(`Invalid stream provided for user ${userId}. Expected MediaStream, got ${typeof stream}`);
      }

      // Create video feed element
      const videoFeed = this.createVideoFeedElement(userId, stream, metadata);
      console.log(`📹 Video feed element created:`, videoFeed);

      // Store in map
      this.videoFeeds.set(userId, {
        element: videoFeed,
        stream: stream,
        metadata: metadata,
        isPinned: false,
        qualityController: null // Will be set when quality monitoring is enabled
      });

      // Add to grid
      this.gridWrapper.appendChild(videoFeed);
      console.log(`📹 Video feed appended to grid wrapper. Total feeds: ${this.videoFeeds.size}`);

      // Update layout
      this.updateLayout();

      // Announce to screen readers
      // Requirements: 3.4
      const userName = metadata.name || userId;
      this.announceToScreenReader(`${userName} joined with video`);

      console.log(`✅ Video feed added for user ${userId}. Container children:`, this.gridWrapper.children.length);
      return videoFeed;
    } catch (error) {
      console.error(`❌ Failed to add video feed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create a video feed element
   * Requirements: 2.1, 2.4
   * 
   * @param {string} userId - Unique user identifier
   * @param {MediaStream} stream - Video media stream
   * @param {Object} metadata - User metadata
   * @returns {HTMLElement} The video feed element
   */
  createVideoFeedElement(userId, stream, metadata) {
    // Create container
    const feedContainer = document.createElement('div');
    feedContainer.className = 'video-feed';
    feedContainer.dataset.userId = userId;

    // Create video element
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsinline = true;
    video.muted = metadata.isLocal || false; // Mute local video to prevent feedback
    video.srcObject = stream;
    video.className = 'video-element';

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';

    // User name label
    const nameLabel = document.createElement('span');
    nameLabel.className = 'user-name';
    nameLabel.textContent = metadata.name || userId;

    // Video controls
    const controls = document.createElement('div');
    controls.className = 'video-controls';

    // Pin button
    const pinBtn = document.createElement('button');
    pinBtn.className = 'video-control-btn pin-btn';
    pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
    pinBtn.title = 'Pin video';
    pinBtn.addEventListener('click', () => this.togglePinFeed(userId));

    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'video-control-btn fullscreen-btn';
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreenBtn.title = 'Fullscreen';
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen(feedContainer));

    controls.appendChild(pinBtn);
    controls.appendChild(fullscreenBtn);

    // Connection indicator
    const connectionIndicator = document.createElement('div');
    connectionIndicator.className = 'connection-indicator';
    connectionIndicator.innerHTML = '<i class="fas fa-signal"></i>';
    connectionIndicator.title = 'Connection quality: Good';

    // Pin indicator badge (shown when feed is pinned)
    const pinIndicator = document.createElement('div');
    pinIndicator.className = 'pin-indicator';
    pinIndicator.innerHTML = '<i class="fas fa-thumbtack"></i>';
    pinIndicator.title = 'Pinned';

    // Speaking indicator
    const speakingIndicator = document.createElement('div');
    speakingIndicator.className = 'speaking-indicator';

    // Assemble overlay
    overlay.appendChild(nameLabel);
    overlay.appendChild(controls);
    overlay.appendChild(connectionIndicator);
    overlay.appendChild(pinIndicator);

    // Assemble feed
    feedContainer.appendChild(video);
    feedContainer.appendChild(overlay);
    feedContainer.appendChild(speakingIndicator);

    // Add animation
    feedContainer.style.animation = 'videoFeedFadeIn 0.3s ease';

    return feedContainer;
  }

  /**
   * Update an existing video feed
   * Requirements: 2.1
   * 
   * @param {string} userId - Unique user identifier
   * @param {MediaStream} stream - New video media stream
   * @param {Object} metadata - Updated user metadata
   */
  updateVideoFeed(userId, stream, metadata) {
    const feedData = this.videoFeeds.get(userId);
    if (!feedData) {
      console.warn(`⚠️ Cannot update non-existent video feed for user ${userId}`);
      return null;
    }

    // Update stream
    const video = feedData.element.querySelector('.video-element');
    if (video && stream) {
      video.srcObject = stream;
      feedData.stream = stream;
    }

    // Update metadata
    if (metadata) {
      feedData.metadata = { ...feedData.metadata, ...metadata };

      // Update name label
      const nameLabel = feedData.element.querySelector('.user-name');
      if (nameLabel && metadata.name) {
        nameLabel.textContent = metadata.name;
      }
    }

    console.log(`✅ Video feed updated for user ${userId}`);
    return feedData.element;
  }

  /**
   * Remove a video feed from the grid
   * Requirements: 2.1, 2.5
   * 
   * @param {string} userId - Unique user identifier
   */
  removeVideoFeed(userId) {
    try {
      console.log(`📹 Removing video feed for user ${userId}`);

      const feedData = this.videoFeeds.get(userId);
      if (!feedData) {
        console.warn(`⚠️ Video feed for user ${userId} not found`);
        return;
      }

      // Add fade out animation
      feedData.element.style.animation = 'videoFeedFadeOut 0.3s ease';

      // Remove after animation
      setTimeout(() => {
        // Stop video stream
        const video = feedData.element.querySelector('.video-element');
        if (video && video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }

        // Remove from DOM
        if (feedData.element.parentNode) {
          feedData.element.parentNode.removeChild(feedData.element);
        }

        // Remove from map
        this.videoFeeds.delete(userId);

        // Remove from pinned set
        this.pinnedFeeds.delete(userId);

        // Update layout
        this.updateLayout();

        // Hide container if empty
        if (this.videoFeeds.size === 0) {
          this.container.style.display = 'none';
        }

        // Announce to screen readers
        // Requirements: 3.4
        const userName = feedData.metadata.name || userId;
        this.announceToScreenReader(`${userName} left video`);

        console.log(`✅ Video feed removed for user ${userId}`);
      }, 300);
    } catch (error) {
      console.error(`❌ Failed to remove video feed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Set quality controller for a video feed
   * Requirements: 12.1
   * 
   * @param {string} userId - Unique user identifier
   * @param {QualityController} qualityController - Quality controller instance
   */
  setQualityController(userId, qualityController) {
    const feedData = this.videoFeeds.get(userId);
    if (!feedData) {
      console.warn(`⚠️ Cannot set quality controller for non-existent feed: ${userId}`);
      return;
    }

    feedData.qualityController = qualityController;
    console.log(`✅ Quality controller set for user ${userId}`);
  }

  /**
   * Get quality controller for a video feed
   * Requirements: 12.1
   * 
   * @param {string} userId - Unique user identifier
   * @returns {QualityController|null} Quality controller instance or null
   */
  getQualityController(userId) {
    const feedData = this.videoFeeds.get(userId);
    return feedData ? feedData.qualityController : null;
  }

  /**
   * Get video feed element for a user
   * Requirements: 12.1
   * 
   * @param {string} userId - Unique user identifier
   * @returns {HTMLElement|null} Video feed element or null
   */
  getVideoFeedElement(userId) {
    const feedData = this.videoFeeds.get(userId);
    return feedData ? feedData.element : null;
  }

  /**
   * Calculate optimal grid layout based on participant count
   * Requirements: 2.2, 2.3
   * 
   * @returns {Object} Layout configuration
   */
  calculateLayout() {
    const participantCount = this.videoFeeds.size;
    const pinnedCount = this.pinnedFeeds.size;

    console.log(`📐 Calculating layout for ${participantCount} participants (${pinnedCount} pinned)`);

    // Handle different layout modes
    switch (this.layoutMode) {
      case 'grid':
        return this.calculateGridLayout(participantCount);
      case 'speaker':
        return this.calculateSpeakerLayout(participantCount);
      case 'sidebar':
        return this.calculateSidebarLayout(participantCount);
      case 'pip':
        return this.calculatePipLayout(participantCount);
      default:
        return this.calculateGridLayout(participantCount);
    }
  }

  /**
   * Calculate grid layout configuration
   * Requirements: 2.2, 2.3
   * 
   * @param {number} count - Number of participants
   * @returns {Object} Grid layout configuration
   */
  calculateGridLayout(count) {
    if (count === 0) {
      return { columns: 0, rows: 0, cellWidth: '0%', cellHeight: '0%' };
    }

    // Determine optimal columns and rows
    let columns, rows;

    if (count === 1) {
      columns = 1;
      rows = 1;
    } else if (count === 2) {
      columns = 2;
      rows = 1;
    } else if (count <= 4) {
      columns = 2;
      rows = 2;
    } else if (count <= 6) {
      columns = 3;
      rows = 2;
    } else if (count <= 9) {
      columns = 3;
      rows = 3;
    } else if (count <= 12) {
      columns = 4;
      rows = 3;
    } else {
      // For more than 12, use 4 columns and calculate rows
      columns = 4;
      rows = Math.ceil(count / 4);
    }

    // Calculate cell dimensions
    const cellWidth = `${100 / columns}%`;
    const cellHeight = `${100 / rows}%`;

    return {
      columns,
      rows,
      cellWidth,
      cellHeight,
      mode: 'grid'
    };
  }

  /**
   * Calculate speaker layout configuration
   * Requirements: 7.2
   * 
   * @param {number} count - Number of participants
   * @returns {Object} Speaker layout configuration
   */
  calculateSpeakerLayout(count) {
    return {
      mainSize: LAYOUT_MODES.speaker.mainSize,
      thumbnailSize: LAYOUT_MODES.speaker.thumbnailSize,
      thumbnailCount: count - 1,
      mode: 'speaker'
    };
  }

  /**
   * Calculate sidebar layout configuration
   * Requirements: 7.3
   * 
   * @param {number} count - Number of participants
   * @returns {Object} Sidebar layout configuration
   */
  calculateSidebarLayout(count) {
    return {
      mainSize: LAYOUT_MODES.sidebar.mainSize,
      sidebarWidth: LAYOUT_MODES.sidebar.sidebarWidth,
      sidebarCount: count - 1,
      mode: 'sidebar'
    };
  }

  /**
   * Calculate picture-in-picture layout configuration
   * Requirements: 7.4
   * 
   * @param {number} count - Number of participants
   * @returns {Object} PIP layout configuration
   */
  calculatePipLayout(count) {
    return {
      position: LAYOUT_MODES.pip.position,
      size: LAYOUT_MODES.pip.size,
      mode: 'pip'
    };
  }

  /**
   * Update the layout of video feeds
   * Requirements: 2.2, 2.3, 2.5
   */
  updateLayout() {
    const layout = this.calculateLayout();

    console.log(`📐 Updating layout:`, layout);

    // Apply layout based on mode
    switch (layout.mode) {
      case 'grid':
        this.applyGridLayout(layout);
        break;
      case 'speaker':
        this.applySpeakerLayout(layout);
        break;
      case 'sidebar':
        this.applySidebarLayout(layout);
        break;
      case 'pip':
        this.applyPipLayout(layout);
        break;
    }

    // Update container data attribute
    this.container.dataset.layoutMode = this.layoutMode;
    this.container.dataset.participantCount = this.videoFeeds.size;
  }

  /**
   * Apply grid layout to video feeds
   * Requirements: 2.2, 2.3
   * 
   * @param {Object} layout - Layout configuration
   */
  applyGridLayout(layout) {
    // Reset PIP-specific styles if coming from PIP mode
    this.gridWrapper.style.position = 'static';
    this.gridWrapper.style.left = '';
    this.gridWrapper.style.top = '';
    this.gridWrapper.style.right = '';
    this.gridWrapper.style.bottom = '';
    this.gridWrapper.style.zIndex = '';
    this.gridWrapper.style.cursor = '';
    this.gridWrapper.style.boxShadow = '';
    this.gridWrapper.style.borderRadius = '';
    this.gridWrapper.style.overflow = '';

    // Set grid wrapper styles
    this.gridWrapper.style.display = 'grid';
    this.gridWrapper.style.gridTemplateColumns = `repeat(${layout.columns}, 1fr)`;
    this.gridWrapper.style.gridTemplateRows = `repeat(${layout.rows}, 1fr)`;
    this.gridWrapper.style.gap = '8px';
    this.gridWrapper.style.width = '100%';
    this.gridWrapper.style.height = '100%';
    this.gridWrapper.style.padding = '8px';

    // Apply to each video feed and ensure they're visible
    this.videoFeeds.forEach((feedData, userId) => {
      const feed = feedData.element;
      feed.style.display = 'block'; // Ensure visible (reset from PIP)
      feed.style.width = '100%';
      feed.style.height = '100%';
      feed.style.position = 'relative';

      // Prioritize pinned feeds (place them first)
      if (this.pinnedFeeds.has(userId)) {
        feed.style.order = '-1';
        feed.classList.add('pinned');
      } else {
        feed.style.order = '0';
        feed.classList.remove('pinned');
      }
    });
  }

  /**
   * Apply speaker layout to video feeds
   * Requirements: 5.1, 5.2, 7.2
   * 
   * @param {Object} layout - Layout configuration
   */
  applySpeakerLayout(layout) {
    // Reset PIP-specific styles if coming from PIP mode
    this.gridWrapper.style.position = 'static';
    this.gridWrapper.style.left = '';
    this.gridWrapper.style.top = '';
    this.gridWrapper.style.right = '';
    this.gridWrapper.style.bottom = '';
    this.gridWrapper.style.zIndex = '';
    this.gridWrapper.style.cursor = '';
    this.gridWrapper.style.boxShadow = '';
    this.gridWrapper.style.borderRadius = '';
    this.gridWrapper.style.overflow = '';
    this.gridWrapper.style.width = '100%';
    this.gridWrapper.style.height = '100%';

    // Set grid wrapper to flex layout
    this.gridWrapper.style.display = 'flex';
    this.gridWrapper.style.flexDirection = 'column';
    this.gridWrapper.style.gap = '8px';
    this.gridWrapper.style.padding = '8px';

    // Determine main feed - prioritize screen share, then pinned, then first feed
    // Requirements: 5.1, 5.2
    let mainFeedKey = null;

    // Check if there's an active screen share - it gets priority
    if (this.screenShareFeed) {
      mainFeedKey = `${this.screenShareFeed}-screen`;
      console.log(`📺 Screen share will be displayed prominently in speaker view`);
    } else if (this.pinnedFeeds.size > 0) {
      // Use first pinned feed
      mainFeedKey = Array.from(this.pinnedFeeds)[0];
    } else {
      // Use first available feed
      mainFeedKey = Array.from(this.videoFeeds.keys())[0];
    }

    // Create thumbnail container for non-main feeds
    let thumbnailContainer = this.gridWrapper.querySelector('.thumbnail-container');
    if (!thumbnailContainer) {
      thumbnailContainer = document.createElement('div');
      thumbnailContainer.className = 'thumbnail-container';
      thumbnailContainer.style.display = 'flex';
      thumbnailContainer.style.gap = '8px';
      thumbnailContainer.style.flexWrap = 'wrap';
      thumbnailContainer.style.justifyContent = 'center';
      thumbnailContainer.style.order = '1';
    }

    // Apply styles to feeds
    this.videoFeeds.forEach((feedData, feedKey) => {
      const feed = feedData.element;

      if (feedKey === mainFeedKey) {
        // Main speaker or screen share - prominent display
        feed.style.width = '100%';
        feed.style.height = layout.mainSize;
        feed.style.order = '0';
        feed.style.flex = 'none';
        feed.classList.add('main-speaker');

        // Add screen share specific class if applicable
        if (feedData.metadata.isScreenShare) {
          feed.classList.add('main-screen-share');
        }

        // Ensure it's directly in grid wrapper
        if (feed.parentNode !== this.gridWrapper) {
          this.gridWrapper.appendChild(feed);
        }
      } else {
        // Thumbnail
        feed.style.width = layout.thumbnailSize;
        feed.style.height = layout.thumbnailSize;
        feed.style.order = '1';
        feed.style.flex = 'none';
        feed.classList.remove('main-speaker', 'main-screen-share');

        // Move to thumbnail container
        if (feed.parentNode !== thumbnailContainer) {
          thumbnailContainer.appendChild(feed);
        }
      }
    });

    // Add thumbnail container to grid if it has children
    if (thumbnailContainer.children.length > 0 && thumbnailContainer.parentNode !== this.gridWrapper) {
      this.gridWrapper.appendChild(thumbnailContainer);
    }
  }

  /**
   * Apply sidebar layout to video feeds
   * Requirements: 7.3
   * 
   * @param {Object} layout - Layout configuration
   */
  applySidebarLayout(layout) {
    // Reset PIP-specific styles if coming from PIP mode
    this.gridWrapper.style.position = 'static';
    this.gridWrapper.style.left = '';
    this.gridWrapper.style.top = '';
    this.gridWrapper.style.right = '';
    this.gridWrapper.style.bottom = '';
    this.gridWrapper.style.zIndex = '';
    this.gridWrapper.style.cursor = '';
    this.gridWrapper.style.boxShadow = '';
    this.gridWrapper.style.borderRadius = '';
    this.gridWrapper.style.overflow = '';
    this.gridWrapper.style.width = '100%';
    this.gridWrapper.style.height = '100%';

    // Set grid wrapper to flex layout
    this.gridWrapper.style.display = 'flex';
    this.gridWrapper.style.flexDirection = 'row';
    this.gridWrapper.style.gap = '8px';
    this.gridWrapper.style.padding = '8px';

    // Get first feed as main content
    let mainFeedUserId = null;
    if (this.pinnedFeeds.size > 0) {
      mainFeedUserId = Array.from(this.pinnedFeeds)[0];
    } else {
      mainFeedUserId = Array.from(this.videoFeeds.keys())[0];
    }

    // Apply styles to feeds
    this.videoFeeds.forEach((feedData, userId) => {
      const feed = feedData.element;

      if (userId === mainFeedUserId) {
        // Main content
        feed.style.width = layout.mainSize;
        feed.style.height = '100%';
        feed.style.order = '0';
        feed.classList.add('main-content');
      } else {
        // Sidebar
        feed.style.width = layout.sidebarWidth;
        feed.style.height = 'auto';
        feed.style.order = '1';
        feed.classList.remove('main-content');
      }
    });
  }

  /**
   * Apply picture-in-picture layout to video feeds
   * Requirements: 7.4
   * 
   * @param {Object} layout - Layout configuration
   */
  applyPipLayout(layout) {
    // Set grid wrapper to absolute positioning
    this.gridWrapper.style.display = 'block';
    this.gridWrapper.style.position = 'fixed';
    this.gridWrapper.style.width = `${layout.size.width}px`;
    this.gridWrapper.style.height = `${layout.size.height}px`;
    this.gridWrapper.style.zIndex = '1000';
    this.gridWrapper.style.padding = '0';
    this.gridWrapper.style.cursor = 'move';
    this.gridWrapper.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.3)';
    this.gridWrapper.style.borderRadius = '12px';
    this.gridWrapper.style.overflow = 'hidden';

    // Clear any previous positioning
    this.gridWrapper.style.top = '';
    this.gridWrapper.style.right = '';
    this.gridWrapper.style.bottom = '';
    this.gridWrapper.style.left = '';

    // Position based on layout.position or saved position
    const savedPosition = this.loadPipPosition();
    if (savedPosition) {
      this.gridWrapper.style.left = savedPosition.left;
      this.gridWrapper.style.top = savedPosition.top;
    } else {
      const positions = {
        'top-left': { top: '20px', left: '20px' },
        'top-right': { top: '20px', right: '20px' },
        'bottom-left': { bottom: '20px', left: '20px' },
        'bottom-right': { bottom: '20px', right: '20px' }
      };

      const pos = positions[layout.position] || positions['bottom-right'];
      Object.assign(this.gridWrapper.style, pos);
    }

    // Show only first video feed in PIP
    let isFirst = true;
    this.videoFeeds.forEach((feedData) => {
      const feed = feedData.element;
      if (isFirst) {
        feed.style.display = 'block';
        feed.style.width = '100%';
        feed.style.height = '100%';
        isFirst = false;
      } else {
        feed.style.display = 'none';
      }
    });
  }

  /**
   * Setup drag handlers for PIP mode
   * Requirements: 7.4
   */
  setupPipDragHandlers() {
    console.log('🖱️ Setting up PIP drag handlers');

    this.pipMouseDownHandler = (e) => {
      // Don't drag if clicking on video controls
      if (e.target.closest('.video-controls') || e.target.closest('button')) {
        return;
      }

      this.pipDragState.isDragging = true;
      this.pipDragState.startX = e.clientX;
      this.pipDragState.startY = e.clientY;

      // Get current position
      const rect = this.gridWrapper.getBoundingClientRect();
      this.pipDragState.offsetX = rect.left;
      this.pipDragState.offsetY = rect.top;

      // Add dragging class
      this.gridWrapper.classList.add('dragging');

      e.preventDefault();
    };

    this.pipMouseMoveHandler = (e) => {
      if (!this.pipDragState.isDragging) return;

      const deltaX = e.clientX - this.pipDragState.startX;
      const deltaY = e.clientY - this.pipDragState.startY;

      const newLeft = this.pipDragState.offsetX + deltaX;
      const newTop = this.pipDragState.offsetY + deltaY;

      // Constrain to viewport
      const maxLeft = window.innerWidth - this.gridWrapper.offsetWidth;
      const maxTop = window.innerHeight - this.gridWrapper.offsetHeight;

      const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
      const constrainedTop = Math.max(0, Math.min(newTop, maxTop));

      // Clear any previous positioning
      this.gridWrapper.style.right = '';
      this.gridWrapper.style.bottom = '';

      // Apply new position
      this.gridWrapper.style.left = `${constrainedLeft}px`;
      this.gridWrapper.style.top = `${constrainedTop}px`;

      e.preventDefault();
    };

    this.pipMouseUpHandler = () => {
      if (this.pipDragState.isDragging) {
        this.pipDragState.isDragging = false;
        this.gridWrapper.classList.remove('dragging');

        // Save position to localStorage
        this.savePipPosition({
          left: this.gridWrapper.style.left,
          top: this.gridWrapper.style.top
        });
      }
    };

    // Add event listeners
    this.gridWrapper.addEventListener('mousedown', this.pipMouseDownHandler);
    document.addEventListener('mousemove', this.pipMouseMoveHandler);
    document.addEventListener('mouseup', this.pipMouseUpHandler);

    console.log('✅ PIP drag handlers setup complete');
  }

  /**
   * Remove drag handlers for PIP mode
   * Requirements: 7.4
   */
  removePipDragHandlers() {
    if (this.pipMouseDownHandler) {
      this.gridWrapper.removeEventListener('mousedown', this.pipMouseDownHandler);
      document.removeEventListener('mousemove', this.pipMouseMoveHandler);
      document.removeEventListener('mouseup', this.pipMouseUpHandler);

      this.pipMouseDownHandler = null;
      this.pipMouseMoveHandler = null;
      this.pipMouseUpHandler = null;

      this.gridWrapper.classList.remove('dragging');
      this.gridWrapper.style.cursor = '';

      console.log('✅ PIP drag handlers removed');
    }
  }

  /**
   * Save PIP position to localStorage
   * Requirements: 7.4, 7.5
   * 
   * @param {Object} position - Position object with left and top
   */
  savePipPosition(position) {
    try {
      localStorage.setItem('teamup-pip-position', JSON.stringify(position));
      console.log('💾 PIP position saved to localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to save PIP position to localStorage:', error);
    }
  }

  /**
   * Load PIP position from localStorage
   * Requirements: 7.4, 7.5
   * 
   * @returns {Object|null} Saved position or null
   */
  loadPipPosition() {
    try {
      const savedPosition = localStorage.getItem('teamup-pip-position');
      if (savedPosition) {
        const position = JSON.parse(savedPosition);
        console.log('💾 PIP position loaded from localStorage');
        return position;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load PIP position from localStorage:', error);
    }
    return null;
  }

  /**
   * Set the layout mode
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   * 
   * @param {string} mode - Layout mode (grid, speaker, sidebar, pip)
   */
  setLayoutMode(mode) {
    if (!LAYOUT_MODES[mode]) {
      console.warn(`⚠️ Invalid layout mode: ${mode}`);
      return;
    }

    console.log(`📐 Setting layout mode to: ${mode}`);

    // Remove PIP drag handlers if switching away from PIP
    if (this.layoutMode === 'pip' && mode !== 'pip') {
      this.removePipDragHandlers();
    }

    this.layoutMode = mode;
    this.saveLayoutMode(mode);
    this.updateLayout();

    // Add PIP drag handlers if switching to PIP
    if (mode === 'pip') {
      this.setupPipDragHandlers();
    }

    // Announce layout change to screen readers
    // Requirements: 3.4, 7.2
    const layoutNames = {
      grid: 'Grid View',
      speaker: 'Speaker View',
      sidebar: 'Sidebar View',
      pip: 'Picture-in-Picture'
    };
    this.announceToScreenReader(`Layout changed to ${layoutNames[mode]}`);

    console.log(`✅ Layout mode set to: ${mode}`);
  }

  /**
   * Save layout mode to localStorage
   * Requirements: 7.5
   * 
   * @param {string} mode - Layout mode to save
   */
  saveLayoutMode(mode) {
    try {
      localStorage.setItem('teamup-video-layout-mode', mode);
      console.log(`💾 Layout mode saved to localStorage: ${mode}`);
    } catch (error) {
      console.warn('⚠️ Failed to save layout mode to localStorage:', error);
    }
  }

  /**
   * Load layout mode from localStorage
   * Requirements: 7.5
   * 
   * @returns {string|null} Saved layout mode or null
   */
  loadLayoutMode() {
    try {
      const savedMode = localStorage.getItem('teamup-video-layout-mode');
      if (savedMode && LAYOUT_MODES[savedMode]) {
        console.log(`💾 Layout mode loaded from localStorage: ${savedMode}`);
        return savedMode;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load layout mode from localStorage:', error);
    }
    return null;
  }

  /**
   * Pin a video feed
   * Requirements: 9.1, 9.2, 9.3
   * 
   * @param {string} userId - User ID to pin
   */
  pinFeed(userId) {
    if (!this.videoFeeds.has(userId)) {
      console.warn(`⚠️ Cannot pin non-existent video feed for user ${userId}`);
      return;
    }

    // Check pin limit (max 4 pinned feeds)
    if (this.pinnedFeeds.size >= 4 && !this.pinnedFeeds.has(userId)) {
      console.warn(`⚠️ Maximum of 4 feeds can be pinned`);
      return;
    }

    console.log(`📌 Pinning video feed for user ${userId}`);

    this.pinnedFeeds.add(userId);

    // Update feed data
    const feedData = this.videoFeeds.get(userId);
    feedData.isPinned = true;

    // Add visual indicator
    feedData.element.classList.add('pinned');
    const pinBtn = feedData.element.querySelector('.pin-btn');
    if (pinBtn) {
      pinBtn.classList.add('active');
      pinBtn.title = 'Unpin video';
    }

    // Update layout
    this.updateLayout();

    // Announce to screen readers
    // Requirements: 3.4, 9.1
    const userName = feedData.metadata.name || userId;
    this.announceToScreenReader(`${userName}'s video pinned`);

    console.log(`✅ Video feed pinned for user ${userId}`);
  }

  /**
   * Unpin a video feed
   * Requirements: 9.5
   * 
   * @param {string} userId - User ID to unpin
   */
  unpinFeed(userId) {
    if (!this.pinnedFeeds.has(userId)) {
      console.warn(`⚠️ Video feed for user ${userId} is not pinned`);
      return;
    }

    console.log(`📌 Unpinning video feed for user ${userId}`);

    this.pinnedFeeds.delete(userId);

    // Update feed data
    const feedData = this.videoFeeds.get(userId);
    if (feedData) {
      feedData.isPinned = false;

      // Remove visual indicator
      feedData.element.classList.remove('pinned');
      const pinBtn = feedData.element.querySelector('.pin-btn');
      if (pinBtn) {
        pinBtn.classList.remove('active');
        pinBtn.title = 'Pin video';
      }
    }

    // Update layout
    this.updateLayout();

    // Announce to screen readers
    // Requirements: 3.4, 9.5
    const userName = feedData.metadata.name || userId;
    this.announceToScreenReader(`${userName}'s video unpinned`);

    console.log(`✅ Video feed unpinned for user ${userId}`);
  }

  /**
   * Toggle pin state of a video feed
   * Requirements: 9.1, 9.5
   * 
   * @param {string} userId - User ID to toggle pin
   */
  togglePinFeed(userId) {
    if (this.pinnedFeeds.has(userId)) {
      this.unpinFeed(userId);
    } else {
      this.pinFeed(userId);
    }
  }

  /**
   * Set screen share feed
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   * 
   * @param {string} userId - User ID sharing screen
   * @param {MediaStream} stream - Screen share stream
   * @param {Object} metadata - Additional metadata (name, etc.)
   */
  setScreenShare(userId, stream, metadata = {}) {
    console.log(`🖥️ Setting screen share for user ${userId}`);

    // Remove existing screen share if any
    if (this.screenShareFeed) {
      this.clearScreenShare();
    }

    // Store previous layout mode for restoration
    this.previousLayoutMode = this.layoutMode;

    // Create screen share feed element with special styling
    const screenShareElement = this.createScreenShareElement(userId, stream, metadata);

    // Store screen share info
    this.screenShareFeed = userId;
    this.videoFeeds.set(`${userId}-screen`, {
      element: screenShareElement,
      stream: stream,
      metadata: {
        ...metadata,
        isScreenShare: true,
        name: metadata.name || userId
      },
      isPinned: false
    });

    // Add to grid
    this.gridWrapper.appendChild(screenShareElement);

    // Automatically switch to speaker layout for prominent screen share display
    // Requirements: 5.1
    if (this.layoutMode !== 'speaker') {
      this.setLayoutMode('speaker');
    } else {
      // If already in speaker mode, just update layout
      this.updateLayout();
    }

    // Announce screen share to screen readers
    // Requirements: 3.4
    const userName = metadata.name || userId;
    this.announceToScreenReader(`${userName} started screen sharing`);

    console.log(`✅ Screen share set for user ${userId}`);
  }

  /**
   * Create screen share element with presenter info and controls
   * Requirements: 5.3, 5.4, 6.1
   * 
   * @param {string} userId - User ID sharing screen
   * @param {MediaStream} stream - Screen share stream
   * @param {Object} metadata - Additional metadata
   * @returns {HTMLElement} The screen share element
   */
  createScreenShareElement(userId, stream, metadata) {
    // Create container
    const screenContainer = document.createElement('div');
    screenContainer.className = 'video-feed screen-share-feed';
    screenContainer.dataset.userId = `${userId}-screen`;
    screenContainer.dataset.isScreenShare = 'true';

    // Create video element
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsinline = true;
    video.muted = true; // Screen share should be muted locally
    video.srcObject = stream;
    video.className = 'video-element screen-share-video';

    // Create presenter overlay with name and status
    // Requirements: 5.4
    const presenterOverlay = document.createElement('div');
    presenterOverlay.className = 'screen-share-presenter-overlay';

    const presenterInfo = document.createElement('div');
    presenterInfo.className = 'presenter-info';

    const presenterIcon = document.createElement('i');
    presenterIcon.className = 'fas fa-desktop';

    const presenterName = document.createElement('span');
    presenterName.className = 'presenter-name';
    presenterName.textContent = `${metadata.name || userId} is presenting`;

    const statusIndicator = document.createElement('span');
    statusIndicator.className = 'screen-share-status';
    statusIndicator.innerHTML = '<i class="fas fa-circle"></i> Live';

    presenterInfo.appendChild(presenterIcon);
    presenterInfo.appendChild(presenterName);
    presenterInfo.appendChild(statusIndicator);

    // Create control buttons
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'screen-share-controls';

    // Fullscreen button
    // Requirements: 5.3
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'screen-share-btn fullscreen-btn';
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreenBtn.title = 'Fullscreen';
    fullscreenBtn.addEventListener('click', () => this.toggleScreenShareFullscreen(screenContainer));

    // Stop sharing button (only visible for the presenter)
    // Requirements: 6.1
    const stopSharingBtn = document.createElement('button');
    stopSharingBtn.className = 'screen-share-btn stop-sharing-btn';
    stopSharingBtn.innerHTML = '<i class="fas fa-stop-circle"></i> Stop Sharing';
    stopSharingBtn.title = 'Stop sharing your screen';
    stopSharingBtn.dataset.userId = userId;

    // Only show stop button if this is the local user's screen share
    if (metadata.isLocal) {
      stopSharingBtn.style.display = 'flex';
      stopSharingBtn.addEventListener('click', () => this.handleStopSharing(userId));
    } else {
      stopSharingBtn.style.display = 'none';
    }

    controlsContainer.appendChild(fullscreenBtn);
    controlsContainer.appendChild(stopSharingBtn);

    presenterOverlay.appendChild(presenterInfo);
    presenterOverlay.appendChild(controlsContainer);

    // Assemble screen share feed
    screenContainer.appendChild(video);
    screenContainer.appendChild(presenterOverlay);

    // Add animation
    screenContainer.style.animation = 'screenShareFadeIn 0.4s ease';

    return screenContainer;
  }

  /**
   * Toggle fullscreen mode for screen share
   * Requirements: 5.3
   * 
   * @param {HTMLElement} screenElement - Screen share element
   */
  toggleScreenShareFullscreen(screenElement) {
    try {
      if (!document.fullscreenElement) {
        console.log('🖥️ Entering fullscreen mode for screen share');

        screenElement.requestFullscreen().then(() => {
          console.log('✅ Entered fullscreen mode');

          // Update fullscreen button icon
          const fullscreenBtn = screenElement.querySelector('.fullscreen-btn');
          if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            fullscreenBtn.title = 'Exit fullscreen';
          }
        }).catch(err => {
          console.error(`❌ Failed to enter fullscreen:`, err);
        });
      } else {
        console.log('🖥️ Exiting fullscreen mode');

        document.exitFullscreen().then(() => {
          console.log('✅ Exited fullscreen mode');

          // Update fullscreen button icon
          const fullscreenBtn = screenElement.querySelector('.fullscreen-btn');
          if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.title = 'Fullscreen';
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to toggle fullscreen:', error);
    }
  }

  /**
   * Handle stop sharing button click
   * Requirements: 6.1, 6.2
   * 
   * @param {string} userId - User ID to stop sharing
   */
  handleStopSharing(userId) {
    console.log(`🖥️ Stop sharing requested for user ${userId}`);

    // Emit event that can be handled by the app
    const event = new CustomEvent('stop-screen-share', {
      detail: { userId }
    });
    this.container.dispatchEvent(event);

    // Clear screen share from grid
    this.clearScreenShare();
  }

  /**
   * Clear screen share
   * Requirements: 6.2, 6.3
   */
  clearScreenShare() {
    if (!this.screenShareFeed) {
      console.log('⚠️ No screen share to clear');
      return;
    }

    console.log(`🖥️ Clearing screen share for user ${this.screenShareFeed}`);

    const screenShareKey = `${this.screenShareFeed}-screen`;
    const feedData = this.videoFeeds.get(screenShareKey);

    if (feedData) {
      // Add fade out animation
      feedData.element.style.animation = 'screenShareFadeOut 0.3s ease';

      // Remove after animation
      setTimeout(() => {
        // Stop video stream
        const video = feedData.element.querySelector('.video-element');
        if (video && video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }

        // Remove from DOM
        if (feedData.element.parentNode) {
          feedData.element.parentNode.removeChild(feedData.element);
        }

        // Remove from map
        this.videoFeeds.delete(screenShareKey);

        console.log(`✅ Screen share feed removed`);
      }, 300);
    }

    // Clear screen share reference
    const previousScreenShareUser = this.screenShareFeed;
    this.screenShareFeed = null;

    // Restore previous layout mode if it was changed
    // Requirements: 6.3
    if (this.previousLayoutMode && this.layoutMode === 'speaker') {
      this.setLayoutMode(this.previousLayoutMode);
      this.previousLayoutMode = null;
    } else {
      // Just update the current layout
      this.updateLayout();
    }

    // Announce screen share stopped to screen readers
    // Requirements: 3.4
    if (previousScreenShareUser) {
      this.announceToScreenReader('Screen sharing stopped');
    }

    console.log(`✅ Screen share cleared`);
  }

  /**
   * Toggle fullscreen for a video feed
   * 
   * @param {HTMLElement} feedElement - Video feed element
   */
  toggleFullscreen(feedElement) {
    if (!document.fullscreenElement) {
      feedElement.requestFullscreen().catch(err => {
        console.error(`❌ Failed to enter fullscreen:`, err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Get all video feeds
   * 
   * @returns {Map} Map of user IDs to video feed data
   */
  getVideoFeeds() {
    return this.videoFeeds;
  }

  /**
   * Get pinned feeds
   * 
   * @returns {Set} Set of pinned user IDs
   */
  getPinnedFeeds() {
    return this.pinnedFeeds;
  }

  /**
   * Clear all video feeds
   */
  clearAll() {
    console.log('🗑️ Clearing all video feeds');

    // Remove all feeds
    this.videoFeeds.forEach((feedData, userId) => {
      this.removeVideoFeed(userId);
    });

    // Clear collections
    this.videoFeeds.clear();
    this.pinnedFeeds.clear();
    this.screenShareFeed = null;

    console.log('✅ All video feeds cleared');
  }

  /**
   * Destroy the video grid layout
   */
  destroy() {
    console.log('🗑️ Destroying VideoGridLayout');

    // Remove PIP drag handlers if active
    if (this.layoutMode === 'pip') {
      this.removePipDragHandlers();
    }

    // Clear all feeds
    this.clearAll();

    // Remove container
    if (this.gridWrapper && this.gridWrapper.parentNode) {
      this.gridWrapper.parentNode.removeChild(this.gridWrapper);
    }

    console.log('✅ VideoGridLayout destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoGridLayout;
} else if (typeof window !== 'undefined') {
  window.VideoGridLayout = VideoGridLayout;
}
