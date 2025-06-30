import crypto from 'crypto';

export function hmac(key: Buffer, data: Buffer, algorithm = 'sha256'): Buffer {
  const h = crypto.createHmac(algorithm, key);
  h.update(data);
  return h.digest();
}
