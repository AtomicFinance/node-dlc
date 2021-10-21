import { DlcInfoV0 } from '@node-dlc/messaging';
import { RocksdbBase } from '@node-lightning/gossip-rocksdb';

enum Prefix {
  DlcInfoV0 = 90,
}

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
}
