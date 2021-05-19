import { sha256 } from '@node-lightning/crypto';
import { DlcTxBuilder } from '@node-dlc/core';
import {
  DlcAcceptV0,
  DlcOfferV0,
  DlcSignV0,
  DlcTransactionsV0,
} from '@node-dlc/messaging';
import { xor } from '@node-lightning/crypto';
import { RocksdbBase } from '@node-lightning/gossip-rocksdb';
import { OutPoint, Script } from '@node-lightning/bitcoin';

enum Prefix {
  DlcOfferV0 = 50,
  DlcAcceptV0 = 51,
  DlcSignV0 = 52,
  DlcTransactionsV0 = 53,
  Outpoint = 54,
  ScriptPubKey = 55,
}

export class RocksdbDlcStore extends RocksdbBase {
  public async findDlcOffers(): Promise<DlcOfferV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: DlcOfferV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.DlcOfferV0) {
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
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcOfferV0]),
      tempContractId,
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcOfferV0.deserialize(raw);
  }

  public async saveDlcOffer(dlcOffer: DlcOfferV0): Promise<void> {
    const value = dlcOffer.serialize();
    const tempContractId = sha256(value);
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcOfferV0]),
      tempContractId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteDlcOffer(tempContractId: Buffer): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcOfferV0]),
      tempContractId,
    ]);
    await this._db.del(key);
  }

  public async findDlcAccepts(): Promise<DlcAcceptV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: DlcAcceptV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.DlcAcceptV0) {
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
    const key = Buffer.concat([Buffer.from([Prefix.DlcAcceptV0]), contractId]);
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
    const key = Buffer.concat([Buffer.from([Prefix.DlcAcceptV0]), contractId]);
    await this._db.put(key, value);
  }

  public async deleteDlcAccept(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcAcceptV0]), contractId]);
    await this._db.del(key);
  }

  public async findDlcSigns(): Promise<DlcSignV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: DlcSignV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.DlcSignV0) {
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
    const key = Buffer.concat([Buffer.from([Prefix.DlcSignV0]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcSignV0.deserialize(raw);
  }

  public async saveDlcSign(dlcSign: DlcSignV0): Promise<void> {
    const value = dlcSign.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcSignV0]),
      dlcSign.contractId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteDlcSign(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcSignV0]), contractId]);
    await this._db.del(key);
  }

  public async findDlcTransactionsList(): Promise<DlcTransactionsV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: DlcTransactionsV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.DlcTransactionsV0) {
          results.push(DlcTransactionsV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findDlcTransactions(
    contractId: Buffer,
  ): Promise<DlcTransactionsV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcTransactionsV0]),
      contractId,
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcTransactionsV0.deserialize(raw);
  }

  public async findDlcTransactionsByOutpoint(
    outpoint: OutPoint,
  ): Promise<DlcTransactionsV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.Outpoint]),
      Buffer.from(outpoint.toString()),
    ]);
    const contractId = await this._safeGet<Buffer>(key);
    return this.findDlcTransactions(contractId);
  }

  public async findDlcTransactionsByScriptPubKey(
    scriptPubKey: Script,
  ): Promise<DlcTransactionsV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.ScriptPubKey]),
      scriptPubKey.serialize(),
    ]);
    const contractId = await this._safeGet<Buffer>(key);
    return this.findDlcTransactions(contractId);
  }

  public async saveDlcTransactions(
    dlcTransactions: DlcTransactionsV0,
  ): Promise<void> {
    const value = dlcTransactions.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcTransactionsV0]),
      dlcTransactions.contractId,
    ]);
    await this._db.put(key, value);

    // store outpoint reference
    const key2 = Buffer.concat([
      Buffer.from([Prefix.Outpoint]),
      Buffer.from(
        OutPoint.fromString(
          `${dlcTransactions.fundTx.txId.toString()}:${
            dlcTransactions.fundTxVout
          }`,
        ).toString(),
      ),
    ]);
    await this._db.put(key2, dlcTransactions.contractId);

    // store scriptpubkey reference
    const key3 = Buffer.concat([
      Buffer.from([Prefix.ScriptPubKey]),
      dlcTransactions.fundTx.outputs[
        dlcTransactions.fundTxVout
      ].scriptPubKey.serialize(),
    ]);
    await this._db.put(key3, dlcTransactions.contractId);
  }

  public async deleteDlcTransactions(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcTransactionsV0]),
      contractId,
    ]);
    await this._db.del(key);
  }
}
