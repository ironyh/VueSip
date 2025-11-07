# VueSip Video Call Example

A complete, production-ready example of a one-to-one video calling application built with VueSip. This example demonstrates best practices for implementing video calls with camera selection, preview, and comprehensive call controls.

## Features

### Core Video Calling Features
- ✅ One-to-one video calls with full bidirectional video and audio
- ✅ Local video preview with picture-in-picture display
- ✅ Camera enumeration and selection (switch cameras during call)
- ✅ Remote video display with automatic aspect ratio handling
- ✅ Call state management (idle, calling, ringing, active, on hold)
- ✅ Real-time call duration tracking

### Call Controls
- ✅ Answer/Reject incoming video calls
- ✅ Hang up active calls
- ✅ Mute/unmute audio
- ✅ Enable/disable video during call
- ✅ Put call on hold/resume
- ✅ Camera switching during active calls

### User Experience
- ✅ Clean, modern UI with responsive design
- ✅ Visual feedback for connection status
- ✅ Proper error handling and display
- ✅ Camera permission handling
- ✅ Mirrored local video preview (natural self-view)
- ✅ Smooth animations and transitions

### Technical Features
- ✅ TypeScript throughout for type safety
- ✅ Proper media stream cleanup on component unmount
- ✅ Event-driven architecture using EventBus
- ✅ Reactive state management with Vue 3 Composition API
- ✅ Integration with VueSip composables (useSipClient, useCallSession, useMediaDevices)

## Prerequisites

### Browser Support
This example requires a modern browser with WebRTC support:
- Chrome/Chromium 74+
- Firefox 66+
- Safari 14.1+
- Edge 79+

### Hardware Requirements
- **Camera**: At least one video input device (webcam)
- **Microphone**: Audio input device
- **Speakers/Headphones**: Audio output device

### SIP Server Requirements
- **WebRTC Support**: Your SIP server must support WebRTC (WebSocket transport + ICE)
- **Video Codecs**: Server must support video codecs (VP8, VP9, or H.264)
- **WebSocket Transport**: Server must have WebSocket endpoint configured

### Recommended SIP Servers
- **Asterisk** with chan_pjsip and WebRTC (16.0+)
- **FreeSWITCH** with mod_verto or mod_sofia WebRTC
- **Kamailio** with WebSocket and rtpengine modules
- **OpenSIPS** with WebSocket support

## Installation

### 1. Install Dependencies

From the video-call example directory:

```bash
npm install
```

Or using pnpm (recommended for workspaces):

```bash
pnpm install
```

### 2. Configure Your SIP Server

Make sure your SIP server is configured for WebRTC. Here's an example Asterisk configuration:

#### Asterisk pjsip.conf
```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

[webrtc]
type=endpoint
context=default
disallow=all
allow=vp8,vp9,h264,opus,ulaw
webrtc=yes
dtls_auto_generate_cert=yes
```

#### Asterisk http.conf
```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/path/to/cert.pem
tlsprivatekey=/path/to/key.pem
```

### 3. Verify Camera Permissions

Ensure your browser has permission to access your camera and microphone. The application will request these permissions automatically, but you can also check browser settings:

- **Chrome**: Settings → Privacy and security → Site Settings → Camera/Microphone
- **Firefox**: Preferences → Privacy & Security → Permissions → Camera/Microphone
- **Safari**: Preferences → Websites → Camera/Microphone

## Running the Example

### Development Mode

Start the development server:

```bash
npm run dev
```

Or with pnpm:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000` (or next available port).

### Production Build

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Usage

### 1. Connect to SIP Server

When you first open the application, you'll see the connection panel. Enter your SIP credentials:

- **SIP URI**: Your SIP address (e.g., `sip:1001@pbx.example.com`)
- **Password**: Your SIP password
- **WebSocket Server**: Your server's WebSocket URL (e.g., `wss://pbx.example.com:8089/ws`)
- **Display Name** (optional): Your name to display during calls

Click **Connect** to register with the SIP server.

### 2. Make a Video Call

Once connected and registered:

1. Enter the target SIP URI in the input field (e.g., `sip:1002@pbx.example.com`)
2. Click **Start Video Call**
3. Grant camera and microphone permissions if prompted
4. Wait for the remote party to answer

### 3. Receive a Video Call

When someone calls you:

1. You'll see an incoming call notification
2. The call state will show as "ringing"
3. Click **Answer** to accept the call (or **Reject** to decline)
4. Grant camera and microphone permissions if prompted

### 4. During a Call

While in an active video call, you can:

- **Mute/Unmute**: Toggle your microphone on/off
- **Stop/Start Video**: Toggle your camera on/off
- **Hold/Resume**: Put the call on hold or resume
- **Switch Camera**: Click the camera icon in the local preview to select a different camera (Note: Camera switching during active calls has limitations - see Known Limitations below)
- **Hang Up**: End the call

### 5. Local Video Preview

Your local video appears in the bottom-right corner:

- **Mirrored View**: Your video is mirrored for a natural self-view
- **Picture-in-Picture**: Preview stays visible during the call
- **Camera Selector**: Click the camera icon to switch between available cameras

## Testing

### Testing with Two Browsers

The easiest way to test is with two browser windows or tabs:

1. Open the example in two different browser windows
2. Register each with different SIP accounts (e.g., 1001 and 1002)
3. Make a call from one window to the other
4. Test all controls (mute, hold, camera switch, etc.)

### Testing with SIP Clients

You can also test with other SIP clients:

- **Linphone**: Desktop and mobile app with video support
- **Zoiper**: Desktop and mobile app
- **MicroSIP**: Windows desktop client
- **Bria**: Commercial softphone with excellent video support

### Testing Checklist

- [ ] Connection and registration works
- [ ] Outgoing video call successfully established
- [ ] Incoming video call can be answered
- [ ] Local video preview displays correctly
- [ ] Remote video displays correctly
- [ ] Audio in both directions works
- [ ] Mute/unmute audio works
- [ ] Enable/disable video works
- [ ] Hold/resume works
- [ ] Camera selection works
- [ ] Camera switching during call works
- [ ] Hang up properly terminates call
- [ ] Reject incoming call works
- [ ] Call duration tracks correctly
- [ ] Media streams cleaned up on hang up

## Troubleshooting

### No Video Displayed

**Problem**: Video elements show black screen or placeholder

**Solutions**:
1. Check camera permissions in browser settings
2. Verify camera is not in use by another application
3. Try a different camera if available
4. Check browser console for errors
5. Ensure SIP server supports video codecs (VP8, VP9, H.264)

### No Audio

**Problem**: Can't hear remote party or they can't hear you

**Solutions**:
1. Check microphone permissions
2. Verify audio input/output devices are selected correctly
3. Check mute status (both local and remote)
4. Test with another browser or SIP client
5. Verify SIP server audio codec configuration

### Connection Failed

**Problem**: Cannot connect to SIP server

**Solutions**:
1. Verify WebSocket URL is correct (must start with `ws://` or `wss://`)
2. Check SIP credentials (URI and password)
3. Ensure SIP server is running and accessible
4. Check firewall rules (WebSocket port must be open)
5. Try HTTP (`ws://`) if HTTPS (`wss://`) fails (development only)
6. Check browser console for detailed error messages

### Camera Not Found

**Problem**: No cameras available in selection menu

**Solutions**:
1. Ensure camera is connected and recognized by OS
2. Grant camera permissions when browser prompts
3. Reload the page after connecting camera
4. Check if camera is in use by another application
5. Try a different browser

### Poor Video Quality

**Problem**: Video is choppy, blurry, or pixelated

**Solutions**:
1. Check network bandwidth (video calls require 500 kbps - 2 Mbps)
2. Verify both parties have good network connectivity
3. Reduce other network usage during call
4. Check CPU usage (high CPU can affect encoding)
5. Try disabling video temporarily to test audio
6. Configure codec preferences in SIP server

### Call Drops Unexpectedly

**Problem**: Call disconnects without hang up

**Solutions**:
1. Check network stability (use ping test)
2. Verify SIP server is stable
3. Check browser console for errors
4. Verify ICE/STUN/TURN server configuration
5. Check NAT/firewall settings for UDP ports

### WebSocket Connection Issues

**Problem**: WebSocket fails to connect

**Solutions**:
1. Verify WebSocket server URL format
2. For `wss://` (secure), ensure valid SSL certificate
3. Check CORS settings on SIP server
4. Test with `ws://` (insecure) for debugging
5. Verify WebSocket endpoint is correct (e.g., `/ws`)

## Code Structure

```
examples/video-call/
├── package.json                # Dependencies and scripts
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── index.html                 # HTML entry point
├── README.md                  # This file
└── src/
    ├── main.ts                # Vue app initialization
    ├── App.vue                # Main application component
    └── components/
        ├── ConnectionPanel.vue      # SIP connection form
        ├── VideoPreview.vue         # Local video preview with camera selection
        ├── RemoteVideo.vue          # Remote video display
        └── VideoCallControls.vue    # Call control buttons
```

### Component Overview

#### App.vue
The main application component that:
- Initializes SIP client, call session, and media devices composables
- Manages overall application state and event handling
- Orchestrates communication between child components
- Handles SIP events (connection, registration, incoming calls)

#### ConnectionPanel.vue
Connection form component that:
- Collects SIP credentials from user
- Validates input fields
- Displays connection errors
- Shows requirements and example configuration

#### VideoPreview.vue
Local video preview component that:
- Displays mirrored local video in picture-in-picture style
- Provides camera selection menu
- Handles camera switching during calls
- Shows placeholder when camera is off

#### RemoteVideo.vue
Remote video display component that:
- Shows remote party's video in main viewing area
- Displays placeholder states (idle, connecting, no video)
- Shows remote party's name
- Handles video element lifecycle

#### VideoCallControls.vue
Call controls component that:
- Provides call initiation UI (SIP URI input)
- Shows call control buttons (mute, video, hold, hang up)
- Adapts UI based on call state (idle, ringing, active)
- Handles answer/reject for incoming calls

## Key Concepts

### Media Stream Management

The example properly manages media streams:

```typescript
// Acquire media with specific constraints
await mediaManager.value.getUserMedia({ audio: true, video: true })

// Access streams
const localStream = mediaManager.value.getLocalStream()
const remoteStream = session.value?.remoteStream

// Cleanup on unmount
onUnmounted(() => {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop())
  }
})
```

### Camera Selection

Camera selection is implemented using the MediaDevices API:

```typescript
// Enumerate available cameras
const { videoInputDevices } = useMediaDevices()

// Select a specific camera
selectVideoInput(deviceId)

// Switch camera during call
const newStream = await navigator.mediaDevices.getUserMedia({
  video: { deviceId: { exact: deviceId } }
})
```

### Video Element Refs

Video elements are handled using Vue 3 refs:

```typescript
const videoElement = ref<HTMLVideoElement | null>(null)

// Set stream to video element
watch(() => props.stream, (newStream) => {
  if (videoElement.value) {
    videoElement.value.srcObject = newStream
  }
})
```

### Call State Management

Call states are managed reactively:

```typescript
const { state, isActive, isMuted, isOnHold } = useCallSession()

// React to state changes
watch(state, (newState) => {
  if (newState === 'active') {
    // Call is active
  } else if (newState === 'terminated') {
    // Call ended
  }
})
```

## Advanced Configuration

### Custom Media Constraints

You can customize media constraints when making calls:

```typescript
await makeCall(targetUri, {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
})
```

### Video Quality Settings

Adjust video quality based on network conditions:

```typescript
// HD video
video: {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30 }
}

// Standard video
video: {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 24 }
}

// Low bandwidth
video: {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 15 }
}
```

## Browser Compatibility Notes

### Safari Considerations
- Requires HTTPS for camera access (even on localhost)
- May require user interaction before getUserMedia()
- Video codec support may differ from Chrome/Firefox

### Mobile Browser Considerations
- iOS Safari requires specific video element attributes
- Android Chrome may have different camera selection behavior
- Screen size requires responsive design considerations

## Security Considerations

### HTTPS/WSS
- Always use HTTPS for production
- Use WSS (secure WebSocket) for SIP connections
- Browser requires HTTPS for camera/microphone access

### Permissions
- Always request permissions explicitly
- Handle permission denial gracefully
- Provide clear explanation for why permissions are needed

### Privacy
- Stop media streams when not in use
- Provide visual indication when camera/mic are active
- Allow users to disable video/audio during calls

## Performance Tips

### Optimize Video Quality
- Start with lower resolution and increase based on network
- Monitor network conditions during calls
- Provide quality selection options for users

### Reduce CPU Usage
- Limit video preview size when not focused
- Use hardware acceleration when available
- Clean up unused media streams promptly

### Memory Management
- Always stop tracks when hanging up
- Remove event listeners on component unmount
- Null out video element srcObject references

## Known Limitations

### Camera Switching During Calls

Camera switching during active calls currently has limitations. While you can switch cameras, the track replacement in the peer connection may not work seamlessly in all scenarios. This feature requires proper integration with the underlying CallSession's peer connection track replacement mechanism.

**Workaround**: Select your desired camera before initiating or answering a call.

## License

This example is part of VueSip and is licensed under the MIT License.

## Support

For issues, questions, or contributions:

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check VueSip docs for API details
- **Examples**: See other examples for different use cases

## Credits

Built with:
- **VueSip**: Headless Vue.js SIP/VoIP library
- **Vue 3**: Progressive JavaScript framework
- **TypeScript**: Typed JavaScript
- **Vite**: Next generation frontend tooling
- **JsSIP**: JavaScript SIP library
