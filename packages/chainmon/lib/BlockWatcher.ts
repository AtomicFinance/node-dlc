import { OutPoint, Tx, Script, Value } from '@node-lightning/bitcoin';
import { BitcoindClient, BlockSummary } from '@node-lightning/bitcoind';
import { Block } from 'bitcoinjs-lib';
import { EventEmitter } from 'events';

export class BlockWatcher extends EventEmitter {
  /**
   * Outpoints that are being watched
   */
  public watchedOutPoints: Map<string, OutPoint>;

  /**
   * ScriptPubKeys that are being watched
   */
  public watchedScriptPubKeys: Map<string, [Script, Value]>;

  public receivedBlocks: Map<string, BlockSummary>;
  public previousHashToHash: Map<string, string>;

  private _client: BitcoindClient;

  /**
   * TxWatcher listens for transactions that match certain patterns
   * and events when a transaction is found matching the pattern
   *
   * @param client
   */
  constructor(client: BitcoindClient) {
    super();
    this._client = client;
    this.watchedOutPoints = new Map<string, OutPoint>();
    this.watchedScriptPubKeys = new Map<string, [Script, Value]>();
    this.receivedBlocks = new Map<string, BlockSummary>();
    this.previousHashToHash = new Map<string, string>();
  }

  /**
   * Starts watching for transactions
   */
  public start(latestBlock: BlockSummary): void {
    this.receivedBlocks.set(latestBlock.hash, latestBlock);
    this._client.subscribeRawBlock();
    this._client.on('rawblock', this._onRawBlock.bind(this));
  }

  /**
   * Stops watching for transactions
   */
  public stop(): void {
    // this._client.close();
  }

  /**
   * Watches an outpoint for broadcase in a new transaction
   * @param outpoint
   */
  public watchOutpoint(outpoint: OutPoint): void {
    const key = outpoint.toString();
    this.watchedOutPoints.set(key, outpoint);
  }

  /**
   * Watches a scriptpubkey for broadcast in a new transaction
   * @param scriptPubKey
   * @param value
   */
  public watchScriptPubKey(scriptPubKey: Script, value?: Value): void {
    const key = scriptPubKey.toString();
    this.watchedScriptPubKeys.set(key, [scriptPubKey, value]);
  }

  ////////////////////////////////////////////////////////////////

  private _checkOutpoints(block: BlockSummary, tx: Tx) {
    for (const vin of tx.inputs) {
      const key = vin.outpoint.toString();
      const watchedOutpoint = this.watchedOutPoints.get(key);
      if (watchedOutpoint) {
        this.watchedOutPoints.delete(key);
        this.emit('outpointspent', block, tx, watchedOutpoint);
      }
    }
  }

  private _checkScriptPubkeys(block: BlockSummary, tx: Tx) {
    for (const vout of tx.outputs) {
      const key = vout.scriptPubKey.toString();
      const watchedScriptPubKey = this.watchedScriptPubKeys.get(key);
      if (watchedScriptPubKey) {
        const [, value] = watchedScriptPubKey;
        if (!value || (value && vout.value === value)) {
          this.watchedScriptPubKeys.delete(key);
          this.emit('scriptpubkeyreceived', block, tx, watchedScriptPubKey);
        }
      }
    }
  }

  private _onRawBlock(buf: Buffer) {
    const block = Block.fromBuffer(buf);
    let txs: [string];
    for (const transaction of block.transactions) {
      if (!txs) txs = [transaction.getId()];
    }

    const previousblockhash = Buffer.from(block.prevHash)
      .reverse()
      .toString('hex');

    const previousBlock = this.receivedBlocks.get(previousblockhash);
    const blockSize = buf.length;

    if (previousBlock) {
      this._processBlock(block, blockSize, txs, previousBlock);
    } else {
      this._findPreviousBlockAndProcess(buf, previousblockhash);
    }
  }

  private _processBlock(
    block: Block,
    blockSize: number,
    txs: [string],
    previousBlock: BlockSummary,
  ) {
    const blockHash = block.getId();

    const blockSummary: BlockSummary = {
      hash: blockHash,
      confirmations: 1,
      size: blockSize,
      weight: block.weight(),
      height: previousBlock.height + 1,
      version: block.version,
      versionHex: '',
      merkleroot: block.merkleRoot.toString('hex'),
      tx: txs,
      time: block.timestamp,
      mediantime: block.timestamp,
      nonce: block.nonce,
      bits: '',
      difficulty: '',
      chainwork: '',
      nTx: block.transactions.length,
      previousblockhash: previousBlock.hash,
      nextblockhash: '',
    };

    this.receivedBlocks.set(blockSummary.hash, blockSummary);

    for (const transaction of block.transactions) {
      const tx = Tx.fromBuffer(transaction.toBuffer());
      this._checkOutpoints(blockSummary, tx);
      this._checkScriptPubkeys(blockSummary, tx);
    }

    const existingBlockWithPrevHash = this.previousHashToHash.get(
      blockSummary.previousblockhash,
    );
    if (existingBlockWithPrevHash) {
      this.emit('orphanblock', existingBlockWithPrevHash, blockSummary.hash);
    } else {
      this.previousHashToHash.set(
        blockSummary.previousblockhash,
        blockSummary.hash,
      );
    }
  }

  private async _findPreviousBlockAndProcess(
    currentBlockBuf: Buffer,
    previousblockhash: string,
  ) {
    const previousBuf = await this._client.getRawBlock(previousblockhash);

    this._onRawBlock(previousBuf);
    this._onRawBlock(currentBlockBuf);
  }
}
