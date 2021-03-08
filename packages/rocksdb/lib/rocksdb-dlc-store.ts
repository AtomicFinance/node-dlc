import { RocksdbBase } from "@node-lightning/gossip-rocksdb";
import { OfferDlcV0 } from "@node-dlc/messaging"
import { sha256 } from "@liquality/crypto"

enum Prefix {
    OfferV0 = 40,
    AcceptV0 = 41,
    SignV0 = 42
}

export class RocksdbDlcStore extends RocksdbBase {
  public async findDlcOffers(): Promise<OfferDlcV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: OfferDlcV0[] = [];
      stream.on("data", data => {
        if (data.key[0] === Prefix.OfferV0) {
          results.push(OfferDlcV0.deserialize(data.value));
        }
      });
      stream.on("end", () => {
        resolve(results);
      });
      stream.on("error", err => reject(err));
    });
  }

  public async findDlcOffer(tempContractId: Buffer): Promise<OfferDlcV0> {
    const key = Buffer.concat([Buffer.from([Prefix.OfferV0]), tempContractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return OfferDlcV0.deserialize(raw);
  }

  public async saveDlcOffer(dlcOffer: OfferDlcV0): Promise<void> {
    const value = dlcOffer.serialize()
    const tempContractId = Buffer.from(sha256(value), 'hex')
    const key = Buffer.concat([
      Buffer.from([Prefix.OfferV0]),
      tempContractId
    ])
    await this._db.put(key, value);
  }

  public async deleteDlcOffer(tempContractId: Buffer): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OfferV0]),
      tempContractId
    ]);
    await this._db.del(key);
  }
}
