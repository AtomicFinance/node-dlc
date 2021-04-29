import { DlcTransactionsV0 } from '../messages/DlcTransactions';

/**
 * Interface for storing, finding, and deleting dlc messages.
 */
export interface IDlcStore {
  findDlcTransactionsList(): Promise<DlcTransactionsV0[]>;
  findDlcTransactions(contractId: Buffer): Promise<DlcTransactionsV0>;
  saveDlcTransactions(dlcTransactions: DlcTransactionsV0): Promise<void>;
  deleteDlcTransactions(contractId: Buffer): Promise<void>;
}
