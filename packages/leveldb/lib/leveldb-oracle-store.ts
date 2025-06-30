import { sha256 } from '@node-dlc/crypto';
import {
  DlcIdsV0,
  OracleEventContainer,
  OracleIdentifier,
} from '@node-dlc/messaging';

import { LeveldbBase } from './leveldb-base';

enum Prefix {
  OracleEventContainer = 80,
  OracleNoncesV0 = 81,
  OracleIdentifier = 82,
}

export class LeveldbOracleStore extends LeveldbBase {
  public async findOracleEventContainers(): Promise<OracleEventContainer[]> {
    const results: OracleEventContainer[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.OracleEventContainer) {
          results.push(OracleEventContainer.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findOracleEventContainer(
    announcementId: Buffer,
  ): Promise<OracleEventContainer> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleEventContainer]),
      announcementId,
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return OracleEventContainer.deserialize(raw);
  }

  public async saveOracleEventContainer(
    oracleEventContainer: OracleEventContainer,
  ): Promise<void> {
    const value = oracleEventContainer.serialize();
    const announcementId = sha256(
      oracleEventContainer.announcement.serialize(),
    );
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleEventContainer]),
      announcementId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteOracleEventContainer(
    announcementId: Buffer,
  ): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleEventContainer]),
      announcementId,
    ]);
    await this._db.del(key);
  }

  public async findNonces(announcementId: Buffer): Promise<DlcIdsV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleNoncesV0]),
      announcementId,
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcIdsV0.deserialize(raw);
  }

  public async saveNonces(
    nonces: DlcIdsV0,
    announcementId: Buffer,
  ): Promise<void> {
    const value = nonces.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleNoncesV0]),
      announcementId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteNonces(announcementId: Buffer): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleNoncesV0]),
      announcementId,
    ]);
    await this._db.del(key);
  }

  public async findOracleIdentifiers(): Promise<OracleIdentifier[]> {
    const results: OracleIdentifier[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.OracleIdentifier) {
          results.push(OracleIdentifier.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findOracleIdentifier(
    oraclePubkey: Buffer,
  ): Promise<OracleIdentifier> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleIdentifier]),
      oraclePubkey,
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return OracleIdentifier.deserialize(raw);
  }

  public async saveOracleIdentifier(
    oracleIdentifier: OracleIdentifier,
  ): Promise<void> {
    const value = oracleIdentifier.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleIdentifier]),
      oracleIdentifier.oraclePubkey,
    ]);
    await this._db.put(key, value);
  }

  public async deleteOracleIdentifier(oraclePubkey: Buffer): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OracleIdentifier]),
      oraclePubkey,
    ]);
    await this._db.del(key);
  }
}
