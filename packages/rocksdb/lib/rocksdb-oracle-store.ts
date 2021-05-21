import { sha256 } from '@node-lightning/crypto';
import { OracleEventContainerV0 } from '@node-dlc/messaging';
import { RocksdbBase } from '@node-lightning/gossip-rocksdb';

enum Prefix {
  OracleEventContainerV0 = 80,
}

export class RocksdbOracleStore extends RocksdbBase {
  public async findOracleEventContainers(): Promise<OracleEventContainerV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: OracleEventContainerV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.OracleEventContainerV0) {
          results.push(OracleEventContainerV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findOracleEventContainer(
    announcementId: Buffer,
  ): Promise<OracleEventContainerV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleEventContainerV0]),
      announcementId,
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return OracleEventContainerV0.deserialize(raw);
  }

  public async saveOracleEventContainer(
    oracleEventContainer: OracleEventContainerV0,
  ): Promise<void> {
    const value = oracleEventContainer.serialize();
    const announcementId = sha256(
      oracleEventContainer.announcement.serialize(),
    );
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleEventContainerV0]),
      announcementId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteOracleEventContainer(
    announcementId: Buffer,
  ): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleEventContainerV0]),
      announcementId,
    ]);
    await this._db.del(key);
  }
}
