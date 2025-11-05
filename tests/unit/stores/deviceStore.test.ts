/**
 * Device Store Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { deviceStore } from '../../../src/stores/deviceStore'
import { MediaDeviceKind, PermissionStatus, type MediaDevice } from '../../../src/types/media.types'

describe('deviceStore', () => {
  // Helper function to create mock devices
  const createMockDevice = (kind: MediaDeviceKind, id: string, label: string): MediaDevice => ({
    deviceId: id,
    kind,
    label,
    groupId: 'group-1',
    isDefault: id === 'default',
  })

  beforeEach(() => {
    deviceStore.reset()
  })

  describe('Initial State', () => {
    it('should start with empty device lists', () => {
      expect(deviceStore.audioInputDevices).toHaveLength(0)
      expect(deviceStore.audioOutputDevices).toHaveLength(0)
      expect(deviceStore.videoInputDevices).toHaveLength(0)
      expect(deviceStore.totalDevices).toBe(0)
    })

    it('should have no selected devices', () => {
      expect(deviceStore.selectedAudioInputId).toBeNull()
      expect(deviceStore.selectedAudioOutputId).toBeNull()
      expect(deviceStore.selectedVideoInputId).toBeNull()
    })

    it('should have permissions not requested', () => {
      expect(deviceStore.audioPermission).toBe(PermissionStatus.NotRequested)
      expect(deviceStore.videoPermission).toBe(PermissionStatus.NotRequested)
    })

    it('should have no device change listener', () => {
      expect(deviceStore.hasDeviceChangeListener()).toBe(false)
    })
  })

  describe('Device Management', () => {
    it('should set audio input devices', () => {
      const devices = [
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1'),
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-2', 'Microphone 2'),
      ]

      deviceStore.setAudioInputDevices(devices)

      expect(deviceStore.audioInputDevices).toHaveLength(2)
      expect(deviceStore.hasAudioInputDevices).toBe(true)
    })

    it('should set audio output devices', () => {
      const devices = [
        createMockDevice(MediaDeviceKind.AudioOutput, 'speaker-1', 'Speaker 1'),
        createMockDevice(MediaDeviceKind.AudioOutput, 'speaker-2', 'Speaker 2'),
      ]

      deviceStore.setAudioOutputDevices(devices)

      expect(deviceStore.audioOutputDevices).toHaveLength(2)
      expect(deviceStore.hasAudioOutputDevices).toBe(true)
    })

    it('should set video input devices', () => {
      const devices = [
        createMockDevice(MediaDeviceKind.VideoInput, 'cam-1', 'Camera 1'),
        createMockDevice(MediaDeviceKind.VideoInput, 'cam-2', 'Camera 2'),
      ]

      deviceStore.setVideoInputDevices(devices)

      expect(deviceStore.videoInputDevices).toHaveLength(2)
      expect(deviceStore.hasVideoInputDevices).toBe(true)
    })

    it('should auto-select first device if none selected', () => {
      const devices = [
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1'),
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-2', 'Microphone 2'),
      ]

      deviceStore.setAudioInputDevices(devices)

      expect(deviceStore.selectedAudioInputId).toBe('mic-1')
    })

    it('should auto-select default device if available', () => {
      const devices = [
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1'),
        createMockDevice(MediaDeviceKind.AudioInput, 'default', 'Default Mic'),
      ]

      deviceStore.setAudioInputDevices(devices)

      expect(deviceStore.selectedAudioInputId).toBe('default')
    })

    it('should update all devices from MediaDeviceInfo array', () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'mic-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          groupId: 'group-1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
        {
          deviceId: 'speaker-1',
          kind: 'audiooutput',
          label: 'Speaker 1',
          groupId: 'group-1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
        {
          deviceId: 'cam-1',
          kind: 'videoinput',
          label: 'Camera 1',
          groupId: 'group-1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]

      deviceStore.updateDevices(mockDevices)

      expect(deviceStore.audioInputDevices).toHaveLength(1)
      expect(deviceStore.audioOutputDevices).toHaveLength(1)
      expect(deviceStore.videoInputDevices).toHaveLength(1)
      expect(deviceStore.totalDevices).toBe(3)
    })

    it('should update last enumeration time', () => {
      const devices = [createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1')]

      const beforeTime = new Date()
      deviceStore.setAudioInputDevices(devices)
      const afterTime = new Date()

      const enumTime = deviceStore.lastEnumerationTime
      expect(enumTime).toBeTruthy()
      expect(enumTime!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(enumTime!.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })
  })

  describe('Device Selection', () => {
    it('should select audio input device', () => {
      const devices = [
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1'),
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-2', 'Microphone 2'),
      ]
      deviceStore.setAudioInputDevices(devices)

      const result = deviceStore.selectAudioInput('mic-2')

      expect(result).toBe(true)
      expect(deviceStore.selectedAudioInputId).toBe('mic-2')
      expect(deviceStore.selectedAudioInputDevice?.label).toBe('Microphone 2')
    })

    it('should not select non-existent audio input', () => {
      const devices = [createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1')]
      deviceStore.setAudioInputDevices(devices)

      const result = deviceStore.selectAudioInput('non-existent')

      expect(result).toBe(false)
      expect(deviceStore.selectedAudioInputId).toBe('mic-1') // Should remain first device
    })

    it('should select audio output device', () => {
      const devices = [
        createMockDevice(MediaDeviceKind.AudioOutput, 'speaker-1', 'Speaker 1'),
        createMockDevice(MediaDeviceKind.AudioOutput, 'speaker-2', 'Speaker 2'),
      ]
      deviceStore.setAudioOutputDevices(devices)

      deviceStore.selectAudioOutput('speaker-2')

      expect(deviceStore.selectedAudioOutputId).toBe('speaker-2')
      expect(deviceStore.selectedAudioOutputDevice?.label).toBe('Speaker 2')
    })

    it('should select video input device', () => {
      const devices = [
        createMockDevice(MediaDeviceKind.VideoInput, 'cam-1', 'Camera 1'),
        createMockDevice(MediaDeviceKind.VideoInput, 'cam-2', 'Camera 2'),
      ]
      deviceStore.setVideoInputDevices(devices)

      deviceStore.selectVideoInput('cam-2')

      expect(deviceStore.selectedVideoInputId).toBe('cam-2')
      expect(deviceStore.selectedVideoInputDevice?.label).toBe('Camera 2')
    })

    it('should clear audio input selection', () => {
      const devices = [createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1')]
      deviceStore.setAudioInputDevices(devices)

      deviceStore.clearAudioInputSelection()

      expect(deviceStore.selectedAudioInputId).toBeNull()
    })

    it('should clear audio output selection', () => {
      const devices = [createMockDevice(MediaDeviceKind.AudioOutput, 'speaker-1', 'Speaker 1')]
      deviceStore.setAudioOutputDevices(devices)

      deviceStore.clearAudioOutputSelection()

      expect(deviceStore.selectedAudioOutputId).toBeNull()
    })

    it('should clear video input selection', () => {
      const devices = [createMockDevice(MediaDeviceKind.VideoInput, 'cam-1', 'Camera 1')]
      deviceStore.setVideoInputDevices(devices)

      deviceStore.clearVideoInputSelection()

      expect(deviceStore.selectedVideoInputId).toBeNull()
    })
  })

  describe('Permission Management', () => {
    it('should set audio permission', () => {
      deviceStore.setAudioPermission(PermissionStatus.Granted)

      expect(deviceStore.audioPermission).toBe(PermissionStatus.Granted)
      expect(deviceStore.hasAudioPermission).toBe(true)
    })

    it('should set video permission', () => {
      deviceStore.setVideoPermission(PermissionStatus.Granted)

      expect(deviceStore.videoPermission).toBe(PermissionStatus.Granted)
      expect(deviceStore.hasVideoPermission).toBe(true)
    })

    it('should update permissions together', () => {
      deviceStore.updatePermissions(true, true)

      expect(deviceStore.audioPermission).toBe(PermissionStatus.Granted)
      expect(deviceStore.videoPermission).toBe(PermissionStatus.Granted)
      expect(deviceStore.hasAnyPermission).toBe(true)
    })

    it('should mark audio permission as denied', () => {
      deviceStore.denyAudioPermission()

      expect(deviceStore.audioPermission).toBe(PermissionStatus.Denied)
      expect(deviceStore.isAudioPermissionDenied).toBe(true)
    })

    it('should mark video permission as denied', () => {
      deviceStore.denyVideoPermission()

      expect(deviceStore.videoPermission).toBe(PermissionStatus.Denied)
      expect(deviceStore.isVideoPermissionDenied).toBe(true)
    })

    it('should detect when any permission is granted', () => {
      expect(deviceStore.hasAnyPermission).toBe(false)

      deviceStore.setAudioPermission(PermissionStatus.Granted)
      expect(deviceStore.hasAnyPermission).toBe(true)
    })
  })

  describe('Device Change Handling', () => {
    it('should track device change listener state', () => {
      deviceStore.setDeviceChangeListenerAttached()

      expect(deviceStore.hasDeviceChangeListener()).toBe(true)
    })

    it('should mark listener as detached', () => {
      deviceStore.setDeviceChangeListenerAttached()
      deviceStore.setDeviceChangeListenerDetached()

      expect(deviceStore.hasDeviceChangeListener()).toBe(false)
    })
  })

  describe('Utility Methods', () => {
    it('should find device by ID across all types', () => {
      deviceStore.setAudioInputDevices([
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1'),
      ])
      deviceStore.setVideoInputDevices([
        createMockDevice(MediaDeviceKind.VideoInput, 'cam-1', 'Camera 1'),
      ])

      const audioDevice = deviceStore.findDeviceById('mic-1')
      expect(audioDevice?.label).toBe('Microphone 1')

      const videoDevice = deviceStore.findDeviceById('cam-1')
      expect(videoDevice?.label).toBe('Camera 1')

      const notFound = deviceStore.findDeviceById('non-existent')
      expect(notFound).toBeUndefined()
    })

    it('should check if device is selected', () => {
      const devices = [createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1')]
      deviceStore.setAudioInputDevices(devices)

      expect(deviceStore.isDeviceSelected('mic-1')).toBe(true)
      expect(deviceStore.isDeviceSelected('mic-2')).toBe(false)
    })
  })

  describe('Store Reset', () => {
    it('should reset store to initial state', () => {
      deviceStore.setAudioInputDevices([
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1'),
      ])
      deviceStore.setAudioPermission(PermissionStatus.Granted)
      deviceStore.setDeviceChangeListenerAttached()

      deviceStore.reset()

      expect(deviceStore.totalDevices).toBe(0)
      expect(deviceStore.selectedAudioInputId).toBeNull()
      expect(deviceStore.audioPermission).toBe(PermissionStatus.NotRequested)
      expect(deviceStore.hasDeviceChangeListener()).toBe(false)
      expect(deviceStore.lastEnumerationTime).toBeNull()
    })
  })

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      deviceStore.setAudioInputDevices([
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1'),
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-2', 'Microphone 2'),
      ])
      deviceStore.setVideoInputDevices([
        createMockDevice(MediaDeviceKind.VideoInput, 'cam-1', 'Camera 1'),
      ])
      deviceStore.setAudioPermission(PermissionStatus.Granted)

      const stats = deviceStore.getStatistics()

      expect(stats.audioInputDevices).toBe(2)
      expect(stats.audioOutputDevices).toBe(0)
      expect(stats.videoInputDevices).toBe(1)
      expect(stats.totalDevices).toBe(3)
      expect(stats.hasAudioPermission).toBe(true)
      expect(stats.hasVideoPermission).toBe(false)
      expect(stats.selectedDevices.audioInput).toBe('mic-1') // Auto-selected
    })
  })

  describe('Computed Properties', () => {
    it('should compute total devices correctly', () => {
      expect(deviceStore.totalDevices).toBe(0)

      deviceStore.setAudioInputDevices([
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1'),
      ])
      expect(deviceStore.totalDevices).toBe(1)

      deviceStore.setVideoInputDevices([
        createMockDevice(MediaDeviceKind.VideoInput, 'cam-1', 'Camera 1'),
      ])
      expect(deviceStore.totalDevices).toBe(2)
    })

    it('should compute selected devices correctly', () => {
      const devices = [createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1')]
      deviceStore.setAudioInputDevices(devices)

      expect(deviceStore.selectedAudioInputDevice?.deviceId).toBe('mic-1')
      expect(deviceStore.selectedAudioOutputDevice).toBeUndefined()
      expect(deviceStore.selectedVideoInputDevice).toBeUndefined()
    })

    it('should compute permission states correctly', () => {
      expect(deviceStore.hasAudioPermission).toBe(false)
      expect(deviceStore.hasVideoPermission).toBe(false)

      deviceStore.setAudioPermission(PermissionStatus.Granted)
      expect(deviceStore.hasAudioPermission).toBe(true)

      deviceStore.denyVideoPermission()
      expect(deviceStore.isVideoPermissionDenied).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty device labels', () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'mic-1',
          kind: 'audioinput',
          label: '', // Empty label
          groupId: 'group-1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]

      deviceStore.updateDevices(mockDevices)

      const device = deviceStore.audioInputDevices[0]
      expect(device.label).toContain('audioinput') // Should generate label
      expect(device.label).toContain('mic-1')
    })

    it('should handle multiple default devices', () => {
      const devices = [
        createMockDevice(MediaDeviceKind.AudioInput, 'default', 'Default'),
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1'),
      ]

      deviceStore.setAudioInputDevices(devices)

      // Should select the default one
      expect(deviceStore.selectedAudioInputId).toBe('default')
    })

    it('should maintain selection when devices are updated', () => {
      const devices1 = [createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1')]
      deviceStore.setAudioInputDevices(devices1)
      deviceStore.selectAudioInput('mic-1')

      const devices2 = [
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-1', 'Microphone 1'),
        createMockDevice(MediaDeviceKind.AudioInput, 'mic-2', 'Microphone 2'),
      ]
      deviceStore.setAudioInputDevices(devices2)

      // Should NOT auto-select since there's already a selection
      expect(deviceStore.selectedAudioInputId).toBe('mic-1')
    })
  })
})
