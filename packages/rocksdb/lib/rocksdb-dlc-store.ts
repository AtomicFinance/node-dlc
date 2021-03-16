import { sha256 } from '@liquality/crypto';
import { DlcTxBuilder } from '@node-dlc/core';
import { AcceptDlcV0, OfferDlcV0, SignDlcV0 } from '@node-dlc/messaging';
import { xor } from '@node-lightning/crypto';
import { RocksdbBase } from '@node-lightning/gossip-rocksdb';

enum Prefix {
  OfferV0 = 40,
  AcceptV0 = 41,
  SignV0 = 42,
}

export class RocksdbDlcStore extends RocksdbBase {
  public async findDlcOffers(): Promise<OfferDlcV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: OfferDlcV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.OfferV0) {
          results.push(OfferDlcV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findDlcOffer(tempContractId: Buffer): Promise<OfferDlcV0> {
    const key = Buffer.concat([Buffer.from([Prefix.OfferV0]), tempContractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return OfferDlcV0.deserialize(raw);
  }

  public async saveDlcOffer(dlcOffer: OfferDlcV0): Promise<void> {
    const value = dlcOffer.serialize();
    const tempContractId = Buffer.from(sha256(value), 'hex');
    const key = Buffer.concat([Buffer.from([Prefix.OfferV0]), tempContractId]);
    await this._db.put(key, value);
  }

  public async deleteDlcOffer(tempContractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.OfferV0]), tempContractId]);
    await this._db.del(key);
  }

  public async findDlcAccepts(): Promise<AcceptDlcV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: AcceptDlcV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.AcceptV0) {
          results.push(AcceptDlcV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findDlcAccept(contractId: Buffer): Promise<AcceptDlcV0> {
    const key = Buffer.concat([Buffer.from([Prefix.AcceptV0]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return AcceptDlcV0.deserialize(raw);
  }

  public async saveDlcAccept(dlcAccept: AcceptDlcV0): Promise<void> {
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

  public async findDlcSigns(): Promise<SignDlcV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: SignDlcV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.AcceptV0) {
          results.push(SignDlcV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findDlcSign(contractId: Buffer): Promise<SignDlcV0> {
    const key = Buffer.concat([Buffer.from([Prefix.SignV0]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return SignDlcV0.deserialize(raw);
  }

  public async saveDlcSign(dlcSign: SignDlcV0): Promise<void> {
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
