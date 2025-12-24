# WebRTC Signaling Debug Guide

## Current Issue

WebRTC offers are being sent from one client but NOT being received by the other client. The signaling chain appears to be broken.

## What We've Added

### 1. Enhanced Logging

We've added comprehensive logging throughout the WebRTC signaling chain:

#### Client-Side (media-manager.js)
- Detailed logging when creating peer connections
- Socket ID comparison logging
- Offer creation and emission logging
- Connection state tracking

#### Server-Side (server.js)
- Logging when webrtc-offer event is received
- Verification that target socket exists
- Confirmation when offer is relayed
- Error handling with stack traces

#### App-Side (app.js)
- Logging when socket listeners are registered
- Logging when webrtc-offer event is triggered
- Data validation logging

### 2. Debug Test Page

Created `webrtc-debug-test.html` - a simplified test page to isolate and debug the WebRTC signaling issue.

## Testing Instructions

### Option 1: Test with Main Application

1. **Hard refresh both tabs** (Ctrl + Shift + R or Ctrl + F5)
2. **Open browser console** in both tabs (F12)
3. **Join the same room** in both tabs
4. **Enable video** in both tabs (click camera button)
5. **Watch the console logs** carefully

#### Expected Log Sequence

**Tab 1 (Right tab - sends offer):**
```
📹 Enabling video...
✅ Video enabled successfully
📤 Sending offer to [socket-id-of-tab-2]
   My socket ID: [socket-id-of-tab-1]
   Target socket ID: [socket-id-of-tab-2]
   Room: [room-name]
   Socket connected: true
   Offer SDP length: [number]
   ✅ Offer emitted to server via socket.emit('webrtc-offer', ...)
```

**Server Console:**
```
📨 Server received webrtc-offer event
   From socket: [socket-id-of-tab-1]
   Target socket: [socket-id-of-tab-2]
   Room: [room-name]
   Offer type: offer
   Offer SDP length: [number]
   ✅ Target socket found, relaying offer...
🔄 Relaying WebRTC offer from [socket-id-of-tab-1] to [socket-id-of-tab-2]
   ✅ Offer relayed successfully
```

**Tab 2 (Left tab - receives offer):**
```
🎯 webrtc-offer listener triggered!
📥 [APP] Received webrtc-offer event
   Data: {fromId: "[socket-id-of-tab-1]", offer: {...}}
   From ID: [socket-id-of-tab-1]
   Offer type: offer
   My socket ID: [socket-id-of-tab-2]
   MediaManager exists: true
📥 Received WebRTC offer from [socket-id-of-tab-1]
📥 Received offer from [socket-id-of-tab-1]
   Offer type: offer, SDP length: [number]
```

### Option 2: Test with Debug Page

1. **Open** `http://localhost:3000/webrtc-debug-test.html` in **two separate tabs**
2. **Enter the same room name** in both tabs (e.g., "test_room")
3. **Click "Join Room"** in both tabs
4. **Click "Enable Video"** in both tabs
5. **Watch the event log** in both tabs

The debug page will:
- Show all socket events clearly
- Automatically send a test offer when it detects another user with video
- Highlight when webrtc-offer events are received
- Display socket IDs and connection status

## Debugging Checklist

### If offers are NOT being sent:
- [ ] Check if `createPeerConnection` is being called
- [ ] Verify `isInitiator` is true for one client
- [ ] Check if socket is connected (`socket.connected === true`)
- [ ] Verify room name is correct

### If offers are sent but NOT received by server:
- [ ] Check server console for "📨 Server received webrtc-offer event"
- [ ] Verify the server is running and not crashed
- [ ] Check for any server-side errors
- [ ] Verify socket.emit is using correct event name ('webrtc-offer')

### If server receives but does NOT relay:
- [ ] Check if target socket exists on server
- [ ] Verify `io.to(targetId).emit()` is being called
- [ ] Check for any errors in server relay logic
- [ ] Verify targetId matches actual socket ID

### If server relays but client does NOT receive:
- [ ] Check if socket listener is registered (`socket.on('webrtc-offer', ...)`)
- [ ] Verify listener is registered BEFORE offer is sent
- [ ] Check if there are multiple socket instances
- [ ] Verify event name matches exactly ('webrtc-offer')
- [ ] Check browser console for any JavaScript errors

## Common Issues

### 1. Socket Listener Not Registered
**Symptom:** No "🎯 webrtc-offer listener triggered!" message
**Solution:** Ensure `setupEventListeners()` is called during app initialization

### 2. Wrong Socket ID
**Symptom:** Server can't find target socket
**Solution:** Verify both clients are using `socket.id` (not `currentUserId`)

### 3. Race Condition
**Symptom:** Both clients try to initiate
**Solution:** Use consistent comparison (e.g., `socket.id > userId`)

### 4. MediaManager Not Initialized
**Symptom:** "MediaManager not initialized!" error
**Solution:** Ensure `initializeVideoComponents()` is called when joining room

### 5. Multiple Socket Connections
**Symptom:** Events sent to wrong socket instance
**Solution:** Ensure only one socket connection per tab

## Next Steps

1. **Run the tests** using either option above
2. **Collect the logs** from all three sources (Tab 1, Server, Tab 2)
3. **Identify where the chain breaks** by comparing with expected sequence
4. **Report findings** with specific log messages

## Files Modified

- `teamup/public/js/media-manager.js` - Enhanced offer sending logs
- `teamup/server.js` - Enhanced server relay logs
- `teamup/public/js/app.js` - Enhanced socket listener logs
- `teamup/public/webrtc-debug-test.html` - New debug test page (created)

## Quick Test Command

```bash
# Start the server (if not already running)
cd teamup
node server.js

# Open in browser
# http://localhost:3000/webrtc-debug-test.html
```

## Expected Outcome

After these changes, you should be able to:
1. See exactly where the signaling chain breaks
2. Identify if it's a client, server, or network issue
3. Fix the specific problem based on the logs

The enhanced logging will show you the complete journey of the WebRTC offer from sender → server → receiver.
