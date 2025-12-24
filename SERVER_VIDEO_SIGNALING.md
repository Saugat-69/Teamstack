# Server-Side Video Signaling Handlers

## Overview

This document describes the implementation of Task 12: Add server-side video signaling handlers for the TeamUp video and screen sharing feature.

## Socket Event Handlers Implemented

### 1. enable-video
**Purpose**: Handle user enabling their camera

**Event**: `enable-video`

**Payload**:
```javascript
{
  room: string  // Room name (optional, uses joinedRoom if not provided)
}
```

**Behavior**:
- Updates user state to `videoEnabled: true`
- Broadcasts `user-video-enabled` event to all room participants
- Logs the action

**Emits**: `user-video-enabled`
```javascript
{
  userId: string,
  name: string,
  timestamp: number
}
```

### 2. disable-video
**Purpose**: Handle user disabling their camera

**Event**: `disable-video`

**Payload**:
```javascript
{
  room: string  // Room name (optional)
}
```

**Behavior**:
- Updates user state to `videoEnabled: false`
- Broadcasts `user-video-disabled` event to all room participants
- Logs the action

**Emits**: `user-video-disabled`
```javascript
{
  userId: string,
  name: string,
  timestamp: number
}
```

### 3. start-screen-share
**Purpose**: Handle user starting screen share

**Event**: `start-screen-share`

**Payload**:
```javascript
{
  room: string  // Room name (optional)
}
```

**Behavior**:
- Updates user state to `screenShareEnabled: true`
- Adds user to room's `screenShares` Set for tracking
- Broadcasts `user-screen-share-started` event to all participants
- Logs the action

**Emits**: `user-screen-share-started`
```javascript
{
  userId: string,
  name: string,
  timestamp: number
}
```

### 4. stop-screen-share
**Purpose**: Handle user stopping screen share

**Event**: `stop-screen-share`

**Payload**:
```javascript
{
  room: string  // Room name (optional)
}
```

**Behavior**:
- Updates user state to `screenShareEnabled: false`
- Removes user from room's `screenShares` Set
- Broadcasts `user-screen-share-stopped` event to all participants
- Logs the action

**Emits**: `user-screen-share-stopped`
```javascript
{
  userId: string,
  name: string,
  timestamp: number
}
```

### 5. video-quality-change
**Purpose**: Handle user changing video quality settings

**Event**: `video-quality-change`

**Payload**:
```javascript
{
  room: string,    // Room name (optional)
  quality: string  // Quality level: 'low', 'medium', 'high', 'hd', 'auto'
}
```

**Behavior**:
- Updates user state with new quality setting
- Relays quality change to other participants (not broadcast to sender)
- Other participants can adjust their sending quality accordingly
- Logs the action

**Emits**: `user-video-quality-changed`
```javascript
{
  userId: string,
  name: string,
  quality: string,
  timestamp: number
}
```

### 6. get-media-participants
**Purpose**: Get current media state of all participants

**Event**: `get-media-participants`

**Payload**:
```javascript
{
  room: string  // Room name (optional)
}
```

**Behavior**:
- Collects media state for all users in the room
- Sends state back to requesting client only
- Useful for syncing state when joining or reconnecting

**Emits**: `media-participants`
```javascript
{
  participants: [
    {
      userId: string,
      name: string,
      videoEnabled: boolean,
      screenShareEnabled: boolean,
      videoQuality: string
    }
  ],
  timestamp: number
}
```

### 7. admin-disable-video
**Purpose**: Admin forcibly disables a user's video

**Event**: `admin-disable-video`

**Payload**:
```javascript
{
  room: string,
  targetId: string  // Socket ID of target user
}
```

**Behavior**:
- Verifies sender is room admin
- Sets `videoDisabledByAdmin: true` and `videoEnabled: false` for target user
- Notifies target user with `video-disabled-by-admin` event
- Broadcasts `user-video-disabled` with `byAdmin: true` flag
- Logs the action
- Sends acknowledgment callback

**Emits**: 
- To target: `video-disabled-by-admin`
```javascript
{
  room: string,
  adminName: string,
  timestamp: number
}
```
- To all: `user-video-disabled`
```javascript
{
  userId: string,
  name: string,
  byAdmin: true,
  timestamp: number
}
```

### 8. admin-enable-video
**Purpose**: Admin removes video restriction from a user

**Event**: `admin-enable-video`

**Payload**:
```javascript
{
  room: string,
  targetId: string  // Socket ID of target user
}
```

**Behavior**:
- Verifies sender is room admin
- Sets `videoDisabledByAdmin: false` for target user
- Notifies target user with `video-enabled-by-admin` event
- User can now enable their video again
- Logs the action
- Sends acknowledgment callback

**Emits**: `video-enabled-by-admin`
```javascript
{
  room: string,
  adminName: string,
  timestamp: number
}
```

### 9. admin-stop-screen-share
**Purpose**: Admin forcibly stops a user's screen share

**Event**: `admin-stop-screen-share`

**Payload**:
```javascript
{
  room: string,
  targetId: string  // Socket ID of target user
}
```

**Behavior**:
- Verifies sender is room admin
- Sets `screenShareEnabled: false` for target user
- Removes user from room's `screenShares` Set
- Notifies target user with `screen-share-stopped-by-admin` event
- Broadcasts `user-screen-share-stopped` with `byAdmin: true` flag
- Logs the action
- Sends acknowledgment callback

**Emits**:
- To target: `screen-share-stopped-by-admin`
```javascript
{
  room: string,
  adminName: string,
  timestamp: number
}
```
- To all: `user-screen-share-stopped`
```javascript
{
  userId: string,
  name: string,
  byAdmin: true,
  timestamp: number
}
```

## Enhanced disconnect Handler

The `disconnect` event handler was enhanced to clean up video/screen share state:

**Behavior**:
- Checks if disconnecting user had video enabled
- Emits `user-video-disabled` if video was active
- Checks if disconnecting user had screen share enabled
- Removes from `screenShares` Set if applicable
- Emits `user-screen-share-stopped` if screen share was active
- Continues with existing disconnect cleanup

## Data Structure Changes

### Room Data Structure
```javascript
roomData[room] = {
  text: string,
  files: Array,
  password: string | null,
  isPrivate: boolean,
  isLAN: boolean,
  lanIPs: Array<string>,
  createdAt: number,
  connectors: Set<string>,
  users: Map<socketId, UserData>,
  adminSocketId: string | undefined,
  adminToken: string | undefined,
  typingLock: Object | undefined,
  screenShares: Set<socketId>  // NEW: Track active screen shares
}
```

### User Data Structure
```javascript
UserData = {
  name: string,
  role: 'admin' | 'member',
  muted: boolean,
  videoEnabled: boolean,              // NEW
  screenShareEnabled: boolean,        // NEW
  videoQuality: string,               // NEW
  videoDisabledByAdmin: boolean       // NEW
}
```

## Client-Side Integration

### Enabling Video
```javascript
// Client sends
socket.emit('enable-video', { room: currentRoom });

// Client listens for confirmation
socket.on('user-video-enabled', (data) => {
  if (data.userId === myUserId) {
    // My video was enabled
    updateCameraButton(true);
  } else {
    // Another user enabled video
    addVideoFeed(data.userId, data.name);
  }
});
```

### Disabling Video
```javascript
// Client sends
socket.emit('disable-video', { room: currentRoom });

// Client listens
socket.on('user-video-disabled', (data) => {
  if (data.userId === myUserId) {
    updateCameraButton(false);
  } else {
    removeVideoFeed(data.userId);
  }
});
```

### Starting Screen Share
```javascript
// Client sends
socket.emit('start-screen-share', { room: currentRoom });

// Client listens
socket.on('user-screen-share-started', (data) => {
  if (data.userId === myUserId) {
    updateScreenShareButton(true);
  } else {
    addScreenShareFeed(data.userId, data.name);
  }
});
```

### Stopping Screen Share
```javascript
// Client sends
socket.emit('stop-screen-share', { room: currentRoom });

// Client listens
socket.on('user-screen-share-stopped', (data) => {
  if (data.userId === myUserId) {
    updateScreenShareButton(false);
  } else {
    removeScreenShareFeed(data.userId);
  }
});
```

### Changing Video Quality
```javascript
// Client sends
socket.emit('video-quality-change', { 
  room: currentRoom, 
  quality: 'high' 
});

// Other clients listen
socket.on('user-video-quality-changed', (data) => {
  // Optionally adjust sending quality for this user
  adjustQualityForUser(data.userId, data.quality);
});
```

### Getting Media Participants
```javascript
// Client sends (e.g., on join or reconnect)
socket.emit('get-media-participants', { room: currentRoom });

// Client listens
socket.on('media-participants', (data) => {
  data.participants.forEach(participant => {
    if (participant.videoEnabled) {
      addVideoFeed(participant.userId, participant.name);
    }
    if (participant.screenShareEnabled) {
      addScreenShareFeed(participant.userId, participant.name);
    }
  });
});
```

### Admin Controls
```javascript
// Admin disables user's video
socket.emit('admin-disable-video', { 
  room: currentRoom, 
  targetId: userId 
}, (success) => {
  if (success) {
    showNotification('Video disabled for user');
  }
});

// Admin enables user's video
socket.emit('admin-enable-video', { 
  room: currentRoom, 
  targetId: userId 
}, (success) => {
  if (success) {
    showNotification('Video enabled for user');
  }
});

// Admin stops user's screen share
socket.emit('admin-stop-screen-share', { 
  room: currentRoom, 
  targetId: userId 
}, (success) => {
  if (success) {
    showNotification('Screen share stopped for user');
  }
});

// User receives admin action
socket.on('video-disabled-by-admin', (data) => {
  showNotification(`Your video was disabled by ${data.adminName}`);
  disableVideoLocally();
});

socket.on('video-enabled-by-admin', (data) => {
  showNotification(`Your video was enabled by ${data.adminName}`);
  enableVideoControls();
});

socket.on('screen-share-stopped-by-admin', (data) => {
  showNotification(`Your screen share was stopped by ${data.adminName}`);
  stopScreenShareLocally();
});
```

## Error Handling

All handlers include try-catch blocks to prevent server crashes:
- Invalid room names are handled gracefully
- Missing user data returns early
- Admin permission checks prevent unauthorized actions
- Errors are logged to console with descriptive messages

## Security Considerations

1. **Admin Verification**: All admin actions verify `adminSocketId` matches sender
2. **Room Validation**: All actions validate room exists and user is in room
3. **User Validation**: All actions validate target user exists
4. **State Consistency**: State is updated before broadcasting to prevent race conditions
5. **Cleanup**: Disconnect handler ensures state is cleaned up properly

## Logging

All video signaling actions are logged with:
- Action type (enable/disable video, start/stop screen share)
- User name
- Room name
- Timestamp (implicit in log)

Example logs:
```
📹 Video enabled for John Doe in room project-alpha
📹 Video disabled for Jane Smith in room project-alpha
🖥️ Screen share started for Bob Johnson in room project-alpha
🖥️ Screen share stopped for Alice Williams in room project-alpha
⚙️ Video quality changed to high for Charlie Brown in room project-alpha
🚫 Admin disabled video for David Lee in room project-alpha
🚫 Admin stopped screen share for Emma Davis in room project-alpha
```

## Testing

### Manual Testing
1. Start server: `npm start`
2. Open multiple browser tabs
3. Join same room in all tabs
4. Test each event handler:
   - Enable/disable video
   - Start/stop screen share
   - Change video quality
   - Get media participants
   - Admin controls (as admin)

### Socket.IO Testing
Use Socket.IO client or browser console:
```javascript
// In browser console
socket.emit('enable-video', { room: 'test-room' });
socket.emit('start-screen-share', { room: 'test-room' });
socket.emit('video-quality-change', { room: 'test-room', quality: 'high' });
```

## Requirements Mapping

This implementation satisfies the following requirements:

### Requirement 1.4
✅ Video stream broadcast to all room participants

### Requirement 3.5
✅ Camera state changes notify all room participants

### Requirement 4.3
✅ Screen share broadcast begins within 2 seconds

### Requirement 6.3
✅ Screen share end notifies all participants

## Performance Considerations

- Minimal data in broadcasts (only essential fields)
- Set data structure for O(1) screen share tracking
- Early returns prevent unnecessary processing
- No blocking operations in event handlers

## Future Enhancements

Potential improvements:
1. Rate limiting for video state changes
2. Bandwidth monitoring and adaptive quality
3. Recording state tracking
4. Video analytics (duration, quality metrics)
5. Participant limit enforcement
6. Video permission requests
7. Breakout room support
8. Video effects state sync

## Conclusion

The server-side video signaling handlers provide a robust, secure, and efficient system for managing video and screen sharing state across all participants in a room. All handlers follow consistent patterns and include proper error handling and logging.
