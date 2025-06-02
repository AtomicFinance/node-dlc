import { OutPoint, Script } from '@node-dlc/bitcoin';
import { BatchDlcTxBuilder, DlcTxBuilder } from '@node-dlc/core';
import { sha256, xor } from '@node-dlc/crypto';
import {
  ContractInfoV0,
  ContractInfoV1,
  DlcAcceptV0,
  DlcCancelV0,
  DlcCloseV0,
  DlcOfferV0,
  DlcSignV0,
  DlcTransactionsV0,
  FundingInputV0,
} from '@node-dlc/messaging';

import { RocksdbBase } from './rocksdb-base';

enum Prefix {
  DlcOfferV0 = 50,
  DlcAcceptV0 = 51,
  DlcSignV0 = 52,
  DlcTransactionsV0 = 53,
  Outpoint = 54,
  ScriptPubKey = 55,
  DlcCancelV0 = 56,
  DlcCloseV0 = 57,
  TempContractId = 58,
}

export class RocksdbDlcStore extends RocksdbBase {
  public async findDlcOffers(): Promise<DlcOfferV0[]> {
    const results: DlcOfferV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcOfferV0) {
          results.push(DlcOfferV0.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findNumDlcOffers(): Promise<number> {
    let num = 0;
    const iterator = this._db.iterator();

    try {
      for await (const [key] of iterator) {
        if (key[0] === Prefix.DlcOfferV0) num++;
      }
    } finally {
      await iterator.close();
    }

    return num;
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

  public async findDlcOffersByTempContractIds(
    tempContractIds: Buffer[],
  ): Promise<DlcOfferV0[]> {
    const dlcOffers = await Promise.all(
      tempContractIds.map((tempContractId) =>
        this.findDlcOffer(tempContractId),
      ),
    );
    return dlcOffers.filter((dlcOffer) => !!dlcOffer);
  }

  public async findDlcOffersByEventId(eventId: string): Promise<DlcOfferV0[]> {
    const results: DlcOfferV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcOfferV0) {
          const dlcOffer = DlcOfferV0.deserialize(value);
          if (dlcOffer.contractInfo.type === ContractInfoV0.type) {
            if (
              (dlcOffer.contractInfo as ContractInfoV0).oracleInfo.announcement
                .oracleEvent.eventId === eventId
            ) {
              results.push(dlcOffer);
            }
          } else if (dlcOffer.contractInfo.type === ContractInfoV1.type) {
            (dlcOffer.contractInfo as ContractInfoV1).contractOraclePairs.some(
              (pair) => {
                if (
                  pair.oracleInfo.announcement.oracleEvent.eventId === eventId
                ) {
                  results.push(dlcOffer);
                  return true; // Returning true will stop the iteration since we've found a match
                }
                return false; // Returning false will continue the iteration to check other pairs
              },
            );
          }
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
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
    const results: DlcAcceptV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcAcceptV0) {
          results.push(DlcAcceptV0.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findFirstDlcAccept(): Promise<DlcAcceptV0> {
    let result: DlcAcceptV0;
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcAcceptV0 && !result) {
          result = DlcAcceptV0.deserialize(value);
          break;
        }
      }
    } finally {
      await iterator.close();
    }

    return result;
  }

  public async findNumDlcAccepts(): Promise<number> {
    let num = 0;
    const iterator = this._db.iterator();

    try {
      for await (const [key] of iterator) {
        if (key[0] === Prefix.DlcAcceptV0) num++;
      }
    } finally {
      await iterator.close();
    }

    return num;
  }

  public async findDlcAccept(
    contractId: Buffer,
    parseCets = true,
  ): Promise<DlcAcceptV0> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcAcceptV0]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcAcceptV0.deserialize(raw, parseCets);
  }

  public async findDlcAcceptByOutpoint(
    outpoint: OutPoint,
  ): Promise<DlcAcceptV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.Outpoint]),
      Buffer.from(outpoint.toString()),
    ]);
    const contractId = await this._safeGet<Buffer>(key);
    return this.findDlcAccept(contractId);
  }

  public async findContractIdFromTemp(tempContractId: Buffer): Promise<Buffer> {
    const key = Buffer.concat([
      Buffer.from([Prefix.TempContractId]),
      tempContractId,
    ]);
    const contractId = await this._safeGet<Buffer>(key);
    return contractId;
  }

  public async findTempContractIds(
    contractIds: Buffer[],
  ): Promise<[Buffer, Buffer][]> {
    const tempContractIdsMappings = await Promise.all(
      contractIds.map(async (contractId) => {
        const dlcAccept = await this.findDlcAccept(contractId, false);
        if (!dlcAccept) return;
        return [contractId, dlcAccept.tempContractId] as [Buffer, Buffer];
      }),
    );

    return tempContractIdsMappings.filter(
      (tempContractIdsMapping) => !!tempContractIdsMapping,
    );
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

    // store funding input outpoint reference
    for (let i = 0; i < dlcAccept.fundingInputs.length; i++) {
      const fundingInput = dlcAccept.fundingInputs[i] as FundingInputV0;

      const outpoint = OutPoint.fromString(
        `${fundingInput.prevTx.txId.toString()}:${fundingInput.prevTxVout}`,
      );

      const key2 = Buffer.concat([
        Buffer.from([Prefix.Outpoint]),
        Buffer.from(outpoint.toString()),
      ]);
      await this._db.put(key2, contractId);
    }

    const key3 = Buffer.concat([
      Buffer.from([Prefix.TempContractId]),
      dlcAccept.tempContractId,
    ]);
    await this._db.put(key3, contractId);
  }

  // NOTE: ONLY USE FOR BATCH FUNDED DLCs
  public async saveDlcAccepts(dlcAccepts: DlcAcceptV0[]): Promise<void> {
    const dlcOffers: DlcOfferV0[] = [];
    for (let i = 0; i < dlcAccepts.length; i++) {
      const dlcOffer = await this.findDlcOffer(dlcAccepts[i].tempContractId);
      dlcOffers.push(dlcOffer);
    }
    const txBuilder = new BatchDlcTxBuilder(dlcOffers, dlcAccepts);
    const tx = txBuilder.buildFundingTransaction();
    const fundingTxId = tx.txId.serialize();
    const contractIds = dlcAccepts.map((dlcAccepts) =>
      xor(fundingTxId, dlcAccepts.tempContractId),
    );
    for (let i = 0; i < dlcAccepts.length; i++) {
      const value = dlcAccepts[i].serialize();
      const key = Buffer.concat([
        Buffer.from([Prefix.DlcAcceptV0]),
        contractIds[i],
      ]);
      await this._db.put(key, value);

      // store funding input outpoint reference
      for (let i = 0; i < dlcAccepts[i].fundingInputs.length; i++) {
        const fundingInput = dlcAccepts[i].fundingInputs[i] as FundingInputV0;

        const outpoint = OutPoint.fromString(
          `${fundingInput.prevTx.txId.toString()}:${fundingInput.prevTxVout}`,
        );

        const key2 = Buffer.concat([
          Buffer.from([Prefix.Outpoint]),
          Buffer.from(outpoint.toString()),
        ]);
        await this._db.put(key2, contractIds[i]);
      }

      const key3 = Buffer.concat([
        Buffer.from([Prefix.TempContractId]),
        dlcAccepts[i].tempContractId,
      ]);
      await this._db.put(key3, contractIds[i]);
    }
  }

  public async deleteDlcAccept(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcAcceptV0]), contractId]);
    await this._db.del(key);
  }

  public async findDlcSigns(): Promise<DlcSignV0[]> {
    const results: DlcSignV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcSignV0) {
          results.push(DlcSignV0.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findNumDlcSigns(): Promise<number> {
    let num = 0;
    const iterator = this._db.iterator();

    try {
      for await (const [key] of iterator) {
        if (key[0] === Prefix.DlcSignV0) num++;
      }
    } finally {
      await iterator.close();
    }

    return num;
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

  public async findDlcCancels(): Promise<DlcCancelV0[]> {
    const results: DlcCancelV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcCancelV0) {
          results.push(DlcCancelV0.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findDlcCancel(contractId: Buffer): Promise<DlcCancelV0> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcCancelV0]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcCancelV0.deserialize(raw);
  }

  public async saveDlcCancel(dlcCancel: DlcCancelV0): Promise<void> {
    const value = dlcCancel.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcCancelV0]),
      dlcCancel.contractId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteDlcCancel(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcCancelV0]), contractId]);
    await this._db.del(key);
  }

  public async findDlcCloses(): Promise<DlcCloseV0[]> {
    const results: DlcCloseV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcCloseV0) {
          results.push(DlcCloseV0.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findDlcClose(contractId: Buffer): Promise<DlcCloseV0> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcCloseV0]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcCloseV0.deserialize(raw);
  }

  public async saveDlcClose(dlcClose: DlcCloseV0): Promise<void> {
    const value = dlcClose.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcCloseV0]),
      dlcClose.contractId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteDlcClose(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcCloseV0]), contractId]);
    await this._db.del(key);
  }

  public async findDlcTransactionsList(): Promise<DlcTransactionsV0[]> {
    const results: DlcTransactionsV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcTransactionsV0) {
          // Don't parse cets to avoid java heap out of memory
          const dlcTxs = DlcTransactionsV0.deserialize(value, false);
          results.push(dlcTxs);
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findNumDlcTransactionsList(): Promise<number> {
    let num = 0;
    const iterator = this._db.iterator();

    try {
      for await (const [key] of iterator) {
        if (key[0] === Prefix.DlcTransactionsV0) num++;
      }
    } finally {
      await iterator.close();
    }

    return num;
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
