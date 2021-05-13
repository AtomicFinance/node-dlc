import { sha256 } from '@node-lightning/crypto';
import secp256k1 from 'secp256k1';
export const TOKEN_EXPIRY = 1000 * 60;
export const EXPECTED_PREFIX = `dlc/v0/irc/token/`;

export const verifyBase64Signature = (
  signature: Buffer,
  message: Buffer,
  pubkey: Buffer,
): boolean => {
  console.log('signature', signature.length);
  return secp256k1.ecdsaVerify(signature, message, pubkey);
};

export const verifyToken = (
  token: Buffer,
  timestamp: number,
  pubkey: Buffer,
): void => {
  const expected = sha256(Buffer.from(`${EXPECTED_PREFIX}/${timestamp}`));
  const currentTime = Math.floor(new Date().getTime() / 1000);

  const validTime =
    currentTime - TOKEN_EXPIRY < timestamp &&
    currentTime + TOKEN_EXPIRY > timestamp;

  if (!validTime) throw new Error('Invalid timestamp');
  if (!verifyBase64Signature(token, expected, pubkey))
    throw new Error('Invalid signature');
};
