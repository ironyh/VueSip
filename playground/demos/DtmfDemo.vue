<template>
  <div class="dtmf-demo">
    <div class="info-section">
      <p>
        DTMF (Dual-Tone Multi-Frequency) tones are used to send keypad inputs during an active
        call. This is commonly used for navigating IVR menus, entering PIN codes, or interacting
        with automated systems.
      </p>
      <p class="note">
        <strong>Note:</strong> You must be in an active call to send DTMF tones. Connect to your
        SIP server and establish a call first.
      </p>
    </div>

    <!-- Connection Status -->
    <div v-if="!isConnected" class="status-message info">
      Connect to a SIP server to use DTMF features (use the Basic Call demo to connect)
    </div>

    <div v-else-if="callState !== 'active'" class="status-message warning">
      Make or answer a call to send DTMF tones
    </div>

    <!-- DTMF Keypad -->
    <div v-else class="dtmf-active">
      <div class="call-info">
        <div class="info-badge">In Call: {{ remoteUri || 'Unknown' }}</div>
      </div>

      <div class="dtmf-keypad">
        <button
          v-for="key in dialpadKeys"
          :key="key"
          class="dtmf-key"
          @click="sendTone(key)"
        >
          {{ key }}
        </button>
      </div>

      <div v-if="lastTone" class="tone-feedback">
        Last tone sent: <strong>{{ lastTone }}</strong>
      </div>

      <div class="dtmf-sequence">
        <h4>Send Tone Sequence</h4>
        <div class="sequence-input">
          <input
            v-model="toneSequence"
            type="text"
            placeholder="Enter digits (e.g., 1234#)"
            @keyup.enter="sendSequence"
          />
          <button
            class="btn btn-primary"
            :disabled="!toneSequence.trim() || sending"
            @click="sendSequence"
          >
            {{ sending ? 'Sending...' : 'Send Sequence' }}
          </button>
        </div>
        <small>Enter a sequence of digits (0-9, *, #) to send with a delay between each tone</small>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useDTMF } from 'vuesip'

const { sendTone, canSendDTMF } = useDTMF(sessionRef)

// Send a single digit
await sendTone('1')

// Send a sequence with delay
const sequence = '1234#'
for (const digit of sequence) {
  if (canSendDTMF.value) {
    await sendTone(digit)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient, useCallSession, useDTMF } from '../../src'

// Get SIP client
const { isConnected, getClient } = useSipClient()

// Get call session
const sipClientRef = computed(() => getClient())
const { state: callState, remoteUri, session } = useCallSession(sipClientRef)

// DTMF
const { sendTone: sendDtmfTone, canSendDTMF } = useDTMF(session)

// State
const lastTone = ref('')
const toneSequence = ref('')
const sending = ref(false)

// Dialpad keys
const dialpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

// Methods
const sendTone = async (tone: string) => {
  if (!canSendDTMF.value) return

  try {
    await sendDtmfTone(tone)
    lastTone.value = tone

    // Clear feedback after 2 seconds
    setTimeout(() => {
      if (lastTone.value === tone) {
        lastTone.value = ''
      }
    }, 2000)
  } catch (error) {
    console.error('DTMF error:', error)
    alert(`Failed to send tone: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const sendSequence = async () => {
  if (!toneSequence.value.trim() || !canSendDTMF.value || sending.value) return

  sending.value = true
  try {
    const sequence = toneSequence.value.replace(/[^0-9*#]/g, '') // Only allow valid DTMF chars

    for (const digit of sequence) {
      await sendDtmfTone(digit)
      lastTone.value = digit

      // Wait 150ms between tones
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    toneSequence.value = ''
  } catch (error) {
    console.error('DTMF sequence error:', error)
    alert(`Failed to send sequence: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.dtmf-demo {
  max-width: 600px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0 0 1rem 0;
  color: #666;
  line-height: 1.6;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.note {
  padding: 1rem;
  background: #eff6ff;
  border-left: 3px solid #667eea;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status-message {
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
}

.status-message.info {
  background: #eff6ff;
  color: #1e40af;
}

.status-message.warning {
  background: #fef3c7;
  color: #92400e;
}

.dtmf-active {
  padding: 1.5rem;
}

.call-info {
  text-align: center;
  margin-bottom: 1.5rem;
}

.info-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.dtmf-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  max-width: 300px;
  margin: 0 auto 1.5rem;
}

.dtmf-key {
  aspect-ratio: 1;
  border: 2px solid #d1d5db;
  background: white;
  border-radius: 12px;
  font-size: 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  color: #333;
}

.dtmf-key:hover {
  background: #f3f4f6;
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dtmf-key:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background: #667eea;
  color: white;
}

.tone-feedback {
  text-align: center;
  padding: 1rem;
  background: #eff6ff;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  color: #1e40af;
}

.tone-feedback strong {
  font-size: 1.25rem;
  color: #667eea;
}

.dtmf-sequence {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.dtmf-sequence h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.sequence-input {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.sequence-input input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.sequence-input input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.sequence-input small {
  display: block;
  color: #6b7280;
  font-size: 0.75rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.code-example {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.code-example pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1.5rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}
</style>
