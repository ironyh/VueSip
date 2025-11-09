<template>
  <div class="speed-dial-demo">
    <div class="info-section">
      <p>
        Speed Dial allows you to save frequently called contacts for quick access. Click any
        contact to instantly initiate a call. Contacts are saved in localStorage and persist
        across sessions.
      </p>
    </div>

    <!-- Connection Status -->
    <div v-if="!isConnected" class="status-message info">
      Connect to a SIP server to use speed dial (use the Basic Call demo to connect)
    </div>

    <!-- Speed Dial Interface -->
    <div v-else class="speed-dial-interface">
      <!-- Speed Dial Grid -->
      <div class="speed-dial-grid">
        <div
          v-for="(contact, index) in speedDialSlots"
          :key="index"
          class="speed-dial-slot"
          :class="{ empty: !contact, calling: callingIndex === index }"
        >
          <!-- Empty Slot -->
          <div v-if="!contact" class="empty-slot" @click="showAddDialog(index)">
            <div class="slot-icon">➕</div>
            <div class="slot-label">Add Contact</div>
          </div>

          <!-- Filled Slot -->
          <div v-else class="filled-slot">
            <button
              class="call-button"
              :disabled="callState !== 'idle' || !isRegistered"
              @click="handleSpeedDial(contact, index)"
            >
              <div class="contact-avatar">{{ getInitials(contact.name) }}</div>
              <div class="contact-info">
                <div class="contact-name">{{ contact.name }}</div>
                <div class="contact-number">{{ contact.number }}</div>
              </div>
            </button>
            <button class="delete-button" @click="handleDelete(index)" title="Remove contact">
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Add/Edit Dialog -->
      <div v-if="showDialog" class="dialog-overlay" @click="handleDialogClose">
        <div class="dialog" @click.stop>
          <h3>{{ editingContact ? 'Edit' : 'Add' }} Speed Dial Contact</h3>

          <div class="form-group">
            <label for="contact-name">Name</label>
            <input
              id="contact-name"
              v-model="dialogContact.name"
              type="text"
              placeholder="John Doe"
              @keyup.enter="handleSave"
            />
          </div>

          <div class="form-group">
            <label for="contact-number">SIP URI or Number</label>
            <input
              id="contact-number"
              v-model="dialogContact.number"
              type="text"
              placeholder="sip:user@example.com or 1234"
              @keyup.enter="handleSave"
            />
          </div>

          <div class="dialog-actions">
            <button
              class="btn btn-primary"
              :disabled="!dialogContact.name.trim() || !dialogContact.number.trim()"
              @click="handleSave"
            >
              Save
            </button>
            <button class="btn btn-secondary" @click="handleDialogClose">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Current Call Status -->
      <div v-if="callState !== 'idle'" class="call-status">
        <div class="status-badge">
          {{ callState === 'active' ? '📞 In Call' : '📱 Calling...' }}
        </div>
        <div v-if="remoteUri" class="status-info">
          Connected to: {{ remoteUri }}
        </div>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { ref, onMounted } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

interface SpeedDialContact {
  name: string
  number: string
}

const STORAGE_KEY = 'vuesip-speed-dial'
const MAX_SLOTS = 9

// Load speed dial contacts from localStorage
const speedDialSlots = ref&lt;(SpeedDialContact | null)[]&gt;(
  Array(MAX_SLOTS).fill(null)
)

const loadSpeedDial = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    speedDialSlots.value = JSON.parse(saved)
  }
}

const saveSpeedDial = () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(speedDialSlots.value)
  )
}

// Add contact to speed dial
const addContact = (index: number, contact: SpeedDialContact) => {
  speedDialSlots.value[index] = contact
  saveSpeedDial()
}

// Call speed dial contact
const { makeCall } = useCallSession(sipClient)

const dialContact = async (contact: SpeedDialContact) => {
  await makeCall(contact.number)
}

// Load on mount
onMounted(() => {
  loadSpeedDial()
})</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSipClient, useCallSession } from '../../src'

interface SpeedDialContact {
  name: string
  number: string
}

const STORAGE_KEY = 'vuesip-speed-dial'
const MAX_SLOTS = 9

// SIP Client and Call Session
const { isConnected, isRegistered, getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const { state: callState, remoteUri, makeCall } = useCallSession(sipClientRef)

// State
const speedDialSlots = ref<(SpeedDialContact | null)[]>(Array(MAX_SLOTS).fill(null))
const showDialog = ref(false)
const editingIndex = ref<number | null>(null)
const editingContact = ref<SpeedDialContact | null>(null)
const callingIndex = ref<number | null>(null)
const dialogContact = ref<SpeedDialContact>({
  name: '',
  number: '',
})

// Methods
const loadSpeedDial = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        speedDialSlots.value = parsed
      }
    } catch (error) {
      console.error('Failed to load speed dial:', error)
    }
  }
}

const saveSpeedDial = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(speedDialSlots.value))
}

const showAddDialog = (index: number) => {
  editingIndex.value = index
  editingContact.value = speedDialSlots.value[index]
  dialogContact.value = editingContact.value
    ? { ...editingContact.value }
    : { name: '', number: '' }
  showDialog.value = true
}

const handleSave = () => {
  if (!dialogContact.value.name.trim() || !dialogContact.value.number.trim()) {
    return
  }

  if (editingIndex.value !== null) {
    speedDialSlots.value[editingIndex.value] = {
      name: dialogContact.value.name.trim(),
      number: dialogContact.value.number.trim(),
    }
    saveSpeedDial()
  }

  handleDialogClose()
}

const handleDelete = (index: number) => {
  if (confirm('Remove this contact from speed dial?')) {
    speedDialSlots.value[index] = null
    saveSpeedDial()
  }
}

const handleDialogClose = () => {
  showDialog.value = false
  editingIndex.value = null
  editingContact.value = null
  dialogContact.value = { name: '', number: '' }
}

const handleSpeedDial = async (contact: SpeedDialContact, index: number) => {
  if (callState.value !== 'idle' || !isRegistered.value) return

  callingIndex.value = index
  try {
    await makeCall(contact.number)
  } catch (error) {
    console.error('Speed dial call failed:', error)
    alert(`Failed to call ${contact.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    // Reset calling index after a short delay
    setTimeout(() => {
      callingIndex.value = null
    }, 1000)
  }
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Load speed dial on mount
onMounted(() => {
  loadSpeedDial()
})
</script>

<style scoped>
.speed-dial-demo {
  max-width: 700px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.status-message {
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.status-message.info {
  background: #eff6ff;
  color: #1e40af;
}

.speed-dial-interface {
  padding: 1.5rem;
}

.speed-dial-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.speed-dial-slot {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.speed-dial-slot.empty {
  border: 2px dashed #d1d5db;
  background: white;
}

.speed-dial-slot.calling {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.empty-slot {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-slot:hover {
  background: #f9fafb;
  border-color: #667eea;
}

.slot-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.slot-label {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
}

.filled-slot {
  position: relative;
  width: 100%;
  height: 100%;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
}

.call-button {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 1rem;
  transition: all 0.2s;
}

.call-button:not(:disabled):hover {
  background: #f9fafb;
}

.call-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.contact-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
}

.contact-info {
  text-align: center;
  width: 100%;
}

.contact-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-number {
  font-size: 0.75rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.filled-slot:hover .delete-button {
  opacity: 1;
}

.delete-button:hover {
  background: #dc2626;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.dialog h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
  font-size: 0.875rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
}

.btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
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

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.call-status {
  background: #d1fae5;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.status-badge {
  font-size: 1.125rem;
  font-weight: 600;
  color: #065f46;
  margin-bottom: 0.5rem;
}

.status-info {
  font-size: 0.875rem;
  color: #047857;
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

@media (max-width: 768px) {
  .speed-dial-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
