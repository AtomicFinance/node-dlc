import crypto from 'crypto';

import { AesKey } from './aes-key';

/**
 * Encrypts data using AES-256-CBC
 * @param key symmetric key (must be 32 bytes for AES-256)
 * @param buffer plaintext to encrypt
 * @returns encrypted buffer with IV prepended
 */
export function aesEncrypt({
  key,
  buffer,
}: {
  key: Buffer;
  buffer: Buffer;
}): Buffer {
  // Generate a random IV
  const iv = crypto.randomBytes(16);

  // Ensure key is 32 bytes for AES-256
  const keyHash = crypto.createHash('sha256').update(key).digest();

  const cipher = crypto.createCipheriv('aes-256-cbc', keyHash, iv);
  let encrypted = cipher.update(buffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Prepend IV to the encrypted data
  return Buffer.concat([iv, encrypted]);
}

/**
 * Decrypts data using AES-256-CBC.
 * @param key symmetric key
 * @param buffer ciphertext to decrypt (with IV prepended)
 */
export function aesDecrypt({
  key,
  buffer,
}: {
  key: Buffer;
  buffer: Buffer;
}): Buffer {
  // Extract IV from the beginning of the buffer
  const iv = buffer.slice(0, 16);
  const encrypted = buffer.slice(16);

  // Ensure key is 32 bytes for AES-256
  const keyHash = crypto.createHash('sha256').update(key).digest();

  const decipher = crypto.createDecipheriv('aes-256-cbc', keyHash, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted;
}

/**
 * Generate a a secure key from the passphrase and salt
 * by performing PBKDF2. If no salt is provided one is
 * generated via randomBytes.
 *
 * @param passphrase
 * @param [salt] 16-byte buffer or more
 */
export function createAesKey({
  passphrase,
  salt,
}: {
  passphrase: string;
  salt?: Buffer;
}): AesKey {
  if (!salt) {
    salt = crypto.randomBytes(16);
  }
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 128, 'sha512');
  return {
    key,
    salt,
  };
}
