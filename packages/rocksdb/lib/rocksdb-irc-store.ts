import { DlcIdsV0 } from '@node-dlc/messaging';

import { RocksdbBase } from './rocksdb-base';

enum Prefix {
  TempContractIds = 60,
  ContractIds = 61,
}

export class RocksdbIrcStore extends RocksdbBase {
  public async findTempContractIdsByNick(nick: string): Promise<DlcIdsV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.TempContractIds]),
      Buffer.from(nick),
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcIdsV0.deserialize(raw);
  }

  public async saveTempContractIdByNick(
    tempContractId: Buffer,
    nick: string,
  ): Promise<void> {
    let dlcIds = await this.findTempContractIdsByNick(nick);

    if (!dlcIds) dlcIds = new DlcIdsV0();
    dlcIds.ids.push(tempContractId);

    const value = dlcIds.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.TempContractIds]),
      Buffer.from(nick),
    ]);
    await this._db.put(key, value);
  }

  public async deleteTempContractIdsByNick(nick: string): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.TempContractIds]),
      Buffer.from(nick),
    ]);
    await this._db.del(key);
  }

  public async findContractIdsByNick(nick: string): Promise<DlcIdsV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.ContractIds]),
      Buffer.from(nick),
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcIdsV0.deserialize(raw);
  }

  public async saveContractIdByNick(
    contractId: Buffer,
    nick: string,
  ): Promise<void> {
    let dlcIds = await this.findContractIdsByNick(nick);

    if (!dlcIds) dlcIds = new DlcIdsV0();
    dlcIds.ids.push(contractId);

    const value = dlcIds.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.ContractIds]),
      Buffer.from(nick),
    ]);
    await this._db.put(key, value);
  }

  public async deleteContractIdsByNick(nick: string): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.ContractIds]),
      Buffer.from(nick),
    ]);
    await this._db.del(key);
  }
}
