# Performance Optimization

This guide covers performance optimization techniques for VueSip applications, including bundle size optimization, memory management, concurrent call handling, and network optimization.

## Overview

VueSip is designed with performance in mind, featuring:

- **Small Bundle Size** - Optimized for minimal footprint with tree-shaking support
- **Memory Efficient** - Proper cleanup and resource management
- **Concurrent Calls** - Handle multiple simultaneous calls efficiently
- **Network Optimized** - Smart reconnection and keep-alive strategies
- **Performance Monitoring** - Built-in statistics and metrics collection

## Bundle Size Optimization

### Tree-Shaking Support

VueSip is built with ES modules and supports tree-shaking out of the box. Import only what you need:

```typescript
// Good - Import only what you need
import { useSipClient, useCallSession } from 'vuesip'

// Avoid - Importing everything
import * as VueSip from 'vuesip'
```

### External Dependencies

VueSip externalizes peer dependencies to reduce bundle size:

```typescript
// package.json
{
  "peerDependencies": {
    "vue": "^3.4.0"
  },
  "dependencies": {
    "jssip": "^3.10.0",
    "webrtc-adapter": "^9.0.0"
  }
}
```

When building your application, ensure these dependencies are marked as external in your build configuration.

### Module Formats

VueSip provides multiple module formats for different use cases:

```json
{
  "exports": {
    ".": {
      "import": "./dist/vuesip.js",      // ES Module (tree-shakable)
      "require": "./dist/vuesip.cjs",    // CommonJS
      "types": "./dist/index.d.ts"       // TypeScript definitions
    }
  }
}
```

**Recommendation**: Use the ES module format (`import`) for optimal tree-shaking.

### Build Optimization

VueSip uses Vite with the following optimizations:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // Minification with Terser
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,    // Keep console logs for debugging
        drop_debugger: true,    // Remove debugger statements
      },
    },
    // Target modern browsers
    target: 'es2020',
    // Generate source maps
    sourcemap: true,
  }
})
```

### Bundle Size Targets

VueSip maintains strict bundle size targets:

```typescript
export const PERFORMANCE = {
  /** Maximum bundle size (minified) */
  MAX_BUNDLE_SIZE: 150 * 1024,        // 150 KB

  /** Maximum bundle size (gzipped) */
  MAX_BUNDLE_SIZE_GZIPPED: 50 * 1024, // 50 KB
}
```

### Lazy Loading Composables

For large applications, consider lazy loading composables:

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

// Lazy load heavy composables
const loadConference = () => import('vuesip').then(m => m.useConference)

async function startConference() {
  const { useConference } = await import('vuesip')
  const conference = useConference(sipClient)
  await conference.createConference()
}
</script>
```

### Code Splitting Strategy

Split your SIP functionality into chunks:

```typescript
// routes.ts
const routes = [
  {
    path: '/call',
    component: () => import('./views/CallView.vue'),  // Lazy load call features
  },
  {
    path: '/conference',
    component: () => import('./views/ConferenceView.vue'),  // Lazy load conference
  },
]
```

## Memory Management

### Automatic Cleanup

VueSip composables automatically clean up resources when components unmount:

```vue
<script setup lang="ts">
import { useSipClient } from 'vuesip'

const sipClient = useSipClient(config)

// Cleanup happens automatically on component unmount
// No manual cleanup needed!
</script>
```

### Manual Resource Management

For manual control, use the cleanup methods:

```typescript
import { SipClient, EventBus, MediaManager } from 'vuesip'

// Create instances
const eventBus = new EventBus()
const sipClient = new SipClient(config, eventBus)
const mediaManager = new MediaManager({ eventBus })

// Use instances...

// Clean up when done
sipClient.stop()              // Stop SIP client
mediaManager.destroy()        // Clean up media resources
eventBus.removeAllListeners() // Remove event listeners
```

### Media Stream Cleanup

Always clean up media streams to prevent memory leaks:

```typescript
import { useMediaDevices } from 'vuesip'

const { localStream, stopLocalStream } = useMediaDevices()

// When done with the stream
async function cleanup() {
  await stopLocalStream()
}

// Or manually stop all tracks
function manualCleanup() {
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => {
      track.stop()
    })
  }
}
```

### Event Listener Management

Properly manage event listeners to prevent memory leaks:

```typescript
import { EventBus } from 'vuesip'

const eventBus = new EventBus()

// Add listener
const handler = (event) => console.log(event)
eventBus.on('call:incoming', handler)

// Remove specific listener
eventBus.off('call:incoming', handler)

// Remove all listeners for an event
eventBus.removeAllListeners('call:incoming')

// Remove ALL listeners (cleanup)
eventBus.removeAllListeners()
```

### Call Session Cleanup

Call sessions automatically clean up when terminated:

```typescript
import { useCallSession } from 'vuesip'

const { currentCall, hangup } = useCallSession()

// Hang up cleans up:
// - Media streams
// - RTCPeerConnection
// - Event listeners
// - Timers
await hangup()
```

### Timer and Interval Management

VueSip automatically manages all timers and intervals:

```typescript
// MediaManager cleanup
destroy(): void {
  // Stop intervals
  this.stopStatsCollection()      // Clears stats interval
  this.stopQualityAdjustment()    // Clears quality interval
  this.stopDeviceChangeMonitoring() // Removes device listeners

  // Close peer connection
  this.closePeerConnection()

  // Stop local stream
  this.stopLocalStream()

  // Clear state
  this.devices = []
  this.remoteStream = undefined
}
```

### Memory Limits

VueSip enforces memory limits for calls:

```typescript
export const PERFORMANCE = {
  /** Maximum memory per call in bytes */
  MAX_MEMORY_PER_CALL: 50 * 1024 * 1024, // 50 MB

  /** Default maximum call history entries */
  DEFAULT_MAX_HISTORY_ENTRIES: 1000,
}
```

Configure these limits based on your needs:

```typescript
import { callStore } from 'vuesip'

// Set custom limits
callStore.setMaxHistoryEntries(500)  // Limit history to 500 entries
```

### Monitoring Memory Usage

Monitor memory usage in development:

```typescript
// Check memory usage (Chrome DevTools)
if (performance.memory) {
  console.log('Used JS Heap:', performance.memory.usedJSHeapSize)
  console.log('Total JS Heap:', performance.memory.totalJSHeapSize)
  console.log('Heap Limit:', performance.memory.jsHeapSizeLimit)
}
```

## Concurrent Call Handling

### Maximum Concurrent Calls

Configure the maximum number of concurrent calls:

```typescript
import { callStore } from 'vuesip'

// Default is 4 concurrent calls
const DEFAULT_MAX_CONCURRENT_CALLS = 4

// Check if at limit
if (callStore.isAtMaxCalls) {
  console.log('Maximum concurrent calls reached')
}

// Get current count
console.log('Active calls:', callStore.activeCallCount)
```

### Call Queue Management

VueSip manages incoming calls in a queue:

```typescript
import { useCallSession } from 'vuesip'

const { incomingCalls, answerCall } = useCallSession()

// Handle queued incoming calls
watch(incomingCalls, (calls) => {
  if (calls.length > 0) {
    console.log(`${calls.length} incoming calls waiting`)

    // Answer first call in queue
    const firstCall = calls[0]
    answerCall(firstCall.id)
  }
})
```

### Conference Calls

Handle multiple participants efficiently with conference calls:

```typescript
import { useConference } from 'vuesip'

const sipClient = useSipClient(config)
const conference = useConference(sipClient)

// Create conference
const conferenceId = await conference.createConference({
  maxParticipants: 10,  // Limit participants
  locked: false,
  recording: false,
})

// Add participants
await conference.addParticipant('sip:user1@example.com')
await conference.addParticipant('sip:user2@example.com')

// Monitor participant count
watch(() => conference.participantCount.value, (count) => {
  console.log(`Conference has ${count} participants`)
})
```

### Call State Management

Efficiently manage call state with the call store:

```typescript
import { callStore } from 'vuesip'

// Access active calls
const activeCalls = callStore.activeCalls        // Map<string, CallSession>
const callsArray = callStore.activeCallsArray    // CallSession[]

// Get specific call
const call = callStore.getCall('call-id-123')

// Get established (active) calls only
const establishedCalls = callStore.establishedCalls

// Remove terminated calls
callStore.removeCall('call-id-123')
```

### Performance Considerations

When handling multiple concurrent calls:

1. **Limit Active Calls**: Set a reasonable maximum (default: 4)
2. **Use Call Queuing**: Queue incoming calls instead of rejecting
3. **Monitor Resources**: Check CPU and memory usage
4. **Clean Up Terminated Calls**: Remove calls from store when ended
5. **Optimize Media**: Consider audio-only for multiple calls

```typescript
// Example: Reject calls when at capacity
import { useCallSession } from 'vuesip'

const { onIncomingCall } = useCallSession()

onIncomingCall((call) => {
  if (callStore.activeCallCount >= 4) {
    // Reject call with 486 Busy
    call.reject()
  } else {
    // Add to queue
    callStore.addIncomingCall(call.id)
  }
})
```

## Network Optimization

### Connection Management

VueSip uses smart connection management with the TransportManager:

```typescript
const transportConfig = {
  url: 'wss://sip.example.com:7443',

  // Connection timeout (default: 10s)
  connectionTimeout: 10000,

  // Max reconnection attempts (default: 5)
  maxReconnectionAttempts: 5,

  // Keep-alive interval (default: 30s)
  keepAliveInterval: 30000,

  // Keep-alive type: 'crlf' or 'options'
  keepAliveType: 'crlf',

  // Enable auto-reconnect (default: true)
  autoReconnect: true,
}
```

### Exponential Backoff

Reconnection uses exponential backoff to prevent server overload:

```typescript
// Reconnection delays
const RECONNECTION_DELAYS = [2000, 4000, 8000, 16000, 32000] // milliseconds

// Delay increases with each attempt:
// Attempt 1: 2s
// Attempt 2: 4s
// Attempt 3: 8s
// Attempt 4: 16s
// Attempt 5: 32s
```

### Keep-Alive Strategies

Two keep-alive strategies are supported:

#### CRLF Keep-Alive (Recommended)

```typescript
import { useSipClient } from 'vuesip'

const sipClient = useSipClient({
  uri: 'wss://sip.example.com:7443',
  wsOptions: {
    keepAliveType: 'crlf',        // Send CRLF pings
    keepAliveInterval: 30000,     // Every 30 seconds
  }
})
```

#### OPTIONS Keep-Alive

```typescript
const sipClient = useSipClient({
  uri: 'wss://sip.example.com:7443',
  wsOptions: {
    keepAliveType: 'options',     // Send SIP OPTIONS
    keepAliveInterval: 30000,
  }
})
```

### ICE Optimization

Optimize ICE candidate gathering:

```typescript
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },  // Public STUN
    {
      urls: 'turn:turn.example.com:3478',      // TURN for NAT traversal
      username: 'user',
      credential: 'pass',
    },
  ],

  // ICE transport policy
  iceTransportPolicy: 'all',  // 'all' or 'relay'

  // Bundle policy (recommended: 'max-bundle')
  bundlePolicy: 'max-bundle',

  // RTCP Mux policy
  rtcpMuxPolicy: 'require',
}
```

### ICE Gathering Timeout

VueSip uses a timeout to prevent hanging:

```typescript
export const ICE_GATHERING_TIMEOUT = 5000  // 5 seconds

// If ICE gathering takes longer, proceed anyway
// This prevents indefinite waiting
```

### SDP Optimization

Optimize SDP for better performance:

```typescript
import { useCallSession } from 'vuesip'

const { makeCall } = useCallSession()

// Make call with optimized options
await makeCall('sip:user@example.com', {
  mediaConstraints: {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1,  // Mono saves bandwidth
    },
    video: false,  // Audio-only for better performance
  },
})
```

### Bandwidth Management

Control bandwidth usage:

```typescript
// Audio codec preferences (ordered by efficiency)
const AUDIO_CODECS = [
  'opus',   // Best quality, adaptive bitrate
  'G722',   // Wideband
  'PCMU',   // G.711 µ-law
  'PCMA',   // G.711 A-law
]

// Video codec preferences
const VIDEO_CODECS = [
  'VP8',    // Required by WebRTC
  'VP9',    // Better compression than VP8
  'H264',   // Widely supported
]
```

### Network Quality Monitoring

Monitor network quality with statistics:

```typescript
import { useCallSession } from 'vuesip'

const { currentCall, statistics } = useCallSession()

// Monitor statistics every second
watch(statistics, (stats) => {
  if (stats) {
    console.log('Audio stats:', {
      packetsLost: stats.audio.packetsLost,
      packetsSent: stats.audio.packetsSent,
      jitter: stats.audio.jitter,
      roundTripTime: stats.network.roundTripTime,
    })

    // Adjust quality based on network conditions
    if (stats.audio.packetsLost > 100) {
      console.warn('High packet loss detected')
    }
  }
})
```

## Performance Monitoring

### Statistics Collection

Enable statistics collection for performance monitoring:

```typescript
import { MediaManager } from 'vuesip'

const mediaManager = new MediaManager({
  eventBus,
  autoQualityAdjustment: true,  // Enable automatic quality adjustment
})

// Statistics are collected every 1000ms
export const STATS_COLLECTION_INTERVAL = 1000
```

### Available Metrics

VueSip collects comprehensive metrics:

```typescript
interface MediaStatistics {
  audio: {
    packetsLost: number
    packetsSent: number
    packetsReceived: number
    bytesSent: number
    bytesReceived: number
    jitter: number
    codecName?: string
    bitrate?: number
  }

  video: {
    packetsLost: number
    framesSent: number
    framesReceived: number
    framesDropped: number
    codecName?: string
    bitrate?: number
  }

  network: {
    roundTripTime: number
    availableOutgoingBitrate?: number
    availableIncomingBitrate?: number
    currentRoundTripTime?: number
  }

  timestamp: Date
}
```

### Custom Monitoring

Implement custom performance monitoring:

```typescript
import { EventBus } from 'vuesip'

const eventBus = new EventBus()

// Monitor call setup time
let callStartTime: number

eventBus.on('call:outgoing', () => {
  callStartTime = Date.now()
})

eventBus.on('call:accepted', () => {
  const setupTime = Date.now() - callStartTime
  console.log(`Call setup time: ${setupTime}ms`)

  // Target: < 2 seconds
  if (setupTime > 2000) {
    console.warn('Call setup time exceeded target')
  }
})

// Monitor event propagation time
eventBus.on('*', (event) => {
  const propagationTime = Date.now() - event.timestamp.getTime()
  if (propagationTime > 10) {
    console.warn(`Slow event propagation: ${propagationTime}ms`)
  }
})
```

### Performance Targets

VueSip defines performance targets:

```typescript
export const PERFORMANCE = {
  /** Target call setup time in milliseconds */
  TARGET_CALL_SETUP_TIME: 2000,           // 2 seconds

  /** Maximum state update latency in milliseconds */
  MAX_STATE_UPDATE_LATENCY: 50,           // 50ms

  /** Maximum event propagation time in milliseconds */
  MAX_EVENT_PROPAGATION_TIME: 10,         // 10ms

  /** Target CPU usage during call (percentage) */
  TARGET_CPU_USAGE: 15,                   // 15%
}
```

## Performance Benchmarking

### Call Setup Benchmark

Measure call setup performance:

```typescript
async function benchmarkCallSetup() {
  const iterations = 10
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    // Make call
    await makeCall('sip:test@example.com')

    // Wait for acceptance
    await new Promise(resolve => {
      eventBus.once('call:accepted', resolve)
    })

    const end = performance.now()
    times.push(end - start)

    // Hang up
    await hangup()

    // Wait between iterations
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const average = times.reduce((a, b) => a + b) / times.length
  console.log(`Average call setup time: ${average.toFixed(2)}ms`)
  console.log(`Min: ${Math.min(...times).toFixed(2)}ms`)
  console.log(`Max: ${Math.max(...times).toFixed(2)}ms`)
}
```

### Memory Benchmark

Monitor memory usage during calls:

```typescript
async function benchmarkMemory() {
  const measurements: number[] = []

  // Measure baseline
  if (performance.memory) {
    measurements.push(performance.memory.usedJSHeapSize)
  }

  // Make multiple calls
  for (let i = 0; i < 5; i++) {
    await makeCall(`sip:user${i}@example.com`)

    if (performance.memory) {
      measurements.push(performance.memory.usedJSHeapSize)
    }
  }

  // Calculate memory per call
  const baseline = measurements[0]
  const final = measurements[measurements.length - 1]
  const memoryPerCall = (final - baseline) / 5

  console.log(`Baseline: ${(baseline / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Final: ${(final / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Memory per call: ${(memoryPerCall / 1024 / 1024).toFixed(2)} MB`)
}
```

### Bundle Size Analysis

Analyze your bundle size:

```bash
# Build with bundle analysis
npm run build

# Check output
ls -lh dist/

# Analyze bundle composition (using vite-bundle-visualizer)
npx vite-bundle-visualizer
```

### Performance Testing Script

Create a comprehensive performance test:

```typescript
// performance-test.ts
import { useSipClient, useCallSession, callStore } from 'vuesip'

async function runPerformanceTests() {
  console.log('Starting VueSip Performance Tests...\n')

  // 1. Connection test
  console.log('1. Testing connection speed...')
  const connectionStart = performance.now()
  await sipClient.connect()
  const connectionTime = performance.now() - connectionStart
  console.log(`   Connection time: ${connectionTime.toFixed(2)}ms\n`)

  // 2. Registration test
  console.log('2. Testing registration speed...')
  const regStart = performance.now()
  await sipClient.register()
  const regTime = performance.now() - regStart
  console.log(`   Registration time: ${regTime.toFixed(2)}ms\n`)

  // 3. Call setup test
  console.log('3. Testing call setup...')
  await benchmarkCallSetup()
  console.log()

  // 4. Concurrent calls test
  console.log('4. Testing concurrent calls...')
  const calls = []
  for (let i = 0; i < 4; i++) {
    calls.push(makeCall(`sip:test${i}@example.com`))
  }
  await Promise.all(calls)
  console.log(`   Active calls: ${callStore.activeCallCount}`)
  console.log(`   Memory usage: ${getMemoryUsage()}\n`)

  // 5. Memory leak test
  console.log('5. Testing for memory leaks...')
  await testMemoryLeaks()

  console.log('\nPerformance tests complete!')
}

function getMemoryUsage(): string {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize
    return `${(used / 1024 / 1024).toFixed(2)} MB`
  }
  return 'N/A'
}

async function testMemoryLeaks() {
  const iterations = 10
  const measurements: number[] = []

  for (let i = 0; i < iterations; i++) {
    await makeCall('sip:test@example.com')
    await hangup()

    if (performance.memory) {
      measurements.push(performance.memory.usedJSHeapSize)
    }
  }

  // Check for memory growth
  const first = measurements[0]
  const last = measurements[measurements.length - 1]
  const growth = ((last - first) / first * 100).toFixed(2)

  console.log(`   Memory growth: ${growth}%`)
  if (parseFloat(growth) > 10) {
    console.warn('   WARNING: Potential memory leak detected!')
  } else {
    console.log('   ✓ No memory leaks detected')
  }
}

// Run tests
runPerformanceTests().catch(console.error)
```

## Best Practices

### General Performance Tips

1. **Use Tree-Shaking**: Import only what you need
2. **Clean Up Resources**: Always clean up when done
3. **Limit Concurrent Calls**: Set reasonable limits (default: 4)
4. **Monitor Statistics**: Track metrics in production
5. **Use Audio-Only**: Video requires significantly more resources
6. **Optimize ICE**: Use appropriate STUN/TURN servers
7. **Enable Compression**: Use efficient codecs (Opus for audio)
8. **Lazy Load**: Load features on demand
9. **Cache Configuration**: Reuse SIP client instances
10. **Profile Regularly**: Use Chrome DevTools Performance tab

### Production Checklist

- [ ] Bundle size under 150 KB (50 KB gzipped)
- [ ] Tree-shaking enabled
- [ ] Proper cleanup in all components
- [ ] Memory usage monitored
- [ ] Concurrent call limits configured
- [ ] Network reconnection tested
- [ ] Statistics collection enabled
- [ ] Performance benchmarks run
- [ ] Memory leak tests passed
- [ ] Production builds optimized

### Common Pitfalls

**1. Forgetting to Clean Up**
```typescript
// ❌ Bad: No cleanup
const { connect } = useSipClient(config)
await connect()

// ✅ Good: Automatic cleanup with composable
// Or manual cleanup when using classes
sipClient.stop()
```

**2. Too Many Concurrent Calls**
```typescript
// ❌ Bad: No limits
for (let i = 0; i < 20; i++) {
  await makeCall(`sip:user${i}@example.com`)
}

// ✅ Good: Respect limits
if (!callStore.isAtMaxCalls) {
  await makeCall(targetUri)
}
```

**3. Not Monitoring Performance**
```typescript
// ❌ Bad: No monitoring
await makeCall(uri)

// ✅ Good: Monitor performance
const start = performance.now()
await makeCall(uri)
console.log(`Call setup: ${performance.now() - start}ms`)
```

**4. Inefficient State Updates**
```typescript
// ❌ Bad: Direct mutations
activeCalls.value.push(newCall)

// ✅ Good: Use store methods
callStore.addCall(newCall)
```

### Performance Optimization Workflow

1. **Measure**: Use Chrome DevTools to identify bottlenecks
2. **Analyze**: Check bundle size, memory usage, network
3. **Optimize**: Apply relevant optimizations
4. **Test**: Verify improvements with benchmarks
5. **Monitor**: Track metrics in production
6. **Iterate**: Continuously improve

## Conclusion

VueSip is optimized for performance out of the box, but understanding these optimization techniques will help you build faster, more efficient VoIP applications. Regular monitoring and testing ensure your application maintains optimal performance as it grows.

For more information, see:

- [Getting Started](./getting-started.md)
- [Making Calls](./making-calls.md)
- [Device Management](./device-management.md)
- [API Reference](/api/)
