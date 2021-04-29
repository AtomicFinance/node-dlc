/* eslint-disable @typescript-eslint/require-await */
import { IDlcStore } from './DlcStore';
import { DlcTransactionsV0 } from '../messages/DlcTransactions';

/**
 * In-memory implementation of the IDlcStore.
 */
export class ChainMemoryStore implements IDlcStore {
  private _dlcTxs = new Map<Buffer, DlcTransactionsV0>();

  public get dlcTransactionsListCount(): number {
    return this._dlcTxs.size;
  }

  public async findDlcTransactionsList(): Promise<DlcTransactionsV0[]> {
    return Array.from(this._dlcTxs.values());
  }

  public async findDlcTransactions(
    contractId: Buffer,
  ): Promise<DlcTransactionsV0> {
    return this._dlcTxs.get(contractId);
  }

  public async saveDlcTransactions(
    dlcTransactions: DlcTransactionsV0,
  ): Promise<void> {
    this._dlcTxs.set(dlcTransactions.contractId, dlcTransactions);
  }

  public async deleteDlcTransactions(contractId: Buffer): Promise<void> {
    this._dlcTxs.delete(contractId);
  }
}
