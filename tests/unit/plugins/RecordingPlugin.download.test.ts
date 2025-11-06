/**
 * RecordingPlugin Download Tests
 *
 * Tests for recording download functionality:
 * - Browser environment detection
 * - Download link generation
 * - Error handling for non-browser environments
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RecordingPlugin } from '../../../src/plugins/RecordingPlugin'

describe('RecordingPlugin - Download', () => {
  describe('Download in Non-Browser Environment', () => {
    let plugin: RecordingPlugin

    beforeEach(() => {
      plugin = new RecordingPlugin()

      // Add a recording
      ;(plugin as any).recordings.set('test-recording', {
        id: 'test-recording',
        callId: 'test-call',
        startTime: new Date(),
        mimeType: 'audio/webm',
        state: 'stopped',
        blob: new Blob(['test'], { type: 'audio/webm' }),
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should throw error when document is undefined', () => {
      vi.stubGlobal('document', undefined)

      expect(() => plugin.downloadRecording('test-recording')).toThrow(
        'Download is only supported in browser environments with DOM access'
      )
    })

    it('should throw error when document.body is null', () => {
      // Use vi.stubGlobal to create a document with null body
      vi.stubGlobal('document', {
        body: null,
        createElement: document.createElement.bind(document),
      })

      expect(() => plugin.downloadRecording('test-recording')).toThrow(
        'Download is only supported in browser environments with DOM access'
      )
    })

    it('should work normally in browser environment', () => {
      const clickSpy = vi.fn()
      const mockAnchor = {
        click: clickSpy,
        href: '',
        download: '',
      }

      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(mockAnchor as any)
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => mockAnchor as any)
      const removeChildSpy = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => mockAnchor as any)

      plugin.downloadRecording('test-recording', 'test.webm')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(clickSpy).toHaveBeenCalled()
      expect(mockAnchor.download).toBe('test.webm')

      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })
  })
})
