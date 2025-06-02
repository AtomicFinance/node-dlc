import { sha256 } from '@node-dlc/crypto';
import { AddressCache } from '@node-dlc/messaging';
import Cryptr from 'cryptr';

import { LeveldbBase } from './leveldb-base';

enum Prefix {
  Wallet = 30,
  ApiKey = 31,
  AddressCache = 32,
}

export class LeveldbWalletStore extends LeveldbBase {
  public async checkSeed(): Promise<boolean> {
    const iterator = this._db.iterator();
    const results: Buffer[] = [];

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.Wallet) {
          results.push(value);
        }
      }
    } finally {
      await iterator.close();
    }

    switch (results.length) {
      case 0:
        return false;
      default:
        return true;
    }
  }

  public async findSeed(apiKey: Buffer): Promise<string> {
    const key = Buffer.concat([Buffer.from([Prefix.Wallet]), sha256(apiKey)]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw)
      throw new Error('Wallet has not been created or incorrect api key');
    const cryptr = new Cryptr(apiKey.toString('hex'));
    return cryptr.decrypt(raw.toString('hex'));
  }

  public async saveSeed(mnemonic: string, apiKey: Buffer): Promise<void> {
    const checkSeed = await this.checkSeed();
    if (checkSeed)
      throw new Error('Cannot have more than one wallet per daemon');
    const cryptr = new Cryptr(apiKey.toString('hex'));
    const encryptedMnemonic = cryptr.encrypt(mnemonic);
    const value = Buffer.from(encryptedMnemonic, 'hex');
    const key = Buffer.concat([Buffer.from([Prefix.Wallet]), sha256(apiKey)]);
    await this._db.put(key, value);
    await this.saveApiKeyHash(apiKey);
  }

  public async deleteSeed(apiKey: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.Wallet]), sha256(apiKey)]);
    await this._db.del(key);
  }

  public async findApiKeyHash(): Promise<Buffer> {
    const key = Buffer.from([Prefix.ApiKey]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return raw;
  }

  public async saveApiKeyHash(apiKey: Buffer): Promise<void> {
    const value = sha256(apiKey);
    const key = Buffer.from([Prefix.ApiKey]);
    await this._db.put(key, value);
  }

  public async deleteApiKeyHash(): Promise<void> {
    const key = Buffer.from([Prefix.ApiKey]);
    await this._db.del(key);
  }

  public async findAddressCache(): Promise<AddressCache> {
    const key = Buffer.from([Prefix.AddressCache]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return AddressCache.deserialize(raw);
  }

  public async saveAddressCache(addressCache: AddressCache): Promise<void> {
    const value = addressCache.serialize();
    const key = Buffer.from([Prefix.AddressCache]);
    await this._db.put(key, value);
  }
}
