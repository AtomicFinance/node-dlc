/**
 * The interface required by the Chainfilter to perform on-chain validation checks
 * of messages. A simplified interface is required by the Chainfilter. The actual
 * chain client implementation may offer a broader set of feautures. Additionally,
 * an adapter could be constructred to make an chain client conform to that required
 * by the Chainfilter.
 */
export interface IChainFilterChainClient {
  getBlockchainInfo(): Promise<HasBlocks & HasBestBlockHash>;
  getBlockHash(height: number): Promise<string>;
  getBlock(hash: string): Promise<HasTxStrings & HasHeight & HasHash>;
  getRawBlock(hash: string): Promise<Buffer>;
  getTransaction(txId: string): Promise<HasTransaction>;
  getUtxo(txId: string, voutIdx: number): Promise<HasConfirmations>;
  waitForSync(): Promise<boolean>;
}

export type HasBlocks = {
  blocks: number;
};

export type HasBestBlockHash = {
  bestblockhash: string;
};

export type HasTxStrings = {
  tx: string[];
};

export type HasHeight = {
  height: number;
};

export type HasHash = {
  hash: string;
};

export type HasTransaction = {
  txid: string;
  blockhash: string;
};

export type HasScriptPubKey = {
  scriptPubKey: HasHex;
};

export type HasValue = {
  value: number;
};

export type HasConfirmations = {
  confirmations: string;
};

export type HasHex = {
  hex: string;
};
