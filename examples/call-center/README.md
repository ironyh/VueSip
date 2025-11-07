# Call Center Example

A comprehensive, enterprise-grade call center application built with Vue 3, TypeScript, and VueSip. This example demonstrates how to build a full-featured customer support or sales calling center with agent management, call queuing, history tracking, and analytics.

## Features

### Core Call Center Functionality

- **Agent Status Management**: Toggle between Available, Busy, and Away states (persisted in localStorage)
- **Call Queue Visualization**: Real-time display of waiting calls with priority and wait time
- **Automatic Call Routing**: Route incoming calls to available agents
- **Active Call Interface**: Full-featured call controls during active calls
- **Call History Tracking**: Comprehensive call history with filtering and search
- **Statistics Dashboard**: Real-time analytics and performance metrics
- **Call Notes**: Add notes and comments during calls (automatically saved to call history)
- **DTMF Support**: Send DTMF tones during calls for IVR interaction
- **Export Functionality**: Export call history to CSV or JSON
- **Notification System**: Toast notifications for call events, errors, and status changes
- **Input Validation**: Validates SIP server addresses and credentials
- **Accessibility**: Full keyboard navigation and screen reader support

### User Interface

- **Agent Dashboard**: Quick overview of agent status and daily statistics
- **Call Queue Panel**: Shows waiting calls sorted by priority and wait time
- **Active Call Panel**:
  - Call timer
  - Mute/unmute controls
  - Hold/resume controls
  - DTMF dialpad
  - Call notes textarea
  - Hangup button
- **Statistics Cards**: Visual display of key metrics
- **Call History Table**: Filterable, paginated call history with callback functionality
- **Responsive Layout**: Three-column dashboard layout that adapts to screen size

## Prerequisites

### SIP Server Requirements

This application requires a SIP server with the following capabilities:

1. **Basic SIP Registration**: Standard SIP registration support
2. **Call Handling**: Incoming and outgoing call support
3. **WebRTC Support**: WSS (WebSocket Secure) transport
4. **DTMF Support**: RFC 2833 or SIP INFO for DTMF tones

### Recommended SIP Servers

- **Asterisk** (v16+): With `chan_pjsip` and WebRTC support
- **FreeSWITCH**: With `mod_verto` or WebRTC gateway
- **Kamailio**: With WebSocket and WebRTC modules

### Optional: Queue Management Integration

For production call center deployments, integrate with:

- **Asterisk Queue Application**: For true ACD (Automatic Call Distribution)
- **FreeSWITCH mod_callcenter**: For call center queue management
- **Third-party Queue Systems**: Via WebSocket or REST API integration

## Installation

### 1. Install Dependencies

From the call-center directory:

```bash
npm install
# or
pnpm install
```

### 2. Configure SIP Server

The connection panel (`src/components/ConnectionPanel.vue`) handles SIP credentials:

- **Server**: Your SIP server domain (without wss:// prefix, it's added automatically)
- **Username**: Agent extension number
- **Password**: Agent password
- **Display Name**: Agent's full name

The application automatically prefixes the server with `wss://` for WebSocket Secure connections.

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5174`

## Usage Guide

### Agent Workflow

#### 1. Login to Call Center

1. Enter your SIP server details
2. Enter your extension (username)
3. Enter your password
4. Enter your agent name
5. Click "Connect to Call Center"

#### 2. Set Agent Status

- **Available**: Ready to receive calls from the queue
- **Busy**: No new calls will be routed (current call continues)
- **Away**: Temporarily unavailable (break, lunch, etc.)

#### 3. Handle Incoming Calls

When a call enters the queue:

1. Call appears in the "Call Queue" panel
2. Shows caller information, wait time, and priority
3. Click "Answer" to accept the call
4. Agent status automatically changes to "Busy"
5. Call moves to "Active Call" panel

#### 4. During Active Call

**Available Controls:**

- **Mute/Unmute**: Toggle microphone
- **Hold/Resume**: Put call on hold
- **DTMF Dialpad**: Send tones for IVR navigation
- **Call Notes**: Add notes about the call
- **Hangup**: End the call

#### 5. After Call Completion

- Agent status returns to "Available"
- Call is automatically saved to history
- Ready for next call in queue

### Call History Features

#### Filtering

Filter calls by:

- **Direction**: Incoming or Outgoing
- **Status**: Answered or Missed
- **Date Range**: Custom date range

#### Actions

- **Call Back**: Click "Call" button to call the contact back
- **Export**: Export filtered history to CSV
- **Pagination**: Navigate through history pages

### Statistics Dashboard

View real-time metrics:

- **Total Calls**: All calls in history
- **Answered Calls**: Successfully answered calls
- **Missed Calls**: Unanswered incoming calls
- **Average Duration**: Mean call duration
- **Call Distribution**: Incoming vs Outgoing breakdown
- **Frequent Contacts**: Most frequent callers/callees

## Configuration

### Queue Simulation

This example includes a **simulated queue** for demonstration purposes. In production, you would integrate with your SIP server's queue system.

**Current Simulation:**
- Automatically generates incoming calls when agent is "Available"
- Updates wait times every 5 seconds
- Random caller selection from mock data

**To Disable Simulation:**

Remove or comment out the queue simulation code in `src/App.vue`:

```typescript
// Comment out these lines to disable simulation
// startQueueSimulation()
// stopQueueSimulation()
```

### Production Queue Integration

For real queue integration, replace the simulation with:

#### Option 1: Asterisk AMI/ARI Integration

```typescript
// Example: Connect to Asterisk ARI WebSocket
const ariWs = new WebSocket('ws://asterisk:8088/ari/events')

ariWs.on('message', (data) => {
  const event = JSON.parse(data)

  if (event.type === 'QueueCallerJoin') {
    addCallToQueue({
      id: event.caller.id,
      from: event.caller.number,
      displayName: event.caller.name,
      waitTime: 0,
      priority: event.priority
    })
  }
})
```

#### Option 2: Custom WebSocket Queue Server

```typescript
// Example: Connect to custom queue server
const queueWs = new WebSocket('wss://queue-server.com/agent')

queueWs.on('queue:call', (call) => {
  callQueue.value.push(call)
})

queueWs.on('queue:remove', (callId) => {
  callQueue.value = callQueue.value.filter(c => c.id !== callId)
})
```

### Auto-Answer Configuration

To enable automatic call answering when agent is available:

```typescript
// In App.vue, watch for incoming calls
const eventBus = getEventBus()

eventBus.on('call:incoming', async (call) => {
  if (agentStatus.value === 'available') {
    // Auto-answer after 1 second
    setTimeout(() => {
      answer()
    }, 1000)
  }
})
```

## Code Structure

### Main Application (`src/App.vue`)

The main application component orchestrates:

- SIP client connection
- Call session management
- Agent status state
- Call queue state
- Event handling
- Component coordination

### Components

#### `ConnectionPanel.vue`

- SIP server connection form
- Credential input
- Connection status display
- Error handling

#### `AgentStatusToggle.vue`

- Agent status buttons (Available/Busy/Away)
- Visual status indicators
- Status change events

#### `AgentDashboard.vue`

- Agent status display
- Today's call statistics
- Active call indicator
- Quick metrics cards

#### `CallQueue.vue`

- List of waiting calls
- Caller information display
- Wait time tracking
- Priority sorting
- Answer button

#### `ActiveCall.vue`

- Call header with caller info
- Call timer display
- Mute/hold/hangup controls
- DTMF dialpad
- Call notes textarea
- Call state indicators

#### `CallStats.vue`

- Statistics cards (total, answered, missed, avg duration)
- Call distribution charts
- Frequent contacts list
- Visual metrics display

#### `CallHistoryPanel.vue`

- Call history table
- Filter controls
- Date range selection
- Export functionality
- Pagination
- Call-back buttons

## State Management

### Agent State

```typescript
type AgentStatus = 'available' | 'busy' | 'away'
const agentStatus = ref<AgentStatus>('away')
```

- Managed in `App.vue`
- Controls queue routing
- Auto-updated during calls
- Persists across sessions using localStorage

### Call Queue State

```typescript
interface QueuedCall {
  id: string
  from: string
  displayName?: string
  waitTime: number
  priority?: number
}

const callQueue = ref<QueuedCall[]>([])
```

- Sorted by priority then wait time
- Updated in real-time
- Cleared when calls are answered

### Call History State

Managed by `useCallHistory` composable:

- Automatic persistence to IndexedDB
- Reactive filtering
- Export capabilities
- Statistics computation

## Advanced Features

### Call Recording Integration

Add call recording capability:

```typescript
// Example: Start recording during call
const startRecording = async () => {
  if (!session.value) return

  // Get media stream
  const stream = session.value.remoteStream

  // Create MediaRecorder
  const recorder = new MediaRecorder(stream)

  recorder.ondataavailable = (event) => {
    // Save recording blob
    const blob = event.data
    saveRecording(blob, session.value.id)
  }

  recorder.start()
}
```

### CRM Integration

Integrate with your CRM system:

```typescript
// Example: Lookup customer on incoming call
const lookupCustomer = async (phoneNumber: string) => {
  const response = await fetch(`/api/crm/lookup?phone=${phoneNumber}`)
  const customer = await response.json()

  // Display customer info in UI
  displayCustomerCard(customer)
}
```

### Screen Pop

Automatically open customer records:

```typescript
// Watch for incoming calls
watch(incomingCall, (call) => {
  if (call) {
    // Extract phone number
    const phoneNumber = extractNumber(call.remoteUri)

    // Open CRM screen pop
    window.open(`/crm/customer?phone=${phoneNumber}`, '_blank')
  }
})
```

### Supervisor Dashboard

Create a supervisor view:

```typescript
// Monitor all agents
const agents = ref<Agent[]>([])

// Real-time agent status
const updateAgentStatus = (agentId: string, status: AgentStatus) => {
  const agent = agents.value.find(a => a.id === agentId)
  if (agent) {
    agent.status = status
  }
}

// Queue statistics
const queueStats = computed(() => ({
  waiting: callQueue.value.length,
  averageWait: calculateAverageWait(),
  longestWait: Math.max(...callQueue.value.map(c => c.waitTime))
}))
```

## Testing

### Development Testing

1. **Use a SIP Test Server**: Set up Asterisk or FreeSWITCH locally
2. **Create Test Extensions**: Configure multiple extensions for testing
3. **Simulate Calls**: Use SIPp or another SIP client to generate test calls
4. **Test Queue Scenarios**:
   - Single call in queue
   - Multiple calls with different priorities
   - Long wait times
   - Agent status changes

### Test Checklist

- [ ] Agent can connect to SIP server
- [ ] Agent status changes correctly
- [ ] Calls appear in queue when available
- [ ] Answer button accepts calls
- [ ] Mute/unmute works during call
- [ ] Hold/resume works during call
- [ ] DTMF tones are sent
- [ ] Call timer updates correctly
- [ ] Call notes are saved
- [ ] Hangup ends call properly
- [ ] Call history is recorded
- [ ] Filters work correctly
- [ ] Export generates valid files
- [ ] Statistics update in real-time

## Production Deployment

### Environment Variables

Create `.env.production`:

```env
VITE_SIP_SERVER=sip.yourcompany.com
VITE_SIP_PORT=7443
VITE_QUEUE_WS=wss://queue.yourcompany.com
VITE_CRM_API=https://api.yourcompany.com
```

### Build for Production

```bash
npm run build
```

### Security Considerations

1. **Use WSS**: Always use secure WebSocket (WSS) in production
2. **Credential Storage**: Don't hardcode credentials
3. **HTTPS Only**: Serve over HTTPS for WebRTC to work
4. **Authentication**: Implement proper authentication
5. **Session Management**: Handle session timeouts
6. **Data Encryption**: Encrypt sensitive call data

### Performance Optimization

1. **Virtual Scrolling**: For large call histories
2. **Lazy Loading**: Load history in chunks
3. **Debounce Filters**: Debounce filter inputs
4. **IndexedDB**: Use for offline history access
5. **Web Workers**: Process statistics in background

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to SIP server

**Solutions**:
- Verify server address and port
- Check WebSocket support (WSS)
- Verify firewall allows WebSocket connections
- Check browser console for errors
- Ensure credentials are correct

### Audio Issues

**Problem**: No audio during call

**Solutions**:
- Check microphone permissions
- Verify speaker/microphone selection
- Check browser compatibility
- Ensure STUN/TURN servers are configured
- Verify SIP server media path

### Queue Issues

**Problem**: Calls not appearing in queue

**Solutions**:
- Verify agent status is "Available"
- Check queue simulation is running
- Verify queue integration connection
- Check server-side queue configuration

## Browser Compatibility

- **Chrome/Edge**: Fully supported (recommended)
- **Firefox**: Fully supported
- **Safari**: Supported (iOS 14.3+)
- **Opera**: Supported

## License

This example is part of the VueSip project and follows the same license.

## Support

For questions and support:

1. Check the [VueSip Documentation](../../docs)
2. Review the [API Reference](../../docs/api)
3. Open an issue on GitHub
4. Join the community Discord

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Recent Improvements

This example has been enhanced with:

1. **Fixed Connection Handling**: SIP configuration is now properly passed to the connect function
2. **Input Validation**: Server address and credentials are validated before connection
3. **Call Notes Persistence**: Notes are automatically saved to call history metadata
4. **Agent Status Persistence**: Status is preserved across page refreshes using localStorage
5. **Event Bus Integration**: Proper handling of incoming calls and call failures
6. **Notification System**: Real-time toast notifications for all important events
7. **Type Safety**: Removed all `any` types for better TypeScript safety
8. **Accessibility**: Added aria-labels, roles, and keyboard navigation support
9. **Error Handling**: Comprehensive error handling with user-friendly messages
10. **Production Ready**: Added .gitignore and improved overall code quality

## Next Steps

Potential enhancements:

1. **Call Transfer**: Add attended and blind transfer
2. **Conference Calls**: Multi-party calling
3. **Call Recording**: Automatic call recording
4. **CRM Integration**: Deep CRM integration
5. **Reporting**: Advanced analytics and reports
6. **Supervisor Tools**: Call monitoring and whisper
7. **IVR Builder**: Visual IVR flow designer
8. **Mobile App**: React Native version
9. **Screen Sharing**: WebRTC screen sharing
10. **AI Integration**: Sentiment analysis, transcription

## Resources

- [VueSip Documentation](../../README.md)
- [SIP Protocol RFC 3261](https://tools.ietf.org/html/rfc3261)
- [WebRTC Standards](https://webrtc.org/)
- [Asterisk Documentation](https://docs.asterisk.org/)
- [FreeSWITCH Documentation](https://freeswitch.org/confluence/)
