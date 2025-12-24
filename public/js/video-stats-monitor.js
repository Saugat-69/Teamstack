/**
 * VideoStatsMonitor - Real-time video call statistics
 */
class VideoStatsMonitor {
  constructor(mediaManager) {
    this.mediaManager = mediaManager;
    this.statsInterval = null;
    this.statsDisplay = null;
    this.isVisible = false;
  }

  /**
   * Start monitoring statistics
   */
  start() {
    if (this.statsInterval) return;
    
    this.createStatsDisplay();
    this.statsInterval = setInterval(() => {
      this.updateStats();
    }, 1000);
    
    console.log('📊 Video stats monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    if (this.statsDisplay) {
      this.statsDisplay.remove();
      this.statsDisplay = null;
    }
    
    console.log('📊 Video stats monitoring stopped');
  }

  /**
   * Create stats display UI
   */
  createStatsDisplay() {
    this.statsDisplay = document.createElement('div');
    this.statsDisplay.className = 'video-stats-display';
    this.statsDisplay.innerHTML = `
      <div class="stats-header">
        <span>📊 Call Stats</span>
        <button class="stats-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
      </div>
      <div class="stats-content">
        <div class="stat-item">
          <span class="stat-label">Participants:</span>
          <span class="stat-value" id="participantCount">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Video Quality:</span>
          <span class="stat-value" id="videoQuality">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Connection:</span>
          <span class="stat-value" id="connectionState">-</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.statsDisplay);
  }

  /**
   * Update statistics display
   */
  async updateStats() {
    if (!this.statsDisplay) return;
    
    // Update participant count
    const participantCount = this.mediaManager.peers.size + 1; // +1 for self
    document.getElementById('participantCount').textContent = participantCount;
    
    // Update video quality
    document.getElementById('videoQuality').textContent = this.mediaManager.videoQuality;
    
    // Update connection states
    let connectionStates = [];
    for (const [userId, peer] of this.mediaManager.peers.entries()) {
      connectionStates.push(peer.pc.connectionState);
    }
    
    const overallState = connectionStates.length > 0 ? 
      connectionStates.every(s => s === 'connected') ? 'Connected' : 'Connecting...' : 
      'No peers';
    
    document.getElementById('connectionState').textContent = overallState;
  }

  /**
   * Toggle stats display visibility
   */
  toggle() {
    if (!this.statsDisplay) {
      this.start();
    } else {
      this.statsDisplay.style.display = 
        this.statsDisplay.style.display === 'none' ? 'block' : 'none';
    }
  }
}

// Export for use
window.VideoStatsMonitor = VideoStatsMonitor;