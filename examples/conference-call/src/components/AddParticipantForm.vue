<template>
  <div class="card add-participant-form">
    <h3>Add Participant</h3>

    <div v-if="isLocked" class="warning-message">
      Conference is locked. Unlock it to add new participants.
    </div>

    <div v-else-if="isFull" class="warning-message">
      Conference is full ({{ maxParticipants }} participants maximum).
    </div>

    <form v-else @submit.prevent="handleSubmit" class="form">
      <div class="form-row">
        <div class="form-group">
          <label for="participantUri">SIP URI *</label>
          <input
            id="participantUri"
            v-model="participantUri"
            type="text"
            placeholder="sip:user@domain.com"
            required
            pattern="sip:.*"
            title="Must be a valid SIP URI (e.g., sip:1001@example.com)"
          />
          <small class="help-text">
            Example: sip:1001@example.com or sip:alice@sip.server.com
          </small>
        </div>

        <div class="form-group">
          <label for="displayName">Display Name</label>
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            placeholder="e.g., Alice Smith"
          />
          <small class="help-text">
            Optional friendly name for this participant
          </small>
        </div>
      </div>

      <button type="submit" class="primary add-btn" :disabled="adding">
        {{ adding ? 'Adding...' : 'Add to Conference' }}
      </button>
    </form>

    <!-- Quick Add Suggestions -->
    <div v-if="!isLocked && !isFull" class="quick-add">
      <h4>Quick Add</h4>
      <p class="help-text">
        Click to quickly add test participants:
      </p>
      <div class="quick-add-buttons">
        <button
          @click="quickAdd('sip:1001@example.com', 'Alice')"
          class="quick-add-btn"
          :disabled="adding"
        >
          + Alice (1001)
        </button>
        <button
          @click="quickAdd('sip:1002@example.com', 'Bob')"
          class="quick-add-btn"
          :disabled="adding"
        >
          + Bob (1002)
        </button>
        <button
          @click="quickAdd('sip:1003@example.com', 'Charlie')"
          class="quick-add-btn"
          :disabled="adding"
        >
          + Charlie (1003)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * Add Participant Form Component
 *
 * Form for adding new participants to the conference.
 * Includes validation and quick-add buttons for testing.
 */

interface Props {
  isLocked: boolean
  isFull: boolean
  maxParticipants: number
}

interface Emits {
  (e: 'addParticipant', uri: string, displayName: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const participantUri = ref('')
const displayName = ref('')
const adding = ref(false)

/**
 * Handle form submission
 */
const handleSubmit = () => {
  if (!participantUri.value) {
    return
  }

  adding.value = true

  // Emit the add participant event
  emit('addParticipant', participantUri.value, displayName.value)

  // Reset form and loading state after a short delay
  // This gives the parent time to handle the request
  setTimeout(() => {
    participantUri.value = ''
    displayName.value = ''
    adding.value = false
  }, 500)
}

/**
 * Quick add a participant with predefined values
 */
const quickAdd = (uri: string, name: string) => {
  adding.value = true
  emit('addParticipant', uri, name)

  // Reset loading state after a short delay
  setTimeout(() => {
    adding.value = false
  }, 500)
}
</script>

<style scoped>
.add-participant-form h3 {
  margin-bottom: 1.5rem;
}

.warning-message {
  padding: 1rem;
  background-color: rgba(255, 152, 0, 0.2);
  border-left: 4px solid #ff9800;
  border-radius: 4px;
  color: #ff9800;
  font-weight: 500;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.help-text {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.add-btn {
  margin-top: 0.5rem;
}

.quick-add {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.quick-add h4 {
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.quick-add p {
  margin-bottom: 1rem;
}

.quick-add-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.quick-add-btn {
  background-color: rgba(100, 108, 255, 0.2);
  border: 1px solid #646cff;
  color: #646cff;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.quick-add-btn:hover:not(:disabled) {
  background-color: rgba(100, 108, 255, 0.3);
}

@media (prefers-color-scheme: light) {
  .help-text {
    color: rgba(0, 0, 0, 0.6);
  }

  .quick-add {
    border-top-color: rgba(0, 0, 0, 0.1);
  }

  .quick-add-btn {
    background-color: rgba(100, 108, 255, 0.1);
  }

  .quick-add-btn:hover:not(:disabled) {
    background-color: rgba(100, 108, 255, 0.2);
  }
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .quick-add-buttons {
    flex-direction: column;
  }

  .quick-add-btn {
    width: 100%;
  }
}
</style>
