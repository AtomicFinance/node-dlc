import { IrcMessageV0 } from '@node-dlc/messaging';
import { sha256 } from '@node-lightning/crypto';
import secp256k1 from 'secp256k1';
export const TOKEN_EXPIRY = 1000 * 60;
export const EXPECTED_PREFIX = `dlc/v0/irc/token`;

export const verifyBase64Signature = (
  signature: Buffer,
  message: Buffer,
  pubkey: Buffer,
): boolean => {
  return secp256k1.ecdsaVerify(signature, message, pubkey);
};

export const verifySignature = (ircMessage: IrcMessageV0): void => {
  const message = sha256(ircMessage.serializeWithoutSig());
  const currentTime = Math.floor(new Date().getTime() / 1000);

  const validTime =
    currentTime - TOKEN_EXPIRY < ircMessage.timestamp &&
    currentTime + TOKEN_EXPIRY > ircMessage.timestamp;

  if (!validTime) throw new Error('Invalid timestamp');
  if (!verifyBase64Signature(ircMessage.signature, message, ircMessage.pubkey))
    throw new Error('Invalid signature');
};
