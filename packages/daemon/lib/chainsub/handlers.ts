export interface BlockHandler {
  (blockHash: string): void;
}

export interface TxHandler {
  (txId: string): void;
}
