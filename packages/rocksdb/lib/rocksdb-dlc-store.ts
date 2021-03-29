import { sha256 } from '@node-lightning/crypto';
import { DlcTxBuilder } from '@node-dlc/core';
import { DlcAcceptV0, DlcOfferV0, DlcSignV0 } from '@node-dlc/messaging';
import { xor } from '@node-lightning/crypto';
import { RocksdbBase } from '@node-lightning/gossip-rocksdb';

enum Prefix {
  OfferV0 = 40,
  AcceptV0 = 41,
  SignV0 = 42,
}

export class RocksdbDlcStore extends RocksdbBase {
  public async findDlcOffers(): Promise<DlcOfferV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: DlcOfferV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.OfferV0) {
          results.push(DlcOfferV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findDlcOffer(tempContractId: Buffer): Promise<DlcOfferV0> {
    const key = Buffer.concat([Buffer.from([Prefix.OfferV0]), tempContractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcOfferV0.deserialize(raw);
  }

  public async saveDlcOffer(dlcOffer: DlcOfferV0): Promise<void> {
    const value = dlcOffer.serialize();
    const tempContractId = sha256(value);
    const key = Buffer.concat([Buffer.from([Prefix.OfferV0]), tempContractId]);
    await this._db.put(key, value);
  }

  public async deleteDlcOffer(tempContractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.OfferV0]), tempContractId]);
    await this._db.del(key);
  }

  public async findDlcAccepts(): Promise<DlcAcceptV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: DlcAcceptV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.AcceptV0) {
          results.push(DlcAcceptV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findDlcAccept(contractId: Buffer): Promise<DlcAcceptV0> {
    const key = Buffer.concat([Buffer.from([Prefix.AcceptV0]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcAcceptV0.deserialize(raw);
  }

  public async saveDlcAccept(dlcAccept: DlcAcceptV0): Promise<void> {
    const dlcOffer = await this.findDlcOffer(dlcAccept.tempContractId);
    const txBuilder = new DlcTxBuilder(dlcOffer, dlcAccept.withoutSigs());
    const tx = txBuilder.buildFundingTransaction();
    const fundingTxid = tx.txId.serialize();
    const contractId = xor(fundingTxid, dlcAccept.tempContractId);
    const value = dlcAccept.serialize();
    const key = Buffer.concat([Buffer.from([Prefix.AcceptV0]), contractId]);
    await this._db.put(key, value);
  }

  public async deleteDlcAccept(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.AcceptV0]), contractId]);
    await this._db.del(key);
  }

  public async findDlcSigns(): Promise<DlcSignV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: DlcSignV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.AcceptV0) {
          results.push(DlcSignV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findDlcSign(contractId: Buffer): Promise<DlcSignV0> {
    const key = Buffer.concat([Buffer.from([Prefix.SignV0]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcSignV0.deserialize(raw);
  }

  public async saveDlcSign(dlcSign: DlcSignV0): Promise<void> {
    const value = dlcSign.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.SignV0]),
      dlcSign.contractId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteDlcSign(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.SignV0]), contractId]);
    await this._db.del(key);
  }
}
