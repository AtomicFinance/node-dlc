import { DlcInfoV0 } from '@node-dlc/messaging';
import { RocksdbBase } from '@node-lightning/gossip-rocksdb';

enum Prefix {
  DlcInfoV0 = 90,
}

export type InfoValue =
  | 'offer'
  | 'accept'
  | 'sign'
  | 'cancel'
  | 'close'
  | 'transactions';

export class RocksdbInfoStore extends RocksdbBase {
  public async findDlcInfo(): Promise<DlcInfoV0> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcInfoV0])]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcInfoV0.deserialize(raw);
  }

  public async saveDlcInfo(dlcInfo: DlcInfoV0): Promise<void> {
    const value = dlcInfo.serialize();
    const key = Buffer.concat([Buffer.from([Prefix.DlcInfoV0])]);
    await this._db.put(key, value);
  }

  public async deleteDlcInfo(): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcInfoV0])]);
    await this._db.del(key);
  }

  public async incrementDlcInfoValues(values: InfoValue[]): Promise<void> {
    const dlcInfo = await this.findDlcInfo();
    for (const value of values) {
      switch (value) {
        case 'offer':
          dlcInfo.numDlcOffers += 1;
          break;
        case 'accept':
          dlcInfo.numDlcAccepts += 1;
          break;
        case 'sign':
          dlcInfo.numDlcSigns += 1;
          break;
        case 'cancel':
          dlcInfo.numDlcCancels += 1;
          break;
        case 'close':
          dlcInfo.numDlcCloses += 1;
          break;
        case 'transactions':
          dlcInfo.numDlcTransactions += 1;
          break;
      }
    }
    await this.saveDlcInfo(dlcInfo);
  }
}
