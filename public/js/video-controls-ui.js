/**
 * VideoControlsUI - UI Component for Video and Media Controls
 * Provides camera, screen share, layout, quality, and device controls
 */

class VideoControlsUI {
  constructor(mediaManager, container = document.body) {
    this.mediaManager = mediaManager;
    this.container = container;

    // State
    this.isVisible = false;
    this.currentLayout = 'grid';
    this.currentQuality = 'medium';

    // Elements
    this.controlsBar = null;
    this.cameraBtn = null;
    this.screenShareBtn = null;
    this.layoutBtn = null;
    this.qualityBtn = null;
    this.devicesBtn = null;

    // Dropdowns
    this.layoutDropdown = null;
    this.qualityDropdown = null;
    this.deviceDropdown = null;

    console.log('✅ VideoControlsUI initialized');
  }

  /**
   * Initialize and render the controls
   */
  init() {
    this.render();
    this.attachEventListeners();
    this.loadPreferences();
    console.log('✅ VideoControlsUI rendered');
  }

  /**
   * Render the complete controls bar
   */
  render() {
    // Create main controls bar
    this.controlsBar = document.createElement('div');
    this.controlsBar.className = 'media-controls-bar hidden';
    this.controlsBar.setAttribute('role', 'toolbar');
    this.controlsBar.setAttribute('aria-label', 'Media controls');

    // Build controls
    this.controlsBar.innerHTML = `
      ${this.renderMicrophoneButton()}
      ${this.renderCameraButton()}
      ${this.renderScreenShareButton()}
      <div class="control-divider"></div>
      ${this.renderLayoutSelector()}
      ${this.renderQualitySettings()}
      <div class="control-divider"></div>
      ${this.renderDeviceSelector()}
    `;

    // Append to container
    this.container.appendChild(this.controlsBar);

    // Cache element references
    this.cacheElements();

    // Update initial states
    this.updateMicrophoneButton(this.mediaManager.audioEnabled);
  }

  /**
   * Render microphone toggle button
   */
  renderMicrophoneButton() {
    return `
      <button 
        class="media-control-btn btn-microphone" 
        id="btnMicrophone"
        data-tooltip="Turn on microphone"
        aria-label="Toggle microphone"
        aria-pressed="false">
        <i class="fas fa-microphone"></i>
      </button>
    `;
  }

  /**
   * Render camera toggle button
   */
  renderCameraButton() {
    return `
      <button 
        class="media-control-btn btn-camera" 
        id="btnCamera"
        data-tooltip="Turn on camera"
        aria-label="Toggle camera"
        aria-pressed="false">
        <i class="fas fa-video"></i>
      </button>
    `;
  }

  /**
   * Render screen share button
   */
  renderScreenShareButton() {
    return `
      <button 
        class="media-control-btn btn-screen-share" 
        id="btnScreenShare"
        data-tooltip="Share screen"
        aria-label="Toggle screen sharing"
        aria-pressed="false">
        <i class="fas fa-desktop"></i>
      </button>
    `;
  }

  /**
   * Render layout mode selector
   */
  renderLayoutSelector() {
    return `
      <div class="layout-mode-selector">
        <button 
          class="media-control-btn btn-layout-mode" 
          id="btnLayoutMode"
          data-tooltip="Change layout"
          aria-label="Layout mode selector"
          aria-haspopup="true"
          aria-expanded="false">
          <i class="fas fa-th layout-icon"></i>
          <span class="layout-text">Grid</span>
        </button>
        <div class="layout-dropdown" id="layoutDropdown" role="menu">
          <div class="layout-option active" data-layout="grid" role="menuitem">
            <i class="fas fa-th"></i>
            <span>Grid View</span>
          </div>
          <div class="layout-option" data-layout="speaker" role="menuitem">
            <i class="fas fa-user"></i>
            <span>Speaker View</span>
          </div>
          <div class="layout-option" data-layout="sidebar" role="menuitem">
            <i class="fas fa-columns"></i>
            <span>Sidebar View</span>
          </div>
          <div class="layout-option" data-layout="pip" role="menuitem">
            <i class="fas fa-external-link-alt"></i>
            <span>Picture-in-Picture</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render video quality settings
   */
  renderQualitySettings() {
    return `
      <div class="quality-settings">
        <button 
          class="media-control-btn btn-quality" 
          id="btnQuality"
          data-tooltip="Video quality"
          aria-label="Video quality settings"
          aria-haspopup="true"
          aria-expanded="false">
          <i class="fas fa-cog"></i>
          <span class="quality-indicator">HD</span>
        </button>
        <div class="quality-dropdown" id="qualityDropdown" role="menu">
          <div class="quality-option" data-quality="low" role="menuitem">
            <div class="quality-label">
              <span class="quality-name">Low</span>
              <span class="quality-specs">320x240, 15fps</span>
            </div>
          </div>
          <div class="quality-option" data-quality="medium" role="menuitem">
            <div class="quality-label">
              <span class="quality-name">Medium</span>
              <span class="quality-specs">640x480, 24fps</span>
            </div>
          </div>
          <div class="quality-option active" data-quality="high" role="menuitem">
            <div class="quality-label">
              <span class="quality-name">High</span>
              <span class="quality-specs">1280x720, 30fps</span>
            </div>
          </div>
          <div class="quality-option" data-quality="hd" role="menuitem">
            <div class="quality-label">
              <span class="quality-name">Full HD</span>
              <span class="quality-specs">1920x1080, 30fps</span>
            </div>
          </div>
          <div class="quality-option" data-quality="auto" role="menuitem">
            <div class="quality-label">
              <span class="quality-name">Auto</span>
              <span class="quality-specs">Adaptive quality</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render device selector
   */
  renderDeviceSelector() {
    return `
      <div class="device-selector">
        <button 
          class="media-control-btn btn-devices" 
          id="btnDevices"
          data-tooltip="Device settings"
          aria-label="Device settings"
          aria-haspopup="true"
          aria-expanded="false">
          <i class="fas fa-sliders-h"></i>
        </button>
        <div class="device-dropdown" id="deviceDropdown" role="menu">
          <div class="device-group">
            <div class="device-group-label">
              <i class="fas fa-video"></i>
              <span>Camera</span>
            </div>
            <select class="device-select" id="cameraSelect" aria-label="Select camera">
              <option value="">No camera detected</option>
            </select>
          </div>
          <div class="device-group">
            <div class="device-group-label">
              <i class="fas fa-microphone"></i>
              <span>Microphone</span>
            </div>
            <select class="device-select" id="microphoneSelect" aria-label="Select microphone">
              <option value="">No microphone detected</option>
            </select>
          </div>
          <div class="device-group">
            <div class="device-group-label">
              <i class="fas fa-volume-up"></i>
              <span>Speaker</span>
            </div>
            <select class="device-select" id="speakerSelect" aria-label="Select speaker">
              <option value="">Default speaker</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Cache element references
   */
  cacheElements() {
    // Buttons
    this.microphoneBtn = document.getElementById('btnMicrophone');
    this.cameraBtn = document.getElementById('btnCamera');
    this.screenShareBtn = document.getElementById('btnScreenShare');
    this.layoutBtn = document.getElementById('btnLayoutMode');
    this.qualityBtn = document.getElementById('btnQuality');
    this.devicesBtn = document.getElementById('btnDevices');

    // Dropdowns
    this.layoutDropdown = document.getElementById('layoutDropdown');
    this.qualityDropdown = document.getElementById('qualityDropdown');
    this.deviceDropdown = document.getElementById('deviceDropdown');

    // Device selects
    this.cameraSelect = document.getElementById('cameraSelect');
    this.microphoneSelect = document.getElementById('microphoneSelect');
    this.speakerSelect = document.getElementById('speakerSelect');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Microphone button
    this.microphoneBtn?.addEventListener('click', () => this.handleMicrophoneToggle());

    // Camera button
    this.cameraBtn?.addEventListener('click', () => this.handleCameraToggle());

    // Screen share button
    this.screenShareBtn?.addEventListener('click', () => this.handleScreenShareToggle());

    // Layout button and dropdown
    this.layoutBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('layout');
    });

    this.layoutDropdown?.querySelectorAll('.layout-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const layout = e.currentTarget.dataset.layout;
        this.handleLayoutChange(layout);
      });
    });

    // Quality button and dropdown
    this.qualityBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('quality');
    });

    this.qualityDropdown?.querySelectorAll('.quality-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const quality = e.currentTarget.dataset.quality;
        this.handleQualityChange(quality);
      });
    });

    // Devices button and dropdown
    this.devicesBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown('devices');
    });

    // Device selects
    this.cameraSelect?.addEventListener('change', (e) => {
      this.handleDeviceChange('camera', e.target.value);
    });

    this.microphoneSelect?.addEventListener('change', (e) => {
      this.handleDeviceChange('microphone', e.target.value);
    });

    this.speakerSelect?.addEventListener('change', (e) => {
      this.handleDeviceChange('speaker', e.target.value);
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.layout-mode-selector')) {
        this.closeDropdown('layout');
      }
      if (!e.target.closest('.quality-settings')) {
        this.closeDropdown('quality');
      }
      if (!e.target.closest('.device-selector')) {
        this.closeDropdown('devices');
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  /**
   * Handle microphone toggle
   */
  async handleMicrophoneToggle() {
    try {
      if (this.mediaManager.audioEnabled) {
        await this.mediaManager.disableAudio();
        this.updateMicrophoneButton(false);
        this.announceAction('Microphone muted');
      } else {
        await this.mediaManager.enableAudio();
        this.updateMicrophoneButton(true);
        this.announceAction('Microphone unmuted');
      }
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
      this.announceAction('Failed to toggle microphone');
    }
  }

  /**
   * Update microphone button state
   */
  updateMicrophoneButton(enabled) {
    if (!this.microphoneBtn) return;

    if (enabled) {
      this.microphoneBtn.classList.add('active');
      this.microphoneBtn.setAttribute('aria-pressed', 'true');
      this.microphoneBtn.setAttribute('data-tooltip', 'Mute microphone');
      const icon = this.microphoneBtn.querySelector('i');
      if (icon) icon.className = 'fas fa-microphone';
    } else {
      this.microphoneBtn.classList.remove('active');
      this.microphoneBtn.setAttribute('aria-pressed', 'false');
      this.microphoneBtn.setAttribute('data-tooltip', 'Unmute microphone');
      const icon = this.microphoneBtn.querySelector('i');
      if (icon) icon.className = 'fas fa-microphone-slash';
    }
  }

  /**
   * Handle camera toggle
   * Requirements: 3.4
   */
  async handleCameraToggle() {
    try {
      if (this.mediaManager.videoEnabled) {
        await this.mediaManager.disableVideo();
        this.updateCameraButton(false);
        this.announceAction('Camera turned off');
      } else {
        await this.mediaManager.enableVideo();
        this.updateCameraButton(true);
        this.announceAction('Camera turned on');
      }
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      this.showError('Failed to toggle camera. Please check permissions.');
      this.announceAction('Failed to toggle camera');
    }
  }

  /**
   * Handle screen share toggle
   * Requirements: 3.4
   */
  async handleScreenShareToggle() {
    try {
      if (this.mediaManager.screenShareEnabled) {
        await this.mediaManager.stopScreenShare();
        this.updateScreenShareButton(false);
        this.announceAction('Screen sharing stopped');
      } else {
        await this.mediaManager.startScreenShare();
        this.updateScreenShareButton(true);
        this.announceAction('Screen sharing started');
      }
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
      this.showError('Failed to share screen. Please try again.');
      this.announceAction('Failed to toggle screen sharing');
    }
  }

  /**
   * Handle layout mode change
   */
  handleLayoutChange(layout) {
    this.currentLayout = layout;

    // Update active state
    this.layoutDropdown?.querySelectorAll('.layout-option').forEach(option => {
      option.classList.toggle('active', option.dataset.layout === layout);
    });

    // Update button text and icon
    const layoutNames = {
      grid: { icon: 'fa-th', text: 'Grid' },
      speaker: { icon: 'fa-user', text: 'Speaker' },
      sidebar: { icon: 'fa-columns', text: 'Sidebar' },
      pip: { icon: 'fa-external-link-alt', text: 'PIP' }
    };

    const layoutInfo = layoutNames[layout];
    if (layoutInfo && this.layoutBtn) {
      const icon = this.layoutBtn.querySelector('.layout-icon');
      const text = this.layoutBtn.querySelector('.layout-text');
      if (icon) icon.className = `fas ${layoutInfo.icon} layout-icon`;
      if (text) text.textContent = layoutInfo.text;
    }

    // Close dropdown
    this.closeDropdown('layout');

    // Save preference
    this.savePreference('layoutMode', layout);

    // Emit event for video grid to handle
    this.emit('layoutChange', layout);

    console.log(`Layout changed to: ${layout}`);
  }

  /**
   * Handle quality change
   */
  handleQualityChange(quality) {
    this.currentQuality = quality;

    // Update active state
    this.qualityDropdown?.querySelectorAll('.quality-option').forEach(option => {
      option.classList.toggle('active', option.dataset.quality === quality);
    });

    // Update quality indicator
    const qualityLabels = {
      low: 'SD',
      medium: 'MD',
      high: 'HD',
      hd: 'FHD',
      auto: 'AUTO'
    };

    const indicator = this.qualityBtn?.querySelector('.quality-indicator');
    if (indicator) {
      indicator.textContent = qualityLabels[quality] || 'HD';
    }

    // Close dropdown
    this.closeDropdown('quality');

    // Apply quality to media manager
    if (this.mediaManager.setVideoQuality) {
      this.mediaManager.setVideoQuality(quality);
    }

    // Save preference
    this.savePreference('videoQuality', quality);

    console.log(`Video quality changed to: ${quality}`);
  }

  /**
   * Handle device change
   */
  async handleDeviceChange(deviceType, deviceId) {
    try {
      if (deviceType === 'camera' && this.mediaManager.switchCamera) {
        await this.mediaManager.switchCamera(deviceId);
      } else if (deviceType === 'microphone' && this.mediaManager.switchMicrophone) {
        await this.mediaManager.switchMicrophone(deviceId);
      } else if (deviceType === 'speaker' && this.mediaManager.switchSpeaker) {
        await this.mediaManager.switchSpeaker(deviceId);
      }

      // Save preference
      this.savePreference(`selected${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`, deviceId);

      console.log(`${deviceType} changed to: ${deviceId}`);
    } catch (error) {
      console.error(`Failed to change ${deviceType}:`, error);
      this.showError(`Failed to change ${deviceType}. Please try again.`);
    }
  }

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown(type) {
    const dropdowns = {
      layout: this.layoutDropdown,
      quality: this.qualityDropdown,
      devices: this.deviceDropdown
    };

    const buttons = {
      layout: this.layoutBtn,
      quality: this.qualityBtn,
      devices: this.devicesBtn
    };

    const dropdown = dropdowns[type];
    const button = buttons[type];

    if (!dropdown || !button) return;

    const isOpen = dropdown.classList.contains('open');

    // Close all dropdowns first
    Object.values(dropdowns).forEach(d => d?.classList.remove('open'));
    Object.values(buttons).forEach(b => b?.setAttribute('aria-expanded', 'false'));

    // Toggle the requested dropdown
    if (!isOpen) {
      dropdown.classList.add('open');
      button.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * Close specific dropdown
   */
  closeDropdown(type) {
    const dropdowns = {
      layout: this.layoutDropdown,
      quality: this.qualityDropdown,
      devices: this.deviceDropdown
    };

    const buttons = {
      layout: this.layoutBtn,
      quality: this.qualityBtn,
      devices: this.devicesBtn
    };

    dropdowns[type]?.classList.remove('open');
    buttons[type]?.setAttribute('aria-expanded', 'false');
  }

  /**
   * Update camera button state
   */
  updateCameraButton(enabled) {
    if (!this.cameraBtn) return;

    if (enabled) {
      this.cameraBtn.classList.add('active');
      this.cameraBtn.setAttribute('aria-pressed', 'true');
      this.cameraBtn.setAttribute('data-tooltip', 'Turn off camera');
      const icon = this.cameraBtn.querySelector('i');
      if (icon) icon.className = 'fas fa-video';
    } else {
      this.cameraBtn.classList.remove('active');
      this.cameraBtn.setAttribute('aria-pressed', 'false');
      this.cameraBtn.setAttribute('data-tooltip', 'Turn on camera');
      const icon = this.cameraBtn.querySelector('i');
      if (icon) icon.className = 'fas fa-video-slash';
    }
  }

  /**
   * Update screen share button state
   */
  updateScreenShareButton(enabled) {
    if (!this.screenShareBtn) return;

    if (enabled) {
      this.screenShareBtn.classList.add('active');
      this.screenShareBtn.setAttribute('aria-pressed', 'true');
      this.screenShareBtn.setAttribute('data-tooltip', 'Stop sharing');
      const icon = this.screenShareBtn.querySelector('i');
      if (icon) icon.className = 'fas fa-stop-circle';
    } else {
      this.screenShareBtn.classList.remove('active');
      this.screenShareBtn.setAttribute('aria-pressed', 'false');
      this.screenShareBtn.setAttribute('data-tooltip', 'Share screen');
      const icon = this.screenShareBtn.querySelector('i');
      if (icon) icon.className = 'fas fa-desktop';
    }
  }

  /**
   * Populate device selects with available devices
   */
  async populateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Clear existing options
      if (this.cameraSelect) this.cameraSelect.innerHTML = '';
      if (this.microphoneSelect) this.microphoneSelect.innerHTML = '';
      if (this.speakerSelect) this.speakerSelect.innerHTML = '';

      // Populate cameras
      const cameras = devices.filter(d => d.kind === 'videoinput');
      cameras.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Camera ${index + 1}`;
        this.cameraSelect?.appendChild(option);
      });

      // Populate microphones
      const microphones = devices.filter(d => d.kind === 'audioinput');
      microphones.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Microphone ${index + 1}`;
        this.microphoneSelect?.appendChild(option);
      });

      // Populate speakers
      const speakers = devices.filter(d => d.kind === 'audiooutput');
      if (speakers.length > 0) {
        speakers.forEach((device, index) => {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.textContent = device.label || `Speaker ${index + 1}`;
          this.speakerSelect?.appendChild(option);
        });
      } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Default speaker';
        this.speakerSelect?.appendChild(option);
      }

      // Restore saved preferences
      this.restoreDevicePreferences();

      console.log('✅ Devices populated');
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
    }
  }

  /**
   * Handle keyboard shortcuts
   * Requirements: 3.4, 7.2
   */
  handleKeyboardShortcuts(e) {
    // Ignore shortcuts when input elements are focused
    if (this.isInputFocused()) {
      return;
    }

    // Ignore shortcuts with modifiers (except for standard browser shortcuts)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // V key for video toggle
    // Requirements: 3.4
    if (e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      this.handleCameraToggle();
      this.announceAction('Camera toggled');
    }

    // S key for screen share toggle
    // Requirements: 3.4
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      this.handleScreenShareToggle();
      this.announceAction('Screen share toggled');
    }

    // L key for layout cycling
    // Requirements: 7.2
    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      this.cycleLayout();
    }

    // F key for fullscreen toggle
    // Requirements: 3.4
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      this.toggleFullscreen();
      this.announceAction('Fullscreen toggled');
    }
  }

  /**
   * Check if an input element is focused
   */
  isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.isContentEditable
    );
  }

  /**
   * Cycle through layout modes
   * Requirements: 7.2
   */
  cycleLayout() {
    const layouts = ['grid', 'speaker', 'sidebar', 'pip'];
    const currentIndex = layouts.indexOf(this.currentLayout);
    const nextIndex = (currentIndex + 1) % layouts.length;
    const nextLayout = layouts[nextIndex];
    this.handleLayoutChange(nextLayout);

    // Announce layout change
    const layoutNames = {
      grid: 'Grid View',
      speaker: 'Speaker View',
      sidebar: 'Sidebar View',
      pip: 'Picture-in-Picture'
    };
    this.announceAction(`Layout changed to ${layoutNames[nextLayout]}`);
  }

  /**
   * Toggle fullscreen mode
   * Requirements: 3.4
   */
  toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen on the video grid container or main app
        const targetElement = document.getElementById('videoGridContainer') || document.querySelector('.app-main');
        if (targetElement && targetElement.requestFullscreen) {
          targetElement.requestFullscreen().catch(err => {
            console.error('Failed to enter fullscreen:', err);
            this.showError('Failed to enter fullscreen mode');
          });
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(err => {
            console.error('Failed to exit fullscreen:', err);
          });
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle error:', error);
      this.showError('Fullscreen not supported in this browser');
    }
  }

  /**
   * Announce action to screen readers
   * Requirements: 3.4
   * 
   * @param {string} message - Message to announce
   */
  announceAction(message) {
    // Get or create ARIA live region
    let liveRegion = document.getElementById('video-controls-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'video-controls-live-region';
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(liveRegion);
    }

    // Update the live region with the message
    liveRegion.textContent = message;

    // Clear after a short delay to allow for new announcements
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }

  /**
   * Show/hide controls
   */
  show() {
    this.controlsBar?.classList.remove('hidden');
    this.isVisible = true;
  }

  hide() {
    this.controlsBar?.classList.add('hidden');
    this.isVisible = false;
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Save preference to localStorage
   */
  savePreference(key, value) {
    try {
      localStorage.setItem(`videoControls_${key}`, value);
    } catch (error) {
      console.warn('Failed to save preference:', error);
    }
  }

  /**
   * Load preferences from localStorage
   */
  loadPreferences() {
    try {
      // Load layout preference
      const savedLayout = localStorage.getItem('videoControls_layoutMode');
      if (savedLayout) {
        this.handleLayoutChange(savedLayout);
      }

      // Load quality preference
      const savedQuality = localStorage.getItem('videoControls_videoQuality');
      if (savedQuality) {
        this.handleQualityChange(savedQuality);
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error);
    }
  }

  /**
   * Restore device preferences
   */
  restoreDevicePreferences() {
    try {
      const savedCamera = localStorage.getItem('videoControls_selectedCamera');
      const savedMicrophone = localStorage.getItem('videoControls_selectedMicrophone');
      const savedSpeaker = localStorage.getItem('videoControls_selectedSpeaker');

      if (savedCamera && this.cameraSelect) {
        this.cameraSelect.value = savedCamera;
      }
      if (savedMicrophone && this.microphoneSelect) {
        this.microphoneSelect.value = savedMicrophone;
      }
      if (savedSpeaker && this.speakerSelect) {
        this.speakerSelect.value = savedSpeaker;
      }
    } catch (error) {
      console.warn('Failed to restore device preferences:', error);
    }
  }

  /**
   * Simple event emitter
   */
  emit(event, data) {
    const customEvent = new CustomEvent(`videoControls:${event}`, { detail: data });
    document.dispatchEvent(customEvent);
  }

  /**
   * Show error notification
   */
  showError(message) {
    // Use app's notification system if available
    if (this.mediaManager.app && this.mediaManager.app.showNotification) {
      this.mediaManager.app.showNotification(message, 'error');
    } else {
      console.error(message);
      alert(message);
    }
  }

  /**
   * Set admin disabled state for camera control
   * Requirements: 10.4, 10.5
   */
  setAdminDisabled(disabled) {
    if (!this.cameraBtn) return;

    if (disabled) {
      // Disable camera button and show admin-disabled state
      this.cameraBtn.classList.add('admin-disabled');
      this.cameraBtn.disabled = true;
      this.cameraBtn.setAttribute('data-tooltip', 'Camera disabled by admin');
      this.cameraBtn.style.opacity = '0.5';
      this.cameraBtn.style.cursor = 'not-allowed';

      const icon = this.cameraBtn.querySelector('i');
      if (icon) icon.className = 'fas fa-video-slash';

      console.log('🚫 Camera controls disabled by admin');
    } else {
      // Re-enable camera button
      this.cameraBtn.classList.remove('admin-disabled');
      this.cameraBtn.disabled = false;
      this.cameraBtn.setAttribute('data-tooltip', 'Turn on camera');
      this.cameraBtn.style.opacity = '1';
      this.cameraBtn.style.cursor = 'pointer';

      console.log('✅ Camera controls enabled by admin');
    }
  }

  /**
   * Destroy the controls
   */
  destroy() {
    this.controlsBar?.remove();
    console.log('VideoControlsUI destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoControlsUI;
} else if (typeof window !== 'undefined') {
  window.VideoControlsUI = VideoControlsUI;
}
