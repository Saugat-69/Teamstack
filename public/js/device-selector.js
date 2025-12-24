/**
 * DeviceSelector - Media device enumeration and selection for TeamUp
 * Handles camera, microphone, and speaker device management
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

class DeviceSelector {
  constructor(mediaManager) {
    if (!mediaManager) {
      throw new Error('MediaManager instance is required for DeviceSelector');
    }
    
    this.mediaManager = mediaManager;
    
    // Device lists
    this.devices = {
      cameras: [],
      microphones: [],
      speakers: []
    };
    
    // Currently selected devices
    this.selectedDevices = {
      camera: null,
      microphone: null,
      speaker: null
    };
    
    // Event handlers (can be set externally)
    this.onDeviceChange = null;
    this.onDevicesEnumerated = null;
    
    // Setup device change detection
    this.setupDeviceChangeDetection();
    
    // Load saved preferences
    this.loadDevicePreferences();
    
    console.log('✅ DeviceSelector initialized');
  }

  /**
   * Enumerate all available media devices
   * Requirements: 11.1
   * 
   * @returns {Promise<Object>} Object containing arrays of cameras, microphones, and speakers
   */
  async enumerateDevices() {
    try {
      console.log('🎥 Enumerating media devices...');
      
      // Request permissions first to get device labels
      // Without permissions, device labels will be empty
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: true 
        });
        // Stop the stream immediately - we just needed it for permissions
        stream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        console.warn('⚠️ Could not get full device permissions:', permError.message);
      }
      
      // Get all media devices
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      
      // Clear existing device lists
      this.devices.cameras = [];
      this.devices.microphones = [];
      this.devices.speakers = [];
      
      // Categorize devices
      deviceInfos.forEach(device => {
        const deviceInfo = {
          deviceId: device.deviceId,
          label: device.label || `${device.kind} ${this.devices[this.getDeviceCategory(device.kind)]?.length + 1 || 1}`,
          kind: device.kind,
          groupId: device.groupId
        };
        
        if (device.kind === 'videoinput') {
          this.devices.cameras.push(deviceInfo);
        } else if (device.kind === 'audioinput') {
          this.devices.microphones.push(deviceInfo);
        } else if (device.kind === 'audiooutput') {
          this.devices.speakers.push(deviceInfo);
        }
      });
      
      console.log(`✅ Devices enumerated:`, {
        cameras: this.devices.cameras.length,
        microphones: this.devices.microphones.length,
        speakers: this.devices.speakers.length
      });
      
      // Notify about enumeration
      if (this.onDevicesEnumerated) {
        this.onDevicesEnumerated(this.devices);
      }
      
      return this.devices;
    } catch (error) {
      console.error('❌ Failed to enumerate devices:', error);
      throw new Error(`Failed to enumerate devices: ${error.message}`);
    }
  }

  /**
   * Get device category from device kind
   * 
   * @param {string} kind - Device kind
   * @returns {string} Device category
   */
  getDeviceCategory(kind) {
    switch (kind) {
      case 'videoinput':
        return 'cameras';
      case 'audioinput':
        return 'microphones';
      case 'audiooutput':
        return 'speakers';
      default:
        return null;
    }
  }

  /**
   * Select a camera device
   * Requirements: 11.2, 11.3
   * 
   * @param {string} deviceId - Camera device ID
   * @returns {Promise<boolean>} Success status
   */
  async selectCamera(deviceId) {
    try {
      console.log(`📹 Selecting camera: ${deviceId}`);
      
      // Validate device exists
      const device = this.devices.cameras.find(cam => cam.deviceId === deviceId);
      if (!device) {
        throw new Error(`Camera device not found: ${deviceId}`);
      }
      
      // Update selected device
      this.selectedDevices.camera = deviceId;
      this.mediaManager.selectedDevices.camera = deviceId;
      
      // If video is currently enabled, switch to the new camera
      if (this.mediaManager.videoEnabled) {
        await this.mediaManager.switchCamera(deviceId);
      }
      
      // Save preference
      this.saveDevicePreferences();
      
      console.log(`✅ Camera selected: ${device.label}`);
      
      // Notify about device change
      if (this.onDeviceChange) {
        this.onDeviceChange('camera', deviceId, device);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to select camera:', error);
      throw error;
    }
  }

  /**
   * Select a microphone device
   * Requirements: 11.2, 11.3
   * 
   * @param {string} deviceId - Microphone device ID
   * @returns {Promise<boolean>} Success status
   */
  async selectMicrophone(deviceId) {
    try {
      console.log(`🎤 Selecting microphone: ${deviceId}`);
      
      // Validate device exists
      const device = this.devices.microphones.find(mic => mic.deviceId === deviceId);
      if (!device) {
        throw new Error(`Microphone device not found: ${deviceId}`);
      }
      
      // Update selected device
      this.selectedDevices.microphone = deviceId;
      this.mediaManager.selectedDevices.microphone = deviceId;
      
      // If audio is currently enabled, switch to the new microphone
      if (this.mediaManager.audioEnabled && this.mediaManager.localAudioStream) {
        // Get new audio stream with selected microphone
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
        
        const newAudioTrack = newStream.getAudioTracks()[0];
        
        // Replace audio track in all peer connections
        this.mediaManager.peers.forEach((peer) => {
          const senders = peer.pc.getSenders();
          const audioSender = senders.find(sender => sender.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(newAudioTrack);
          }
        });
        
        // Stop old audio tracks
        this.mediaManager.localAudioStream.getTracks().forEach(track => {
          track.stop();
        });
        
        // Update local audio stream
        this.mediaManager.localAudioStream = newStream;
      }
      
      // Save preference
      this.saveDevicePreferences();
      
      console.log(`✅ Microphone selected: ${device.label}`);
      
      // Notify about device change
      if (this.onDeviceChange) {
        this.onDeviceChange('microphone', deviceId, device);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to select microphone:', error);
      throw error;
    }
  }

  /**
   * Select a speaker device (audio output)
   * Requirements: 11.2, 11.3
   * 
   * @param {string} deviceId - Speaker device ID
   * @returns {Promise<boolean>} Success status
   */
  async selectSpeaker(deviceId) {
    try {
      console.log(`🔊 Selecting speaker: ${deviceId}`);
      
      // Validate device exists
      const device = this.devices.speakers.find(spk => spk.deviceId === deviceId);
      if (!device) {
        throw new Error(`Speaker device not found: ${deviceId}`);
      }
      
      // Update selected device
      this.selectedDevices.speaker = deviceId;
      this.mediaManager.selectedDevices.speaker = deviceId;
      
      // Apply to all remote audio elements
      // Note: setSinkId is not supported in all browsers
      if (typeof HTMLMediaElement.prototype.setSinkId !== 'undefined') {
        // Find all remote audio/video elements and set their output device
        this.mediaManager.peers.forEach((peer) => {
          // Set audio element sink
          if (peer.audioElement && peer.audioElement.setSinkId) {
            peer.audioElement.setSinkId(deviceId).catch(err => {
              console.warn(`⚠️ Failed to set audio sink for peer ${peer.userId}:`, err);
            });
          }
          
          // Set video element sink (for video with audio)
          if (peer.videoElement && peer.videoElement.setSinkId) {
            peer.videoElement.setSinkId(deviceId).catch(err => {
              console.warn(`⚠️ Failed to set video sink for peer ${peer.userId}:`, err);
            });
          }
        });
      } else {
        console.warn('⚠️ Speaker selection not supported in this browser');
      }
      
      // Save preference
      this.saveDevicePreferences();
      
      console.log(`✅ Speaker selected: ${device.label}`);
      
      // Notify about device change
      if (this.onDeviceChange) {
        this.onDeviceChange('speaker', deviceId, device);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to select speaker:', error);
      throw error;
    }
  }

  /**
   * Setup device change detection
   * Requirements: 11.4, 11.5
   */
  setupDeviceChangeDetection() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) {
      console.warn('⚠️ Device change detection not supported in this browser');
      return;
    }
    
    console.log('🔍 Setting up device change detection...');
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      console.log('🔄 Media devices changed, re-enumerating...');
      
      try {
        // Re-enumerate devices
        const previousDevices = JSON.parse(JSON.stringify(this.devices));
        await this.enumerateDevices();
        
        // Check if selected devices are still available
        this.validateSelectedDevices(previousDevices);
        
        // Notify about device change
        if (this.onDeviceChange) {
          this.onDeviceChange('devicelist', null, this.devices);
        }
      } catch (error) {
        console.error('❌ Failed to handle device change:', error);
      }
    });
    
    console.log('✅ Device change detection setup complete');
  }

  /**
   * Validate that selected devices are still available
   * Requirements: 11.4, 11.5
   * 
   * @param {Object} previousDevices - Previous device list
   */
  validateSelectedDevices(previousDevices) {
    // Check camera
    if (this.selectedDevices.camera) {
      const cameraExists = this.devices.cameras.some(
        cam => cam.deviceId === this.selectedDevices.camera
      );
      
      if (!cameraExists) {
        console.warn('⚠️ Previously selected camera is no longer available');
        
        // Try to select a new camera
        if (this.devices.cameras.length > 0) {
          const newCamera = this.devices.cameras[0];
          console.log(`🔄 Switching to available camera: ${newCamera.label}`);
          this.selectCamera(newCamera.deviceId).catch(err => {
            console.error('❌ Failed to switch to new camera:', err);
          });
        } else {
          this.selectedDevices.camera = null;
          this.mediaManager.selectedDevices.camera = null;
        }
      }
    }
    
    // Check microphone
    if (this.selectedDevices.microphone) {
      const micExists = this.devices.microphones.some(
        mic => mic.deviceId === this.selectedDevices.microphone
      );
      
      if (!micExists) {
        console.warn('⚠️ Previously selected microphone is no longer available');
        
        // Try to select a new microphone
        if (this.devices.microphones.length > 0) {
          const newMic = this.devices.microphones[0];
          console.log(`🔄 Switching to available microphone: ${newMic.label}`);
          this.selectMicrophone(newMic.deviceId).catch(err => {
            console.error('❌ Failed to switch to new microphone:', err);
          });
        } else {
          this.selectedDevices.microphone = null;
          this.mediaManager.selectedDevices.microphone = null;
        }
      }
    }
    
    // Check speaker
    if (this.selectedDevices.speaker) {
      const speakerExists = this.devices.speakers.some(
        spk => spk.deviceId === this.selectedDevices.speaker
      );
      
      if (!speakerExists) {
        console.warn('⚠️ Previously selected speaker is no longer available');
        
        // Try to select a new speaker
        if (this.devices.speakers.length > 0) {
          const newSpeaker = this.devices.speakers[0];
          console.log(`🔄 Switching to available speaker: ${newSpeaker.label}`);
          this.selectSpeaker(newSpeaker.deviceId).catch(err => {
            console.error('❌ Failed to switch to new speaker:', err);
          });
        } else {
          this.selectedDevices.speaker = null;
          this.mediaManager.selectedDevices.speaker = null;
        }
      }
    }
  }

  /**
   * Save device preferences to localStorage
   * Requirements: 11.3
   */
  saveDevicePreferences() {
    try {
      const preferences = {
        camera: this.selectedDevices.camera,
        microphone: this.selectedDevices.microphone,
        speaker: this.selectedDevices.speaker,
        timestamp: Date.now()
      };
      
      localStorage.setItem('teamup-device-preferences', JSON.stringify(preferences));
      console.log('💾 Device preferences saved to localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to save device preferences:', error);
    }
  }

  /**
   * Load device preferences from localStorage
   * Requirements: 11.3
   */
  loadDevicePreferences() {
    try {
      const saved = localStorage.getItem('teamup-device-preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        
        this.selectedDevices.camera = preferences.camera || null;
        this.selectedDevices.microphone = preferences.microphone || null;
        this.selectedDevices.speaker = preferences.speaker || null;
        
        // Sync with media manager
        this.mediaManager.selectedDevices.camera = this.selectedDevices.camera;
        this.mediaManager.selectedDevices.microphone = this.selectedDevices.microphone;
        this.mediaManager.selectedDevices.speaker = this.selectedDevices.speaker;
        
        console.log('💾 Device preferences loaded from localStorage');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load device preferences:', error);
    }
  }

  /**
   * Get currently selected devices
   * 
   * @returns {Object} Selected device IDs
   */
  getSelectedDevices() {
    return { ...this.selectedDevices };
  }

  /**
   * Get available devices
   * 
   * @returns {Object} Available devices
   */
  getAvailableDevices() {
    return { ...this.devices };
  }

  /**
   * Get device by ID
   * 
   * @param {string} deviceId - Device ID
   * @returns {Object|null} Device info or null
   */
  getDeviceById(deviceId) {
    const allDevices = [
      ...this.devices.cameras,
      ...this.devices.microphones,
      ...this.devices.speakers
    ];
    
    return allDevices.find(device => device.deviceId === deviceId) || null;
  }

  /**
   * Check if a device is currently selected
   * 
   * @param {string} deviceId - Device ID
   * @returns {boolean} True if device is selected
   */
  isDeviceSelected(deviceId) {
    return Object.values(this.selectedDevices).includes(deviceId);
  }

  /**
   * Reset device preferences
   */
  resetDevicePreferences() {
    console.log('🔄 Resetting device preferences...');
    
    this.selectedDevices = {
      camera: null,
      microphone: null,
      speaker: null
    };
    
    this.mediaManager.selectedDevices = {
      camera: null,
      microphone: null,
      speaker: null
    };
    
    try {
      localStorage.removeItem('teamup-device-preferences');
      console.log('✅ Device preferences reset');
    } catch (error) {
      console.warn('⚠️ Failed to remove device preferences from localStorage:', error);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeviceSelector;
} else if (typeof window !== 'undefined') {
  window.DeviceSelector = DeviceSelector;
}
