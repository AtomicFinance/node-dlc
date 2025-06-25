import { OutPoint, Script } from '@node-dlc/bitcoin';
import { BatchDlcTxBuilder, DlcTxBuilder } from '@node-dlc/core';
import { sha256, xor } from '@node-dlc/crypto';
import {
  DisjointContractInfo,
  DlcAccept,
  DlcCancel,
  DlcClose,
  DlcOffer,
  DlcSign,
  DlcTransactions,
  FundingInput,
  SingleContractInfo,
} from '@node-dlc/messaging';

import { LeveldbBase } from './leveldb-base';

enum Prefix {
  DlcOffer = 50,
  DlcAccept = 51,
  DlcSign = 52,
  DlcTransactions = 53,
  Outpoint = 54,
  ScriptPubKey = 55,
  DlcCancel = 56,
  DlcClose = 57,
  TempContractId = 58,
}

export class LeveldbDlcStore extends LeveldbBase {
  public async findDlcOffers(): Promise<DlcOffer[]> {
    const results: DlcOffer[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcOffer) {
          results.push(DlcOffer.deserialize(value));
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
        if (key[0] === Prefix.DlcOffer) num++;
      }
    } finally {
      await iterator.close();
    }

    return num;
  }

  public async findDlcOffer(tempContractId: Buffer): Promise<DlcOffer> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcOffer]), tempContractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcOffer.deserialize(raw);
  }

  public async findDlcOffersByTempContractIds(
    tempContractIds: Buffer[],
  ): Promise<DlcOffer[]> {
    const dlcOffers = await Promise.all(
      tempContractIds.map((tempContractId) =>
        this.findDlcOffer(tempContractId),
      ),
    );
    return dlcOffers.filter((dlcOffer) => !!dlcOffer);
  }

  public async findDlcOffersByEventId(eventId: string): Promise<DlcOffer[]> {
    const results: DlcOffer[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcOffer) {
          const dlcOffer = DlcOffer.deserialize(value);
          if (dlcOffer.contractInfo.type === SingleContractInfo.type) {
            const oracleInfo = (dlcOffer.contractInfo as SingleContractInfo)
              .oracleInfo;
            // Handle both SingleOracleInfo and MultiOracleInfo
            if ('announcement' in oracleInfo) {
              // SingleOracleInfo
              const singleOracleInfo = oracleInfo as any;
              if (
                singleOracleInfo.announcement.oracleEvent.eventId === eventId
              ) {
                results.push(dlcOffer);
              }
            } else if ('announcements' in oracleInfo) {
              // MultiOracleInfo
              const multiOracleInfo = oracleInfo as any;
              if (
                multiOracleInfo.announcements.some(
                  (ann: any) => ann.oracleEvent.eventId === eventId,
                )
              ) {
                results.push(dlcOffer);
              }
            }
          } else if (dlcOffer.contractInfo.type === DisjointContractInfo.type) {
            (dlcOffer.contractInfo as DisjointContractInfo).contractOraclePairs.some(
              (pair) => {
                const oracleInfo = pair.oracleInfo;
                // Handle both SingleOracleInfo and MultiOracleInfo
                if ('announcement' in oracleInfo) {
                  // SingleOracleInfo
                  const singleOracleInfo = oracleInfo as any;
                  if (
                    singleOracleInfo.announcement.oracleEvent.eventId ===
                    eventId
                  ) {
                    results.push(dlcOffer);
                    return true;
                  }
                } else if ('announcements' in oracleInfo) {
                  // MultiOracleInfo
                  const multiOracleInfo = oracleInfo as any;
                  if (
                    multiOracleInfo.announcements.some(
                      (ann: any) => ann.oracleEvent.eventId === eventId,
                    )
                  ) {
                    results.push(dlcOffer);
                    return true;
                  }
                }
                return false;
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

  public async saveDlcOffer(dlcOffer: DlcOffer): Promise<void> {
    const value = dlcOffer.serialize();
    const tempContractId = sha256(value);
    const key = Buffer.concat([Buffer.from([Prefix.DlcOffer]), tempContractId]);
    await this._db.put(key, value);
  }

  public async deleteDlcOffer(tempContractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcOffer]), tempContractId]);
    await this._db.del(key);
  }

  public async findDlcAccepts(): Promise<DlcAccept[]> {
    const results: DlcAccept[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcAccept) {
          results.push(DlcAccept.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findFirstDlcAccept(): Promise<DlcAccept> {
    let result: DlcAccept;
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcAccept && !result) {
          result = DlcAccept.deserialize(value);
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
        if (key[0] === Prefix.DlcAccept) num++;
      }
    } finally {
      await iterator.close();
    }

    return num;
  }

  public async findDlcAccept(
    contractId: Buffer,
    parseCets = true,
  ): Promise<DlcAccept> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcAccept]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcAccept.deserialize(raw, parseCets);
  }

  public async findDlcAcceptByOutpoint(outpoint: OutPoint): Promise<DlcAccept> {
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
        return [contractId, dlcAccept.temporaryContractId] as [Buffer, Buffer];
      }),
    );

    return tempContractIdsMappings.filter(
      (tempContractIdsMapping) => !!tempContractIdsMapping,
    );
  }

  public async saveDlcAccept(dlcAccept: DlcAccept): Promise<void> {
    const dlcOffer = await this.findDlcOffer(dlcAccept.temporaryContractId);
    const txBuilder = new DlcTxBuilder(dlcOffer, dlcAccept.withoutSigs());
    const tx = txBuilder.buildFundingTransaction();
    const fundingTxid = tx.txId.serialize();
    const contractId = xor(fundingTxid, dlcAccept.temporaryContractId);
    const value = dlcAccept.serialize();
    const key = Buffer.concat([Buffer.from([Prefix.DlcAccept]), contractId]);
    await this._db.put(key, value);

    // store funding input outpoint reference
    for (let i = 0; i < dlcAccept.fundingInputs.length; i++) {
      const fundingInput = dlcAccept.fundingInputs[i] as FundingInput;

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
      dlcAccept.temporaryContractId,
    ]);
    await this._db.put(key3, contractId);
  }

  // NOTE: ONLY USE FOR BATCH FUNDED DLCs
  public async saveDlcAccepts(dlcAccepts: DlcAccept[]): Promise<void> {
    const dlcOffers: DlcOffer[] = [];
    for (let i = 0; i < dlcAccepts.length; i++) {
      const dlcOffer = await this.findDlcOffer(
        dlcAccepts[i].temporaryContractId,
      );
      dlcOffers.push(dlcOffer);
    }
    const txBuilder = new BatchDlcTxBuilder(dlcOffers, dlcAccepts);
    const tx = txBuilder.buildFundingTransaction();
    const fundingTxId = tx.txId.serialize();
    const contractIds = dlcAccepts.map((dlcAccept) =>
      xor(fundingTxId, dlcAccept.temporaryContractId),
    );
    for (let i = 0; i < dlcAccepts.length; i++) {
      const value = dlcAccepts[i].serialize();
      const key = Buffer.concat([
        Buffer.from([Prefix.DlcAccept]),
        contractIds[i],
      ]);
      await this._db.put(key, value);

      // store funding input outpoint reference
      for (let i = 0; i < dlcAccepts[i].fundingInputs.length; i++) {
        const fundingInput = dlcAccepts[i].fundingInputs[i] as FundingInput;

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
        dlcAccepts[i].temporaryContractId,
      ]);
      await this._db.put(key3, contractIds[i]);
    }
  }

  public async deleteDlcAccept(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcAccept]), contractId]);
    await this._db.del(key);
  }

  public async findDlcSigns(): Promise<DlcSign[]> {
    const results: DlcSign[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcSign) {
          results.push(DlcSign.deserialize(value));
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
        if (key[0] === Prefix.DlcSign) num++;
      }
    } finally {
      await iterator.close();
    }

    return num;
  }

  public async findDlcSign(contractId: Buffer): Promise<DlcSign> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcSign]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcSign.deserialize(raw);
  }

  public async saveDlcSign(dlcSign: DlcSign): Promise<void> {
    const value = dlcSign.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcSign]),
      dlcSign.contractId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteDlcSign(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcSign]), contractId]);
    await this._db.del(key);
  }

  public async findDlcCancels(): Promise<DlcCancel[]> {
    const results: DlcCancel[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcCancel) {
          results.push(DlcCancel.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findDlcCancel(contractId: Buffer): Promise<DlcCancel> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcCancel]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcCancel.deserialize(raw);
  }

  public async saveDlcCancel(dlcCancel: DlcCancel): Promise<void> {
    const value = dlcCancel.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcCancel]),
      dlcCancel.contractId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteDlcCancel(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcCancel]), contractId]);
    await this._db.del(key);
  }

  public async findDlcCloses(): Promise<DlcClose[]> {
    const results: DlcClose[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcClose) {
          results.push(DlcClose.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findDlcClose(contractId: Buffer): Promise<DlcClose> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcClose]), contractId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcClose.deserialize(raw);
  }

  public async saveDlcClose(dlcClose: DlcClose): Promise<void> {
    const value = dlcClose.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcClose]),
      dlcClose.contractId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteDlcClose(contractId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.DlcClose]), contractId]);
    await this._db.del(key);
  }

  public async findDlcTransactionsList(): Promise<DlcTransactions[]> {
    const results: DlcTransactions[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.DlcTransactions) {
          // Don't parse cets to avoid java heap out of memory
          const dlcTxs = DlcTransactions.deserialize(value, false);
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
        if (key[0] === Prefix.DlcTransactions) num++;
      }
    } finally {
      await iterator.close();
    }

    return num;
  }

  public async findDlcTransactions(
    contractId: Buffer,
  ): Promise<DlcTransactions> {
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcTransactions]),
      contractId,
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return DlcTransactions.deserialize(raw);
  }

  public async findDlcTransactionsByOutpoint(
    outpoint: OutPoint,
  ): Promise<DlcTransactions> {
    const key = Buffer.concat([
      Buffer.from([Prefix.Outpoint]),
      Buffer.from(outpoint.toString()),
    ]);
    const contractId = await this._safeGet<Buffer>(key);
    return this.findDlcTransactions(contractId);
  }

  public async findDlcTransactionsByScriptPubKey(
    scriptPubKey: Script,
  ): Promise<DlcTransactions> {
    const key = Buffer.concat([
      Buffer.from([Prefix.ScriptPubKey]),
      scriptPubKey.serialize(),
    ]);
    const contractId = await this._safeGet<Buffer>(key);
    return this.findDlcTransactions(contractId);
  }

  public async saveDlcTransactions(
    dlcTransactions: DlcTransactions,
  ): Promise<void> {
    const value = dlcTransactions.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.DlcTransactions]),
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
      Buffer.from([Prefix.DlcTransactions]),
      contractId,
    ]);
    await this._db.del(key);
  }
}
