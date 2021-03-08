import { RocksdbBase } from "@node-lightning/gossip-rocksdb";
import { sha256 } from "@liquality/crypto"
import Cryptr from "cryptr"

enum Prefix {
  Wallet = 30,
}

export class RocksdbWalletStore extends RocksdbBase {
  public async checkSeed(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: Buffer[] = [];
      stream.on("data", data => {
        if (data.key[0] === Prefix.Wallet) {
          results.push(data.value);
        }
      });
      stream.on("end", () => {
        switch(results.length) {
          case 0: resolve(false)
          default: resolve(true)
        }
      });
      stream.on("error", err => reject(err));
    });
  }

  public async findSeed(apiKey: Buffer): Promise<string> {
    const key = Buffer.concat([Buffer.from([Prefix.Wallet]), Buffer.from(sha256(apiKey), 'hex')]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) throw new Error('Wallet has not been created or incorrect api key');
    const cryptr = new Cryptr(apiKey.toString('hex'))
    return cryptr.decrypt(raw.toString('hex'))
  }

  public async saveSeed(mnemonic: string, apiKey: Buffer): Promise<void> {
    const checkSeed = await this.checkSeed()
    if (checkSeed) throw new Error('Cannot have more than one wallet per daemon')
    const cryptr = new Cryptr(apiKey.toString('hex'))
    const encryptedMnemonic = cryptr.encrypt(mnemonic);
    const value = Buffer.from(encryptedMnemonic, 'hex')
    const key = Buffer.concat([
      Buffer.from([Prefix.Wallet]),
      Buffer.from(sha256(apiKey), 'hex')
    ])
    await this._db.put(key, value);
  }

  public async deleteSeed(apiKey: Buffer): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.Wallet]),
      Buffer.from(sha256(apiKey), 'hex')
    ]);
    await this._db.del(key);
  }
}
