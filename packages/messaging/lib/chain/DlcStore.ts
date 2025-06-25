import { DlcTransactions } from '../messages/DlcTransactions';

/**
 * Interface for storing, finding, and deleting dlc messages.
 */
export interface IDlcStore {
  findDlcTransactionsList(): Promise<DlcTransactions[]>;
  findDlcTransactions(contractId: Buffer): Promise<DlcTransactions>;
  saveDlcTransactions(dlcTransactions: DlcTransactions): Promise<void>;
  deleteDlcTransactions(contractId: Buffer): Promise<void>;
}
