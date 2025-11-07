# Security Best Practices

This guide covers security best practices for VueSip applications, including credential storage, transport security, media encryption, and input validation.

## Overview

VueSip implements multiple layers of security to protect your VoIP communications:

- **Transport Security (WSS/TLS)** - Encrypted WebSocket connections for SIP signaling
- **Media Encryption (DTLS-SRTP)** - End-to-end encryption for audio/video streams
- **Credential Storage** - AES-GCM encryption for sensitive data at rest
- **Input Validation** - Comprehensive validation for all user inputs
- **Authentication** - SIP Digest authentication with MD5 and HA1 support

## Transport Security (WSS/TLS)

### WebSocket Secure (WSS)

Always use WebSocket Secure (WSS) for SIP signaling in production environments. WSS provides TLS encryption for all SIP messages between your application and the SIP server.

**✅ Recommended - Secure Connection:**

```typescript
import { useSipClient } from 'vuesip'

const { connect } = useSipClient({
  uri: 'wss://sip.example.com:7443',  // WSS protocol
  sipUri: 'sip:1000@example.com',
  password: 'your-password'
})
```

**❌ Not Recommended - Insecure Connection:**

```typescript
// Only use ws:// for local development/testing
const { connect } = useSipClient({
  uri: 'ws://localhost:8088',  // Unencrypted - development only!
  sipUri: 'sip:1000@example.com',
  password: 'your-password'
})
```

### Production Environment Check

VueSip automatically warns when using insecure WebSocket connections in production:

```typescript
// VueSip will log a warning if NODE_ENV === 'production' and uri starts with 'ws://'
if (config.uri.startsWith('ws://') && process.env.NODE_ENV === 'production') {
  console.warn('Using insecure WebSocket (ws://) in production. Use wss:// for secure connections.')
}
```

### TLS Certificate Validation

Ensure your SIP server has a valid TLS certificate:

- Use certificates from trusted Certificate Authorities (Let's Encrypt, DigiCert, etc.)
- Avoid self-signed certificates in production
- Keep certificates up to date and monitor expiration

### Best Practices

1. **Always use WSS in production** - Never use `ws://` for production deployments
2. **Use standard TLS ports** - Port 443 (HTTPS/WSS) or 7443 (WSS)
3. **Validate server certificates** - Ensure proper TLS certificate validation
4. **Monitor connection security** - Log and alert on connection failures

## Media Encryption (DTLS-SRTP)

### Overview

VueSip uses WebRTC's built-in DTLS-SRTP for media encryption. This provides end-to-end encryption for all audio and video streams.

**Key Features:**
- **DTLS** - Datagram Transport Layer Security for key exchange
- **SRTP** - Secure Real-time Transport Protocol for media encryption
- **Forward Secrecy** - New keys generated for each session
- **Mandatory Encryption** - WebRTC enforces encryption by default

### RTCPeerConnection Security

WebRTC automatically handles media encryption through RTCPeerConnection. VueSip configures this securely by default:

```typescript
// MediaManager automatically configures secure RTCPeerConnection
const rtcConfiguration = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302'],
    },
    {
      urls: ['turn:turn.example.com:3478'],
      username: 'your-username',
      credential: 'your-credential',
      credentialType: 'password'
    }
  ],
  iceTransportPolicy: 'all',  // Use 'relay' to force TURN (more secure, higher latency)
  bundlePolicy: 'balanced',
  rtcpMuxPolicy: 'require'
}
```

### STUN/TURN Server Configuration

Configure STUN and TURN servers for NAT traversal and enhanced security:

```typescript
import { useSipClient } from 'vuesip'

const { connect } = useSipClient({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'your-password',
  rtcConfiguration: {
    // STUN servers for NAT traversal
    stunServers: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302'
    ],
    // TURN servers for relay (required in restrictive networks)
    turnServers: [
      {
        urls: ['turn:turn.example.com:3478'],
        username: 'turn-user',
        credential: 'turn-password',
        credentialType: 'password'
      },
      {
        urls: ['turns:turn.example.com:5349'],  // TURN over TLS
        username: 'turn-user',
        credential: 'turn-password',
        credentialType: 'password'
      }
    ],
    // Force TURN relay for maximum security (no direct peer connections)
    iceTransportPolicy: 'relay'  // Options: 'all' | 'relay'
  }
})
```

### ICE Transport Policy

Choose the appropriate ICE transport policy based on your security requirements:

| Policy | Security | Performance | Use Case |
|--------|----------|-------------|----------|
| `all` (default) | Good | Best | Normal operations |
| `relay` | Best | Lower | High-security environments |

**Force TURN Relay (Maximum Security):**

```typescript
rtcConfiguration: {
  iceTransportPolicy: 'relay',  // All traffic through TURN server
  turnServers: [/* your TURN servers */]
}
```

### Media Encryption Best Practices

1. **Use TURN over TLS (TURNS)** - Encrypt the relay connection itself
2. **Secure TURN credentials** - Use time-limited credentials when possible
3. **Monitor ICE connection states** - Detect and log connection failures
4. **Prefer relay in sensitive environments** - Use `iceTransportPolicy: 'relay'`

## Credential Storage

### Encryption at Rest

VueSip provides built-in encryption for sensitive data stored locally using the Web Crypto API with AES-GCM encryption.

**Encryption Specifications:**
- **Algorithm**: AES-GCM (256-bit)
- **Key Derivation**: PBKDF2 with SHA-256
- **Iterations**: 100,000 (configurable)
- **Salt**: Random 16-byte salt per encryption
- **IV**: Random 12-byte initialization vector per encryption

### Using Encrypted Storage

```typescript
import { createEncryptedAdapter } from 'vuesip'
import { LocalStorageAdapter } from 'vuesip/storage'

// Create encrypted storage adapter
const encryptedStorage = createEncryptedAdapter(
  new LocalStorageAdapter(),
  {
    enabled: true,
    algorithm: 'AES-GCM',
    iterations: 100000  // Minimum recommended
  }
)

// Use with useSipClient
const { connect } = useSipClient({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'your-password',
  storageAdapter: encryptedStorage,
  encryptionKey: 'user-specific-key'  // Derive from user password or secure source
})
```

### Generating Encryption Keys

**Option 1: Generate Random Key**

```typescript
import { generateEncryptionKey } from 'vuesip'

// Generate a random encryption key
const encryptionKey = generateEncryptionKey(32)  // 32 bytes = 256 bits

// Store securely (e.g., in memory or secure credential manager)
// DO NOT store in localStorage in plain text!
```

**Option 2: Derive from User Password**

```typescript
import { hashPassword } from 'vuesip'

// Derive key from user password
const userPassword = 'user-master-password'
const encryptionKey = await hashPassword(userPassword)

// Use this key for encryption/decryption
```

### Storage Adapter Options

Choose the appropriate storage adapter based on your security and persistence requirements:

| Adapter | Persistence | Scope | Security Level | Use Case |
|---------|-------------|-------|----------------|----------|
| **SessionStorage** | Session only | Tab-specific | High | Temporary sessions |
| **LocalStorage** | Permanent | Origin-wide | Medium | Remember credentials |
| **IndexedDB** | Permanent | Origin-wide | Medium | Large datasets |
| **Memory (default)** | None | Instance | Highest | Maximum security |

**Example: Session Storage (No Persistence)**

```typescript
import { SessionStorageAdapter } from 'vuesip/storage'

const storage = new SessionStorageAdapter()

const { connect } = useSipClient({
  // ... config
  storageAdapter: storage
})
```

**Example: IndexedDB (Encrypted, Persistent)**

```typescript
import { IndexedDBAdapter } from 'vuesip/storage'
import { createEncryptedAdapter, generateEncryptionKey } from 'vuesip'

const encryptionKey = generateEncryptionKey()
const storage = createEncryptedAdapter(
  new IndexedDBAdapter('vuesip-db'),
  { enabled: true, iterations: 100000 }
)

const { connect } = useSipClient({
  // ... config
  storageAdapter: storage,
  encryptionKey
})
```

### Credential Storage Best Practices

1. **Never store plaintext passwords** - Always use encryption
2. **Use HA1 hash when possible** - More secure than plaintext passwords
3. **Minimize credential lifetime** - Clear credentials on logout
4. **Use SessionStorage for sensitive apps** - No persistence after tab close
5. **Secure encryption keys** - Never hardcode keys in source code
6. **Implement key rotation** - Periodically update encryption keys

## Authentication

### SIP Digest Authentication

VueSip supports SIP Digest Authentication (MD5) for secure authentication with SIP servers.

**Standard Password Authentication:**

```typescript
const { connect } = useSipClient({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'your-password',  // Sent as MD5 hash
  authorizationUsername: '1000',  // Optional, defaults to sipUri user part
  realm: 'asterisk'  // Optional, provided by server
})
```

### HA1 Hash Authentication

For enhanced security, use pre-computed HA1 hashes instead of plaintext passwords:

**What is HA1?**

HA1 = MD5(username:realm:password)

This allows you to store a hash instead of the actual password.

```typescript
// Pre-compute HA1 hash (server-side or during registration)
const username = '1000'
const realm = 'asterisk'
const password = 'secret123'
const ha1 = MD5(`${username}:${realm}:${password}`)

// Use HA1 in client configuration
const { connect } = useSipClient({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  ha1: ha1,  // Use HA1 instead of password
  realm: 'asterisk'
})
```

**Benefits of HA1:**
- Password never stored in plaintext
- Reduced exposure if credentials are compromised
- Compatible with SIP Digest authentication

### Authentication Best Practices

1. **Use HA1 when possible** - Avoid storing plaintext passwords
2. **Validate server challenges** - Ensure 401/407 responses are legitimate
3. **Monitor auth failures** - Log and alert on repeated failures
4. **Implement rate limiting** - Prevent brute force attacks
5. **Use strong passwords** - Minimum 12 characters, mixed case, numbers, symbols

## Input Validation

VueSip includes comprehensive input validation to prevent injection attacks and ensure data integrity.

### SIP URI Validation

Always validate SIP URIs before use:

```typescript
import { validateSipUri } from 'vuesip'

const result = validateSipUri('sip:1000@example.com')

if (result.valid) {
  console.log('Valid SIP URI:', result.normalized)
  // Use: sip:1000@example.com (normalized)
} else {
  console.error('Invalid SIP URI:', result.error)
}
```

**Validation Rules:**
- Must start with `sip:` or `sips:`
- Must include user part and domain
- Port must be between 1-65535
- Domain is normalized to lowercase

### Phone Number Validation

Validate E.164 formatted phone numbers:

```typescript
import { validatePhoneNumber } from 'vuesip'

const result = validatePhoneNumber('+14155551234')

if (result.valid) {
  console.log('Valid phone number:', result.normalized)
  // Use: +14155551234
} else {
  console.error('Invalid phone number:', result.error)
}
```

**E.164 Format:**
- Starts with `+`
- Followed by country code and number
- Maximum 15 digits total

### WebSocket URL Validation

Validate WebSocket URLs:

```typescript
import { validateWebSocketUrl } from 'vuesip'

const result = validateWebSocketUrl('wss://sip.example.com:7443')

if (result.valid) {
  console.log('Valid WebSocket URL:', result.normalized)
} else {
  console.error('Invalid WebSocket URL:', result.error)
}
```

**Validation Rules:**
- Must use `ws://` or `wss://` protocol
- Must include valid hostname
- Port is optional

### DTMF Tone Validation

Validate DTMF tones before sending:

```typescript
import { validateDtmfTone, validateDtmfSequence } from 'vuesip'

// Single tone
const tone = validateDtmfTone('1')
if (tone.valid) {
  sendDTMF(tone.normalized)  // '1'
}

// Sequence
const sequence = validateDtmfSequence('1234*#')
if (sequence.valid) {
  sendDTMF(sequence.normalized)  // '1234*#'
}
```

**Valid DTMF tones:** `0-9`, `*`, `#`, `A-D`

### Configuration Validation

VueSip automatically validates all configuration before connecting:

```typescript
import { validateSipConfig } from 'vuesip'

const config = {
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'secret123'
}

const validation = validateSipConfig(config)

if (!validation.valid) {
  console.error('Configuration errors:', validation.errors)
  // Handle errors before attempting connection
}

if (validation.warnings) {
  console.warn('Configuration warnings:', validation.warnings)
}
```

### Input Validation Best Practices

1. **Validate all user inputs** - Never trust client-side data
2. **Use built-in validators** - Leverage VueSip's validation functions
3. **Sanitize before display** - Prevent XSS attacks in UI
4. **Validate on both client and server** - Defense in depth
5. **Handle validation errors gracefully** - Provide clear user feedback

## Security Checklist

Use this checklist to ensure your VueSip application follows security best practices:

### Transport Security

- [ ] Use WSS (`wss://`) in production, never WS (`ws://`)
- [ ] Verify SIP server has valid TLS certificate
- [ ] Monitor for connection security warnings
- [ ] Use standard secure ports (443, 7443)

### Media Security

- [ ] Configure STUN servers for NAT traversal
- [ ] Configure TURN servers for relay capabilities
- [ ] Use TURNS (TURN over TLS) when available
- [ ] Consider `iceTransportPolicy: 'relay'` for high-security environments
- [ ] Monitor ICE connection states

### Credential Security

- [ ] Never store plaintext passwords in source code
- [ ] Use encrypted storage adapters for persistent credentials
- [ ] Use HA1 hashes instead of plaintext passwords when possible
- [ ] Generate strong encryption keys (not hardcoded)
- [ ] Implement proper key management
- [ ] Clear credentials on logout

### Storage Security

- [ ] Use SessionStorage for temporary sessions
- [ ] Encrypt all persistent storage (LocalStorage, IndexedDB)
- [ ] Use appropriate PBKDF2 iterations (100,000+)
- [ ] Implement secure key derivation
- [ ] Never log encryption keys

### Authentication Security

- [ ] Use SIP Digest authentication
- [ ] Implement authentication failure monitoring
- [ ] Use strong passwords (12+ characters)
- [ ] Consider HA1 pre-computed hashes
- [ ] Validate authentication realms

### Input Validation

- [ ] Validate all SIP URIs using `validateSipUri()`
- [ ] Validate phone numbers using `validatePhoneNumber()`
- [ ] Validate WebSocket URLs using `validateWebSocketUrl()`
- [ ] Validate DTMF tones using `validateDtmfTone()`
- [ ] Validate configuration using `validateSipConfig()`
- [ ] Sanitize user inputs before display

### Application Security

- [ ] Implement Content Security Policy (CSP)
- [ ] Use HTTPS for all application resources
- [ ] Implement proper CORS policies
- [ ] Keep dependencies up to date
- [ ] Monitor for security vulnerabilities
- [ ] Implement logging and monitoring
- [ ] Conduct regular security audits

## Common Security Pitfalls

### ❌ Pitfall 1: Using Insecure WebSocket

```typescript
// BAD - Unencrypted connection in production
const { connect } = useSipClient({
  uri: 'ws://sip.example.com:8088',  // ❌ Not secure!
  sipUri: 'sip:1000@example.com',
  password: 'secret'
})
```

**✅ Solution: Use WSS**

```typescript
// GOOD - Encrypted WebSocket connection
const { connect } = useSipClient({
  uri: 'wss://sip.example.com:7443',  // ✅ Secure
  sipUri: 'sip:1000@example.com',
  password: 'secret'
})
```

### ❌ Pitfall 2: Hardcoded Credentials

```typescript
// BAD - Credentials in source code
const { connect } = useSipClient({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'hardcoded-password-123'  // ❌ Security risk!
})
```

**✅ Solution: Use Environment Variables or User Input**

```typescript
// GOOD - Load from environment or user input
const { connect } = useSipClient({
  uri: import.meta.env.VITE_SIP_URI,
  sipUri: userInputSipUri.value,
  password: userInputPassword.value  // ✅ From user input
})
```

### ❌ Pitfall 3: Storing Plaintext Passwords

```typescript
// BAD - Plaintext password in localStorage
localStorage.setItem('sipPassword', 'my-password')  // ❌ Exposed!
```

**✅ Solution: Use Encrypted Storage**

```typescript
// GOOD - Encrypted storage adapter
import { createEncryptedAdapter, LocalStorageAdapter } from 'vuesip'

const storage = createEncryptedAdapter(
  new LocalStorageAdapter(),
  { enabled: true, iterations: 100000 }
)
```

### ❌ Pitfall 4: No Input Validation

```typescript
// BAD - No validation before use
const sipUri = userInput.value  // Could be anything!
await makeCall(sipUri)  // ❌ Potential injection
```

**✅ Solution: Validate All Inputs**

```typescript
// GOOD - Validate before use
import { validateSipUri } from 'vuesip'

const result = validateSipUri(userInput.value)
if (result.valid) {
  await makeCall(result.normalized)  // ✅ Safe to use
} else {
  showError(`Invalid SIP URI: ${result.error}`)
}
```

### ❌ Pitfall 5: Logging Sensitive Data

```typescript
// BAD - Logging credentials
console.log('Connecting with password:', password)  // ❌ Exposed in logs!
console.log('User config:', config)  // ❌ May contain secrets
```

**✅ Solution: Sanitize Logs**

```typescript
// GOOD - Sanitize before logging
const sanitizedConfig = {
  ...config,
  password: '***REDACTED***',
  ha1: '***REDACTED***'
}
console.log('User config:', sanitizedConfig)  // ✅ Safe to log
```

## Additional Resources

### Web Crypto API
- [MDN - Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Subtle Crypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)

### WebRTC Security
- [WebRTC Security Architecture](https://www.rfc-editor.org/rfc/rfc8827)
- [DTLS-SRTP](https://www.rfc-editor.org/rfc/rfc5764)

### SIP Security
- [SIP Authentication (RFC 3261)](https://www.rfc-editor.org/rfc/rfc3261#section-22)
- [SIP Security Mechanisms](https://www.rfc-editor.org/rfc/rfc3329)

### OWASP Resources
- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

## Next Steps

Now that you understand VueSip security best practices, explore these guides:

- [Getting Started](./getting-started.md) - Set up your first VueSip application
- [Making Calls](./making-calls.md) - Learn how to make outgoing calls
- [Device Management](./device-management.md) - Configure audio/video devices
- [Call Controls](./call-controls.md) - Advanced call control features
