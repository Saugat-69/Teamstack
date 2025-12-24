/**
 * VideoFeedUI - UI Component for Individual Video Feeds
 * Creates and manages video feed containers with overlays and controls
 */

class VideoFeedUI {
  constructor(userId, userName, isLocal = false) {
    this.userId = userId;
    this.userName = userName;
    this.isLocal = isLocal;
    
    // State
    this.isPinned = false;
    this.isSpeaking = false;
    this.isScreenShare = false;
    this.isAdminDisabled = false;
    this.connectionQuality = 'good';
    this.videoEnabled = true;
    
    // Elements
    this.container = null;
    this.videoElement = null;
    this.placeholder = null;
    this.loadingOverlay = null;
    
    // Event handlers
    this.onPinClick = null;
    this.onFullscreenClick = null;
    
    console.log(`✅ VideoFeedUI created for ${userName} (${userId})`);
  }

  /**
   * Create and return the video feed container
   */
  create() {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'video-feed';
    this.container.id = `video-feed-${this.userId}`;
    this.container.setAttribute('data-user-id', this.userId);
    this.container.setAttribute('data-user-name', this.userName);
    
    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsinline = true;
    this.videoElement.muted = this.isLocal; // Mute local video to prevent echo
    this.videoElement.className = this.isLocal ? 'mirrored' : '';
    
    // Create placeholder
    this.placeholder = this.createPlaceholder();
    
    // Create loading overlay
    this.loadingOverlay = this.createLoadingOverlay();
    
    // Create overlays
    const nameOverlay = this.createNameOverlay();
    const hoverControls = this.createHoverControls();
    const qualityIndicator = this.createQualityIndicator();
    const speakingIndicator = this.createSpeakingIndicator();
    const pinIndicator = this.createPinIndicator();
    
    // Append elements
    this.container.appendChild(this.videoElement);
    this.container.appendChild(this.placeholder);
    this.container.appendChild(this.loadingOverlay);
    this.container.appendChild(nameOverlay);
    this.container.appendChild(hoverControls);
    this.container.appendChild(qualityIndicator);
    this.container.appendChild(speakingIndicator);
    this.container.appendChild(pinIndicator);
    
    // Show placeholder initially if video is disabled
    if (!this.videoEnabled) {
      this.showPlaceholder();
    }
    
    return this.container;
  }

  /**
   * Create placeholder for disabled camera
   */
  createPlaceholder() {
    const placeholder = document.createElement('div');
    placeholder.className = 'video-placeholder hidden';
    
    const initials = this.getInitials(this.userName);
    
    placeholder.innerHTML = `
      <div class="video-placeholder-avatar">${initials}</div>
      <div class="video-placeholder-name">${this.userName}</div>
      <div class="video-placeholder-status">
        <i class="fas fa-video-slash"></i>
        <span>Camera off</span>
      </div>
    `;
    
    return placeholder;
  }

  /**
   * Create loading overlay
   */
  createLoadingOverlay() {
    const loading = document.createElement('div');
    loading.className = 'video-loading hidden';
    
    loading.innerHTML = `
      <div class="video-loading-spinner"></div>
      <div class="video-loading-text">Connecting...</div>
    `;
    
    return loading;
  }

  /**
   * Create name overlay
   */
  createNameOverlay() {
    const overlay = document.createElement('div');
    overlay.className = `video-name-overlay ${this.isLocal ? 'you' : ''}`;
    
    const displayName = this.isLocal ? `${this.userName} (You)` : this.userName;
    
    overlay.innerHTML = `
      ${this.isLocal ? '<i class="fas fa-user"></i>' : ''}
      <span>${displayName}</span>
    `;
    
    return overlay;
  }

  /**
   * Create hover controls
   */
  createHoverControls() {
    const controls = document.createElement('div');
    controls.className = 'video-hover-controls';
    
    // Pin button
    const pinBtn = document.createElement('button');
    pinBtn.className = 'video-control-icon pin-btn';
    pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
    pinBtn.title = 'Pin video';
    pinBtn.setAttribute('aria-label', 'Pin video');
    pinBtn.addEventListener('click', () => this.handlePinClick());
    
    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'video-control-icon fullscreen-btn';
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreenBtn.title = 'Fullscreen';
    fullscreenBtn.setAttribute('aria-label', 'Fullscreen');
    fullscreenBtn.addEventListener('click', () => this.handleFullscreenClick());
    
    controls.appendChild(pinBtn);
    controls.appendChild(fullscreenBtn);
    
    return controls;
  }

  /**
   * Create connection quality indicator
   */
  createQualityIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'video-quality-indicator good';
    indicator.setAttribute('data-quality', 'Good connection');
    
    indicator.innerHTML = '<i class="fas fa-signal"></i>';
    
    return indicator;
  }

  /**
   * Create speaking indicator
   */
  createSpeakingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'video-speaking-indicator';
    
    indicator.innerHTML = `
      <div class="speaking-bars">
        <div class="speaking-bar"></div>
        <div class="speaking-bar"></div>
        <div class="speaking-bar"></div>
      </div>
    `;
    
    return indicator;
  }

  /**
   * Create pin indicator
   */
  createPinIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'video-pin-indicator';
    
    indicator.innerHTML = '<i class="fas fa-thumbtack"></i> Pinned';
    
    return indicator;
  }

  /**
   * Set video stream
   */
  setStream(stream) {
    if (this.videoElement && stream) {
      this.videoElement.srcObject = stream;
      this.hideLoading();
      this.hidePlaceholder();
      this.videoEnabled = true;
      console.log(`✅ Stream set for ${this.userName}`);
    }
  }

  /**
   * Remove video stream
   */
  removeStream() {
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.showPlaceholder();
      this.videoEnabled = false;
      console.log(`📹 Stream removed for ${this.userName}`);
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.loadingOverlay?.classList.remove('hidden');
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    this.loadingOverlay?.classList.add('hidden');
  }

  /**
   * Show placeholder
   */
  showPlaceholder() {
    this.placeholder?.classList.remove('hidden');
    this.videoElement?.classList.add('hidden');
  }

  /**
   * Hide placeholder
   */
  hidePlaceholder() {
    this.placeholder?.classList.add('hidden');
    this.videoElement?.classList.remove('hidden');
  }

  /**
   * Set pinned state
   */
  setPinned(pinned) {
    this.isPinned = pinned;
    
    if (pinned) {
      this.container?.classList.add('pinned');
      const pinBtn = this.container?.querySelector('.pin-btn');
      if (pinBtn) {
        pinBtn.classList.add('active');
        pinBtn.title = 'Unpin video';
      }
    } else {
      this.container?.classList.remove('pinned');
      const pinBtn = this.container?.querySelector('.pin-btn');
      if (pinBtn) {
        pinBtn.classList.remove('active');
        pinBtn.title = 'Pin video';
      }
    }
  }

  /**
   * Set speaking state
   */
  setSpeaking(speaking) {
    this.isSpeaking = speaking;
    
    if (speaking) {
      this.container?.classList.add('speaking');
      const indicator = this.container?.querySelector('.video-speaking-indicator');
      indicator?.classList.add('active');
    } else {
      this.container?.classList.remove('speaking');
      const indicator = this.container?.querySelector('.video-speaking-indicator');
      indicator?.classList.remove('active');
    }
  }

  /**
   * Set connection quality
   */
  setConnectionQuality(quality) {
    this.connectionQuality = quality;
    
    const indicator = this.container?.querySelector('.video-quality-indicator');
    if (!indicator) return;
    
    // Remove all quality classes
    indicator.classList.remove('excellent', 'good', 'fair', 'poor');
    
    // Add new quality class
    indicator.classList.add(quality);
    
    // Update icon and tooltip
    const qualityInfo = {
      excellent: { icon: 'fa-signal', text: 'Excellent connection' },
      good: { icon: 'fa-signal', text: 'Good connection' },
      fair: { icon: 'fa-signal', text: 'Fair connection' },
      poor: { icon: 'fa-exclamation-triangle', text: 'Poor connection' }
    };
    
    const info = qualityInfo[quality] || qualityInfo.good;
    indicator.innerHTML = `<i class="fas ${info.icon}"></i>`;
    indicator.setAttribute('data-quality', info.text);
  }

  /**
   * Set screen share badge
   */
  setScreenShare(isScreenShare) {
    this.isScreenShare = isScreenShare;
    
    // Remove existing badge if any
    const existingBadge = this.container?.querySelector('.video-screen-share-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    if (isScreenShare) {
      const badge = document.createElement('div');
      badge.className = 'video-screen-share-badge';
      badge.innerHTML = `
        <i class="fas fa-desktop"></i>
        <span>${this.userName}'s screen</span>
      `;
      this.container?.appendChild(badge);
    }
  }

  /**
   * Set admin disabled state
   */
  setAdminDisabled(disabled) {
    this.isAdminDisabled = disabled;
    
    // Remove existing indicator if any
    const existingIndicator = this.container?.querySelector('.video-admin-disabled');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    if (disabled) {
      const indicator = document.createElement('div');
      indicator.className = 'video-admin-disabled';
      indicator.innerHTML = `
        <i class="fas fa-ban"></i>
        <div>Camera disabled by admin</div>
        <div class="video-admin-disabled-text">Contact the room admin to enable</div>
      `;
      this.container?.appendChild(indicator);
      this.showPlaceholder();
    }
  }

  /**
   * Handle pin button click
   */
  handlePinClick() {
    if (this.onPinClick) {
      this.onPinClick(this.userId, !this.isPinned);
    }
  }

  /**
   * Handle fullscreen button click
   */
  handleFullscreenClick() {
    if (this.onFullscreenClick) {
      this.onFullscreenClick(this.userId);
    } else {
      // Default fullscreen behavior
      if (this.container) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          this.container.requestFullscreen().catch(err => {
            console.error('Failed to enter fullscreen:', err);
          });
        }
      }
    }
  }

  /**
   * Get initials from name
   */
  getInitials(name) {
    if (!name) return '?';
    
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Update user name
   */
  updateName(newName) {
    this.userName = newName;
    
    // Update name overlay
    const nameOverlay = this.container?.querySelector('.video-name-overlay span');
    if (nameOverlay) {
      const displayName = this.isLocal ? `${newName} (You)` : newName;
      nameOverlay.textContent = displayName;
    }
    
    // Update placeholder
    const placeholderName = this.placeholder?.querySelector('.video-placeholder-name');
    if (placeholderName) {
      placeholderName.textContent = newName;
    }
    
    // Update placeholder avatar
    const placeholderAvatar = this.placeholder?.querySelector('.video-placeholder-avatar');
    if (placeholderAvatar) {
      placeholderAvatar.textContent = this.getInitials(newName);
    }
    
    // Update screen share badge if present
    const screenShareBadge = this.container?.querySelector('.video-screen-share-badge span');
    if (screenShareBadge) {
      screenShareBadge.textContent = `${newName}'s screen`;
    }
  }

  /**
   * Get container element
   */
  getContainer() {
    return this.container;
  }

  /**
   * Get video element
   */
  getVideoElement() {
    return this.videoElement;
  }

  /**
   * Destroy the video feed
   */
  destroy() {
    // Remove stream
    this.removeStream();
    
    // Remove event listeners
    const pinBtn = this.container?.querySelector('.pin-btn');
    const fullscreenBtn = this.container?.querySelector('.fullscreen-btn');
    
    if (pinBtn) {
      pinBtn.replaceWith(pinBtn.cloneNode(true));
    }
    if (fullscreenBtn) {
      fullscreenBtn.replaceWith(fullscreenBtn.cloneNode(true));
    }
    
    // Remove from DOM
    this.container?.remove();
    
    console.log(`🗑️ VideoFeedUI destroyed for ${this.userName}`);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoFeedUI;
} else if (typeof window !== 'undefined') {
  window.VideoFeedUI = VideoFeedUI;
}
