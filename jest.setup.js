// Jest setup file for global test configuration

// Mock WebRTC APIs that aren't available in jsdom
global.RTCPeerConnection = class RTCPeerConnection {
  constructor(config) {
    this.config = config;
    this.localDescription = null;
    this.remoteDescription = null;
    this.connectionState = 'new';
    this.iceConnectionState = 'new';
    this.signalingState = 'stable';
    this._senders = [];
    this._receivers = [];
    this.ontrack = null;
    this.onicecandidate = null;
    this.onconnectionstatechange = null;
    this.oniceconnectionstatechange = null;
  }

  addTrack(track, stream) {
    const sender = { track, stream };
    this._senders.push(sender);
    return sender;
  }

  removeTrack(sender) {
    const index = this._senders.indexOf(sender);
    if (index > -1) {
      this._senders.splice(index, 1);
    }
  }

  getSenders() {
    return this._senders;
  }

  getReceivers() {
    return this._receivers;
  }

  async createOffer() {
    return { type: 'offer', sdp: 'mock-offer-sdp' };
  }

  async createAnswer() {
    return { type: 'answer', sdp: 'mock-answer-sdp' };
  }

  async setLocalDescription(description) {
    this.localDescription = description;
  }

  async setRemoteDescription(description) {
    this.remoteDescription = description;
  }

  async addIceCandidate(candidate) {
    // Mock implementation
  }

  async getStats() {
    return new Map([
      ['inbound-rtp-video', {
        type: 'inbound-rtp',
        kind: 'video',
        bytesReceived: 1000000,
        packetsReceived: 1000,
        packetsLost: 10,
        framesDecoded: 300,
        frameWidth: 640,
        frameHeight: 480,
        jitter: 0.01
      }],
      ['candidate-pair', {
        type: 'candidate-pair',
        state: 'succeeded',
        currentRoundTripTime: 0.05
      }]
    ]);
  }

  close() {
    this.connectionState = 'closed';
  }
};

global.RTCSessionDescription = class RTCSessionDescription {
  constructor(description) {
    this.type = description.type;
    this.sdp = description.sdp;
  }
};

global.RTCIceCandidate = class RTCIceCandidate {
  constructor(candidate) {
    this.candidate = candidate.candidate;
    this.sdpMid = candidate.sdpMid;
    this.sdpMLineIndex = candidate.sdpMLineIndex;
  }
};

// Mock MediaStream
global.MediaStream = class MediaStream {
  constructor(tracks = []) {
    this._tracks = tracks;
    this.id = 'mock-stream-' + Math.random().toString(36).substr(2, 9);
    this.active = true;
  }

  getTracks() {
    return this._tracks;
  }

  getVideoTracks() {
    return this._tracks.filter(t => t.kind === 'video');
  }

  getAudioTracks() {
    return this._tracks.filter(t => t.kind === 'audio');
  }

  addTrack(track) {
    this._tracks.push(track);
  }

  removeTrack(track) {
    const index = this._tracks.indexOf(track);
    if (index > -1) {
      this._tracks.splice(index, 1);
    }
  }
};

// Mock MediaStreamTrack
global.MediaStreamTrack = class MediaStreamTrack {
  constructor(kind = 'video') {
    this.kind = kind;
    this.id = 'mock-track-' + Math.random().toString(36).substr(2, 9);
    this.label = `Mock ${kind} track`;
    this.enabled = true;
    this.muted = false;
    this.readyState = 'live';
    this.onended = null;
    this.onmute = null;
    this.onunmute = null;
  }

  stop() {
    this.readyState = 'ended';
    if (this.onended) {
      this.onended();
    }
  }

  async applyConstraints(constraints) {
    // Mock implementation
  }

  getConstraints() {
    return {};
  }

  getSettings() {
    return {
      width: 640,
      height: 480,
      frameRate: 30,
      facingMode: 'user'
    };
  }
};

// Mock navigator.mediaDevices
global.navigator.mediaDevices = {
  getUserMedia: jest.fn(async (constraints) => {
    const tracks = [];
    if (constraints.audio) {
      tracks.push(new MediaStreamTrack('audio'));
    }
    if (constraints.video) {
      tracks.push(new MediaStreamTrack('video'));
    }
    return new MediaStream(tracks);
  }),

  getDisplayMedia: jest.fn(async (constraints) => {
    return new MediaStream([new MediaStreamTrack('video')]);
  }),

  enumerateDevices: jest.fn(async () => {
    return [
      { deviceId: 'camera1', kind: 'videoinput', label: 'Mock Camera 1' },
      { deviceId: 'camera2', kind: 'videoinput', label: 'Mock Camera 2' },
      { deviceId: 'mic1', kind: 'audioinput', label: 'Mock Microphone 1' },
      { deviceId: 'speaker1', kind: 'audiooutput', label: 'Mock Speaker 1' }
    ];
  })
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
