# VueSip Conference Call Example

A complete, working example demonstrating multi-party conference calling using the VueSip library's `useConference` composable.

## Overview

This example application showcases professional conference calling functionality including:

- **Conference Creation & Management**: Create new conferences with configurable settings
- **Participant Management**: Add, remove, and monitor conference participants
- **Audio Controls**: Mute/unmute individual participants or all participants at once
- **Conference Controls**: Lock/unlock conference to control access
- **Recording**: Start and stop conference recording
- **Real-time Events**: Monitor participant joins, leaves, and state changes
- **Audio Level Visualization**: Visual indicators for speaking participants
- **State Management**: Track conference and participant states reactively

## Features Demonstrated

### 1. Conference Management
- Creating conferences with max participant limits
- Joining existing conferences by URI
- Ending conferences for all participants
- Conference state monitoring (Idle, Creating, Active, Ending, Ended)

### 2. Participant Management
- Adding participants dynamically during active conference
- Removing participants from conference
- Displaying participant list with real-time updates
- Participant state tracking (Connecting, Connected, Disconnected)

### 3. Audio Controls
- Muting/unmuting individual participants
- Mute all participants functionality
- Audio level monitoring and visualization
- Speaking indicator (visual feedback when participant is speaking)

### 4. Conference Security & Control
- Lock conference to prevent new participants
- Unlock conference to allow new participants
- Maximum participant enforcement
- Moderator privileges for local participant

### 5. Recording Capabilities
- Start conference recording
- Stop conference recording
- Recording state indicators

### 6. Event System
- Real-time conference event logging
- Participant joined/left notifications
- State change tracking
- Audio level updates

## Prerequisites

Before running this example, you need:

### 1. SIP Server with Conference Support

This example requires a SIP server that supports conference calling. Compatible options include:

- **Asterisk** with app_confbridge or app_meetme
- **FreeSWITCH** with mod_conference
- **Kamailio** with conference module
- Other SIP servers with RFC 4579 (SIP Call Control - Conferencing) support

### 2. WebSocket Support

Your SIP server must have WebSocket transport enabled for browser connectivity:

- For Asterisk: Configure `http.conf` with WebSocket support
- For FreeSWITCH: Enable `mod_verto` or WebRTC gateway
- Ensure WSS (secure WebSocket) is configured for production use

### 3. Conference Room Configuration

On your SIP server, you may need to:

- Configure conference rooms/bridges
- Set up dial plans for conference access
- Configure moderator PINs (optional)
- Set max participants limits on the server side

## Installation

### 1. Install Dependencies

From the example directory:

```bash
npm install
```

Or if you're in the monorepo root and using pnpm:

```bash
pnpm install
```

### 2. Configure SIP Server

Edit `src/App.vue` to set your default SIP server configuration, or use the UI form:

```typescript
const config = ref<SipClientConfig>({
  server: 'wss://your-sip-server.com:7443',
  username: 'your-username',
  password: 'your-password',
  displayName: 'Conference Moderator',
})
```

## Running the Example

### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:5174`

### Production Build

```bash
npm run build
npm run preview
```

## Usage Guide

### Step 1: Connect to SIP Server

1. Enter your SIP server WebSocket URL (e.g., `wss://sip.example.com:7443`)
2. Enter your SIP username and password
3. Optionally set a display name
4. Click "Connect to SIP Server"
5. Wait for "Registered" status

### Step 2: Create Conference

1. Once connected, click "Create Conference"
2. A new conference will be created with you as the moderator
3. The conference ID will be generated automatically
4. You'll see your participant card in the participant list

### Step 3: Add Participants

**Option A: Manual Entry**
1. Enter the participant's SIP URI (e.g., `sip:1001@example.com`)
2. Optionally enter a display name
3. Click "Add to Conference"

**Option B: Quick Add (for testing)**
- Click one of the "Quick Add" buttons to add test participants
- These use example SIP URIs that you can customize

### Step 4: Manage Conference

**Participant Controls:**
- **Mute/Unmute**: Click mute/unmute on individual participant cards
- **Remove**: Click remove to disconnect a participant

**Conference Controls:**
- **Mute All**: Mutes all participants except yourself
- **Lock/Unlock**: Controls whether new participants can join
- **Start/Stop Recording**: Records the conference (server support required)
- **End Conference**: Ends the conference for all participants

### Step 5: Monitor Activity

- **Event Log**: Watch the event log for real-time conference activity
- **Audio Indicators**: Participant cards highlight when speaking
- **Audio Bars**: Visual audio level bars show speaking activity
- **Participant Count**: Header shows total participant count

## Configuration Options

### Conference Options

When creating a conference, you can configure:

```typescript
await createConference({
  maxParticipants: 10,      // Maximum number of participants
  locked: false,             // Start locked or unlocked
  metadata: {                // Custom metadata
    topic: 'Team Meeting',
    startTime: new Date()
  }
})
```

### Server-Side Configuration

#### Asterisk Example

**1. WebSocket Configuration (http.conf)**

```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088

[http]
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/asterisk/keys/asterisk.pem
tlsprivatekey=/etc/asterisk/keys/asterisk.key
```

**2. SIP Configuration (pjsip.conf)**

```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:7443
cert_file=/etc/asterisk/keys/asterisk.pem
priv_key_file=/etc/asterisk/keys/asterisk.key
```

**3. Conference Bridge Configuration (confbridge.conf)**

```ini
[general]

[my_conference_bridge]
type=bridge
max_members=10
record_conference=yes
video_mode=follow_talker
```

**4. Dialplan Configuration (extensions.conf)**

```ini
[default]
; Conference room dial plan
exten => 5000,1,NoOp(Conference Room)
  same => n,Answer()
  same => n,ConfBridge(my_conference_bridge)
  same => n,Hangup()
```

#### FreeSWITCH Example

**1. WebSocket Configuration (verto.conf.xml)**

```xml
<configuration name="verto.conf" description="HTML5 Verto">
  <settings>
    <param name="bind-local" value="0.0.0.0:8081"/>
    <param name="secure-bind-local" value="0.0.0.0:8082"/>
    <param name="enable-fs" value="true"/>
  </settings>
</configuration>
```

**2. Conference Configuration (conference.conf.xml)**

```xml
<configuration name="conference.conf" description="Conference">
  <advertise>
    <room name="default" status=""/>
  </advertise>

  <profiles>
    <profile name="default">
      <param name="domain" value="$${domain}"/>
      <param name="rate" value="16000"/>
      <param name="interval" value="20"/>
      <param name="energy-level" value="300"/>
      <param name="max-members" value="10"/>
      <param name="auto-record" value="true"/>
      <param name="caller-controls" value="default"/>
    </profile>
  </profiles>
</configuration>
```

**3. Dialplan Configuration (dialplan/default.xml)**

```xml
<extension name="conference_rooms">
  <condition field="destination_number" expression="^(5000)$">
    <action application="answer"/>
    <action application="conference" data="$1@default"/>
  </condition>
</extension>
```

#### Kamailio Example

**1. WebSocket Configuration (kamailio.cfg)**

```
# WebSocket transport
listen=tcp:0.0.0.0:5060
listen=tls:0.0.0.0:5061
listen=ws:0.0.0.0:8080
listen=wss:0.0.0.0:4443

# Load WebSocket module
loadmodule "websocket.so"

# WebSocket event route
event_route[xhttp:request] {
    if ($Rp != 8080 && $Rp != 4443) {
        xhttp_reply("403", "Forbidden", "", "");
        exit;
    }

    if ($hdr(Upgrade) =~ "websocket" && $hdr(Connection) =~ "Upgrade") {
        if (ws_handle_handshake()) {
            exit;
        }
    }
    xhttp_reply("404", "Not Found", "", "");
}
```

**2. Conference Module Configuration**

```
loadmodule "conference.so"

modparam("conference", "db_url", "mysql://kamailio:password@localhost/kamailio")
```

## Architecture

### Component Structure

```
src/
├── App.vue                      # Main application container
├── main.ts                      # Vue app initialization
├── style.css                    # Global styles
└── components/
    ├── ConnectionPanel.vue      # SIP connection UI
    ├── ConferenceRoom.vue       # Main conference interface
    ├── ParticipantList.vue      # Grid of participants
    ├── ParticipantCard.vue      # Individual participant display
    └── AddParticipantForm.vue   # Form to add participants
```

### State Management

The application uses the `useConference` composable for reactive state:

```typescript
const {
  conference,           // Current conference state
  state,               // Conference state enum
  participants,        // Array of participants
  localParticipant,    // You (the moderator)
  participantCount,    // Total participant count
  isActive,           // Whether conference is active
  isLocked,           // Whether conference is locked
  isRecording,        // Whether recording is active

  // Methods
  createConference,
  addParticipant,
  removeParticipant,
  muteParticipant,
  unmuteParticipant,
  endConference,
  lockConference,
  unlockConference,
  startRecording,
  stopRecording,
  onConferenceEvent,
} = useConference(sipClient)
```

### Event Handling

The application listens to conference events:

```typescript
onConferenceEvent((event) => {
  switch (event.type) {
    case 'participant:joined':
      // Handle participant joined
      break
    case 'participant:left':
      // Handle participant left
      break
    case 'participant:updated':
      // Handle participant state changes
      break
    case 'state:changed':
      // Handle conference state changes
      break
    case 'audio:level':
      // Handle audio level updates
      break
  }
})
```

## Common Scenarios

### Scenario 1: Adding Participant Mid-Conference

```typescript
// Conference is already active
// Just add the participant - they'll be invited via SIP INVITE
const participantId = await addParticipant(
  'sip:latecomer@example.com',
  'Late Participant'
)
```

### Scenario 2: Muting Noisy Participants

```typescript
// Mute all except yourself
const mutePromises = participants.value
  .filter(p => !p.isSelf && !p.isMuted)
  .map(p => muteParticipant(p.id))

await Promise.all(mutePromises)
```

### Scenario 3: Handling Participant Disconnect

The `useConference` composable automatically updates participant state:

```typescript
onConferenceEvent((event) => {
  if (event.type === 'participant:left') {
    console.log(`${event.participant.displayName} left`)
    // Participant is automatically removed from the list
  }
})
```

### Scenario 4: Recording Important Meetings

```typescript
// Always inform participants before recording (legal requirement in many jurisdictions)
if (confirm('This conference will be recorded. Do all participants consent?')) {
  await startRecording()
}

// Later...
await stopRecording()
// Recording file location depends on server configuration
```

## Troubleshooting

### Connection Issues

**Problem**: Can't connect to SIP server

**Solutions**:
- Verify WebSocket URL format: `wss://domain:port` or `ws://domain:port`
- Check firewall allows WebSocket connections
- Ensure SIP server WebSocket transport is enabled
- Check browser console for detailed error messages

### Conference Creation Fails

**Problem**: Conference creation returns an error

**Solutions**:
- Verify SIP server supports conferencing (check server modules)
- Ensure user has permissions to create conferences
- Check server logs for errors
- Verify server has available conference resources

### Participants Can't Join

**Problem**: addParticipant fails or participants don't connect

**Solutions**:
- Verify participant SIP URI is correct
- Check conference isn't locked
- Verify conference isn't at max capacity
- Ensure participant's SIP account exists and is registered
- Check network connectivity for the participant

### Audio Level Not Updating

**Problem**: Audio level bars don't show activity

**Solutions**:
- Audio levels depend on server support for RFC 6464
- Check if `sipClient.getConferenceAudioLevels()` is implemented
- Verify WebRTC media is flowing (check browser DevTools)
- Some servers may not support real-time audio level reporting
- For Asterisk: Ensure `app_confbridge` is compiled with audio level support
- For FreeSWITCH: Check that `mod_conference` has audio level indicators enabled

**Debug Steps**:
```javascript
// Check if audio levels are being received
onConferenceEvent((event) => {
  if (event.type === 'audio:level') {
    console.log('Audio levels:', event.levels)
  }
})
```

### Recording Doesn't Work

**Problem**: Recording fails or no recording file is created

**Solutions**:
- Verify SIP server has recording configured
- Check server has sufficient disk space
- Verify user has recording permissions
- Check server configuration for recording path
- Some servers require specific dial plans for recording

**Asterisk Recording Setup**:
```ini
; In confbridge.conf
[my_conference_bridge]
record_conference=yes
recording_file=/var/spool/asterisk/confbridge/conf-%s-%Y%m%d-%H%M%S.wav
```

**FreeSWITCH Recording Setup**:
```xml
<param name="auto-record" value="true"/>
<param name="record-file-path" value="/usr/local/freeswitch/recordings"/>
```

### Mute/Unmute Not Working

**Problem**: Mute/unmute commands don't affect participant audio

**Solutions**:
- Verify moderator has permissions to mute other participants
- Check that the SIP server supports remote participant muting
- Local participant muting should work immediately via WebRTC
- Remote participant muting requires server-side support
- Some servers require special permissions for moderator controls

**Debug Steps**:
```javascript
// Check mute operation result
try {
  await muteParticipant(participantId)
  console.log('Mute successful')
} catch (error) {
  console.error('Mute failed:', error)
}
```

### Conference Cleanup Issues

**Problem**: Conference doesn't end properly or participants remain connected

**Solutions**:
- Always call `endConference()` explicitly before component unmount
- Check server logs for cleanup errors
- Verify server timeout settings for idle conferences
- Ensure network connection is stable during cleanup
- Some servers may need explicit BYE messages for each participant

## Browser Compatibility

This example requires:

- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- WebSocket support (all modern browsers)
- getUserMedia API for audio capture
- ES6+ JavaScript support

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Production Considerations

### Security

1. **Always use WSS** (secure WebSocket) in production
2. **Implement authentication** on your SIP server
3. **Use strong passwords** for SIP accounts
4. **Consider encryption** (SRTP) for media streams
5. **Validate participant URIs** before adding to prevent injection attacks

### Performance

1. **Limit max participants** based on server capacity
2. **Monitor server resources** during high participant counts
3. **Consider audio codec selection** for bandwidth efficiency
4. **Implement participant limits** appropriate for your infrastructure

### Privacy

1. **Inform participants** before recording (legal requirement)
2. **Secure recording storage** with appropriate access controls
3. **Implement retention policies** for recordings
4. **Consider GDPR/privacy regulations** for call data

### Reliability

1. **Implement reconnection logic** for network interruptions
2. **Handle server failures gracefully**
3. **Add error boundaries** for UI errors
4. **Log errors** for debugging and monitoring
5. **Consider load balancing** for multiple SIP servers

## Customization

### Styling

The example uses plain CSS with CSS custom properties. You can:

- Modify `src/style.css` for global styles
- Update component `<style scoped>` sections
- Integrate with UI libraries (PrimeVue, Vuetify, etc.)
- Add custom themes for light/dark mode

### Features

You can extend the example with:

- **Video conferencing**: Add video track support
- **Screen sharing**: Implement screen share functionality
- **Chat**: Add text messaging between participants
- **Breakout rooms**: Create sub-conferences
- **Participant roles**: Implement presenter/attendee roles
- **Waiting room**: Hold participants before admitting
- **Hand raising**: Signal to speak functionality
- **File sharing**: Share documents during conference

### UI Components

The components are designed to be modular:

- Replace `ParticipantCard` with your own design
- Customize `ConferenceRoom` layout (grid, list, gallery view)
- Add additional controls or features
- Integrate with your design system

## Resources

### VueSip Documentation
- [useConference API Reference](../../docs/composables/useConference.md)
- [Conference Types](../../src/types/conference.types.ts)
- [Main Documentation](../../README.md)

### SIP Standards
- [RFC 4579: SIP Call Control - Conferencing](https://tools.ietf.org/html/rfc4579)
- [RFC 6464: Audio Level Extension](https://tools.ietf.org/html/rfc6464)
- [RFC 7022: Guidelines for MultiStream Conferencing](https://tools.ietf.org/html/rfc7022)

### SIP Server Documentation
- [Asterisk Confbridge](https://wiki.asterisk.org/wiki/display/AST/ConfBridge)
- [FreeSWITCH Conference](https://freeswitch.org/confluence/display/FREESWITCH/mod_conference)
- [Kamailio Conference Modules](https://www.kamailio.org/docs/modules/stable/)

## License

This example is part of the VueSip project and is licensed under the MIT License.

## Support

For questions or issues:

1. Check this README thoroughly
2. Review the VueSip documentation
3. Check your SIP server logs
4. Open an issue on the VueSip GitHub repository
5. Consult your SIP server documentation

## Contributing

Contributions to improve this example are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Note**: This is a demonstration application. For production use, implement proper error handling, security measures, authentication, and monitoring appropriate for your use case.
