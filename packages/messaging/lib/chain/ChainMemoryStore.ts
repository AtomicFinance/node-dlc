/* eslint-disable @typescript-eslint/require-await */
import { DlcTransactions } from '../messages/DlcTransactions';
import { IDlcStore } from './DlcStore';

/**
 * In-memory implementation of the IDlcStore.
 */
export class ChainMemoryStore implements IDlcStore {
  private _dlcTxs = new Map<Buffer, DlcTransactions>();

  public get dlcTransactionsListCount(): number {
    return this._dlcTxs.size;
  }

  public async findDlcTransactionsList(): Promise<DlcTransactions[]> {
    return Array.from(this._dlcTxs.values());
  }

  public async findDlcTransactions(
    contractId: Buffer,
  ): Promise<DlcTransactions> {
    return this._dlcTxs.get(contractId);
  }

  public async saveDlcTransactions(
    dlcTransactions: DlcTransactions,
  ): Promise<void> {
    this._dlcTxs.set(dlcTransactions.contractId, dlcTransactions);
  }

  public async deleteDlcTransactions(contractId: Buffer): Promise<void> {
    this._dlcTxs.delete(contractId);
  }
}
