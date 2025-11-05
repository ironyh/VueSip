/**
 * Encryption Utilities Tests
 */

import { describe, it, expect } from 'vitest'
import {
  encrypt,
  decrypt,
  isCryptoAvailable,
  generateEncryptionKey,
  hashPassword,
} from '../../src/utils/encryption'

describe('Encryption Utilities', () => {
  describe('isCryptoAvailable', () => {
    it('should return true when crypto is available', () => {
      expect(isCryptoAvailable()).toBe(true)
    })
  })

  describe('encrypt and decrypt', () => {
    const password = 'test-password-123'

    it('should encrypt and decrypt simple string', async () => {
      const data = 'Hello, World!'
      const encrypted = await encrypt(data, password)
      const decrypted = await decrypt<string>(encrypted, password)

      expect(decrypted).toBe(data)
    })

    it('should encrypt and decrypt object', async () => {
      const data = {
        username: 'testuser',
        password: 'secret123',
        settings: { theme: 'dark' },
      }

      const encrypted = await encrypt(data, password)
      const decrypted = await decrypt<typeof data>(encrypted, password)

      expect(decrypted).toEqual(data)
    })

    it('should encrypt and decrypt array', async () => {
      const data = [1, 2, 3, 'four', { five: 5 }]
      const encrypted = await encrypt(data, password)
      const decrypted = await decrypt<typeof data>(encrypted, password)

      expect(decrypted).toEqual(data)
    })

    it('should return encrypted data with required fields', async () => {
      const data = 'test data'
      const encrypted = await encrypt(data, password)

      expect(encrypted).toHaveProperty('data')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('salt')
      expect(encrypted).toHaveProperty('algorithm')
      expect(encrypted).toHaveProperty('version')

      expect(typeof encrypted.data).toBe('string')
      expect(typeof encrypted.iv).toBe('string')
      expect(typeof encrypted.salt).toBe('string')
      expect(encrypted.algorithm).toBe('AES-GCM')
      expect(encrypted.version).toBe(1)
    })

    it('should produce different ciphertexts for same data', async () => {
      const data = 'test data'
      const encrypted1 = await encrypt(data, password)
      const encrypted2 = await encrypt(data, password)

      // Different IVs should produce different ciphertexts
      expect(encrypted1.data).not.toBe(encrypted2.data)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
      expect(encrypted1.salt).not.toBe(encrypted2.salt)

      // But both should decrypt to same data
      const decrypted1 = await decrypt<string>(encrypted1, password)
      const decrypted2 = await decrypt<string>(encrypted2, password)
      expect(decrypted1).toBe(data)
      expect(decrypted2).toBe(data)
    })

    it('should fail decryption with wrong password', async () => {
      const data = 'secret data'
      const encrypted = await encrypt(data, password)

      await expect(decrypt(encrypted, 'wrong-password')).rejects.toThrow()
    })

    it('should handle empty string', async () => {
      const data = ''
      const encrypted = await encrypt(data, password)
      const decrypted = await decrypt<string>(encrypted, password)

      expect(decrypted).toBe(data)
    })

    it('should handle null', async () => {
      const data = null
      const encrypted = await encrypt(data, password)
      const decrypted = await decrypt(encrypted, password)

      expect(decrypted).toBe(data)
    })

    it('should handle boolean values', async () => {
      const dataTrue = true
      const dataFalse = false

      const encryptedTrue = await encrypt(dataTrue, password)
      const encryptedFalse = await encrypt(dataFalse, password)

      const decryptedTrue = await decrypt<boolean>(encryptedTrue, password)
      const decryptedFalse = await decrypt<boolean>(encryptedFalse, password)

      expect(decryptedTrue).toBe(true)
      expect(decryptedFalse).toBe(false)
    })

    it('should respect custom iterations', async () => {
      const data = 'test data'
      const encrypted = await encrypt(data, password, { enabled: true, iterations: 50000 })
      const decrypted = await decrypt<string>(encrypted, password)

      expect(decrypted).toBe(data)
    })

    it('should handle large data', async () => {
      const data = { items: Array(1000).fill({ id: 1, name: 'test', data: 'value' }) }
      const encrypted = await encrypt(data, password)
      const decrypted = await decrypt<typeof data>(encrypted, password)

      expect(decrypted).toEqual(data)
    })

    it('should handle special characters', async () => {
      const data = 'Hello 你好 مرحبا 🎉 \n\t\r'
      const encrypted = await encrypt(data, password)
      const decrypted = await decrypt<string>(encrypted, password)

      expect(decrypted).toBe(data)
    })
  })

  describe('generateEncryptionKey', () => {
    it('should generate random key', () => {
      const key = generateEncryptionKey()
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
    })

    it('should generate different keys each time', () => {
      const key1 = generateEncryptionKey()
      const key2 = generateEncryptionKey()
      expect(key1).not.toBe(key2)
    })

    it('should generate key of specified length', () => {
      const key = generateEncryptionKey(64)
      // Base64 encoding increases size by ~33%
      expect(key.length).toBeGreaterThan(64)
    })

    it('should use generated key for encryption', async () => {
      const key = generateEncryptionKey()
      const data = 'test data'

      const encrypted = await encrypt(data, key)
      const decrypted = await decrypt<string>(encrypted, key)

      expect(decrypted).toBe(data)
    })
  })

  describe('hashPassword', () => {
    it('should hash password', async () => {
      const password = 'mypassword123'
      const hash = await hashPassword(password)

      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64) // SHA-256 produces 64 hex characters
    })

    it('should produce consistent hashes', async () => {
      const password = 'mypassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different passwords', async () => {
      const hash1 = await hashPassword('password1')
      const hash2 = await hashPassword('password2')

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty string', async () => {
      const hash = await hashPassword('')
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64)
    })

    it('should handle special characters', async () => {
      const hash = await hashPassword('пароль密码🔐')
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64)
    })
  })

  describe('error handling', () => {
    it('should throw error when decrypting invalid data', async () => {
      const invalidData = {
        data: 'invalid',
        iv: 'invalid',
        salt: 'invalid',
        algorithm: 'AES-GCM',
        version: 1,
      }

      await expect(decrypt(invalidData, 'password')).rejects.toThrow()
    })

    it('should throw error when decrypting with missing fields', async () => {
      const invalidData = {
        data: 'test',
        // missing iv, salt, algorithm, version, iterations
      } as unknown as import('../../src/types/storage.types').EncryptedData

      await expect(decrypt(invalidData, 'password')).rejects.toThrow()
    })
  })
})
