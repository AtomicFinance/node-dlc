import { Tx } from '@node-dlc/bitcoin';
import { Block, Transaction } from 'bitcoinjs-lib';
import { EventEmitter } from 'events';

import { DlcTransactionsV0 } from '../messages/DlcTransactions';
import { sleep } from '../util';
import { IDlcStore } from './DlcStore';
import {
  HasHash,
  HasHeight,
  IChainFilterChainClient,
} from './IChainFilterChainClient';

export enum SyncState {
  Unsynced,
  Syncing,
  Synced,
}

export interface ILogger {
  area: string;
  instance: string;
  trace(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  sub(area: string, instance?: string): ILogger;
}

/**
 * ChainManager validates and stores dlc txs
 * from chain updates
 */
export class ChainManager extends EventEmitter {
  public blockHeight: number;
  public started = false;
  public syncState: SyncState;
  public isSynchronizing: boolean;
  public chainClient: IChainFilterChainClient;
  public logger: ILogger;
  public dlcStore: IDlcStore;
  public dlcTxsList: DlcTransactionsV0[];

  constructor(
    logger: ILogger,
    chainClient: IChainFilterChainClient,
    dlcStore: IDlcStore,
  ) {
    super();
    this.logger = logger.sub('dlcmgr');
    this.dlcStore = dlcStore;
    this.chainClient = chainClient;
  }

  /**
   * Starts the chain manager. This method will load information
   * from the chain store, determine when the last information
   * was obtained, validate the existing messages
   */
  public async start(blockHeight = 0): Promise<void> {
    this.logger.info('starting dlc state manager');

    // wait for chain sync to complete
    if (this.chainClient) {
      this.logger.info('waiting for chain sync');
      await this.chainClient.waitForSync();
      this.logger.info('chain sync complete');
    }

    await this._restoreState(blockHeight);
    this.syncState = SyncState.Synced;

    // flag that the manager has now started
    this.started = true;
  }

  public async updateFundBroadcast(dlcTxs: DlcTransactionsV0): Promise<void> {
    const info = await this.chainClient.getBlockchainInfo();
    const block = await this.chainClient.getBlock(info.bestblockhash);

    dlcTxs.fundBroadcastHeight = block.height;

    await this.dlcStore.saveDlcTransactions(dlcTxs);
  }

  public async updateCloseBroadcast(dlcTxs: DlcTransactionsV0): Promise<void> {
    const info = await this.chainClient.getBlockchainInfo();
    const block = await this.chainClient.getBlock(info.bestblockhash);

    dlcTxs.closeBroadcastHeight = block.height;

    await this.dlcStore.saveDlcTransactions(dlcTxs);
  }

  public async updateFundEpoch(
    dlcTxs: DlcTransactionsV0,
    block: HasHeight & HasHash,
  ): Promise<void> {
    this.logger.info(
      `updating fund epoch on dlc ${dlcTxs.contractId.toString('hex')}`,
    );
    dlcTxs.fundEpoch.hash = Buffer.from(block.hash, 'hex');
    dlcTxs.fundEpoch.height = block.height;

    if (dlcTxs.fundBroadcastHeight === 0) {
      dlcTxs.fundBroadcastHeight = block.height - 1;
    }

    await this.dlcStore.saveDlcTransactions(dlcTxs);

    this.logger.info(
      `fund epoch updated on dlc ${dlcTxs.contractId.toString('hex')}`,
    );
  }

  public async updateCloseEpoch(
    dlcTxs: DlcTransactionsV0,
    tx: Tx,
    block: HasHeight & HasHash,
  ): Promise<void> {
    this.logger.info(
      `updating close epoch on dlc ${dlcTxs.contractId.toString('hex')}`,
    );
    dlcTxs.closeEpoch.hash = Buffer.from(block.hash, 'hex');
    dlcTxs.closeEpoch.height = Number(block.height);
    dlcTxs.closeTxHash = Buffer.from(tx.txId.toString(), 'hex');
    dlcTxs.closeType = 3; // Default to cooperative close if txid not refund or cet txid

    const _dlcTxs = await this.dlcStore.findDlcTransactions(dlcTxs.contractId);

    // figure out if it's execute, refund or mutual close
    if (tx.txId.toString() === dlcTxs.refundTx.txId.toString()) {
      dlcTxs.closeType = 2;
    } else {
      const cetIndex = _dlcTxs.cets.findIndex(
        (cet) => tx.txId.toString() === cet.txId.toString(),
      );
      if (cetIndex >= 0) dlcTxs.closeType = 1;
    }

    if (dlcTxs.closeBroadcastHeight === 0) {
      dlcTxs.closeBroadcastHeight = block.height - 1;
    }

    await this.dlcStore.saveDlcTransactions(dlcTxs);

    this.logger.info(
      `close epoch updated on dlc ${dlcTxs.contractId.toString('hex')}`,
    );
  }

  private async _restoreState(blockHeight = 0): Promise<void> {
    this.logger.info('retrieving dlc state from store');
    this.blockHeight = blockHeight;
    this.syncState = SyncState.Syncing;
    this.dlcTxsList = await this.dlcStore.findDlcTransactionsList();
    this.logger.info('found %d dlcs', this.dlcTxsList.length);

    if (blockHeight === 0) {
      // find best block height
      for (const dlcTxs of this.dlcTxsList) {
        this.blockHeight = Math.max(
          Math.max(this.blockHeight, dlcTxs.fundEpoch.height),
          dlcTxs.closeEpoch.height,
        );
      }
    }

    this.logger.info("highest block %d found from %d dlcs", this.blockHeight, this.dlcTxsList.length); // prettier-ignore

    // validate all utxos
    await this._validateUtxos(this.dlcTxsList);
  }

  private async _validateUtxos(_dlcTxsList: DlcTransactionsV0[]) {
    if (!this.chainClient) {
      this.logger.info('skipping utxo validation, no chain_client configured');
      return;
    }

    const dlcTxsList = _dlcTxsList.filter(
      (dlcTxs) => dlcTxs.closeEpoch.height === 0,
    );

    const dlcTxsCount = dlcTxsList.reduce(
      (acc, msg) => acc + (msg instanceof DlcTransactionsV0 ? 1 : 0),
      0,
    );
    this.logger.info('validating %d funding utxos', dlcTxsCount);

    if (!dlcTxsCount) return;

    const dlcTxsToVerify: DlcTransactionsV0[] = [];

    const oct = Math.trunc(dlcTxsCount / 16);
    for (let i = 0; i < dlcTxsList.length; i++) {
      const dlcTxs = dlcTxsList[i];
      if ((i + 1) % oct === 0) {
        this.logger.info(
          'validating funding utxos %s% complete',
          (((i + 1) / dlcTxsCount) * 100).toFixed(2),
        );
      }
      if (dlcTxs instanceof DlcTransactionsV0) {
        const utxo = await this.chainClient.getUtxo(
          dlcTxs.fundTx.txId.toString(),
          dlcTxs.fundTxVout,
        );

        try {
          const tx = await this.chainClient.getTransaction(
            dlcTxs.fundTx.txId.toString(),
          );
          if (!utxo) dlcTxsToVerify.push(dlcTxs);

          if (utxo && Number(utxo.confirmations) === 0)
            this.updateFundBroadcast(dlcTxs);

          if (
            utxo &&
            Number(utxo.confirmations) > 0 &&
            dlcTxs.fundEpoch.height === 0
          ) {
            const block = await this.chainClient.getBlock(tx.blockhash);
            await this.updateFundEpoch(dlcTxs, block);
          }
        } catch (e) {
          /**
           * tx doesn't exist
           * fund tx wasn't broadcast in the first place
           */
        }
      }
    }
    this.logger.info('validating funding utxos 100% complete');

    if (dlcTxsToVerify.length === 0) {
      this.logger.info('no closing utxos to validate');
      return;
    }

    await this._validateClosingUtxos(dlcTxsToVerify);
  }

  private async _validateClosingUtxos(dlcTxsList: DlcTransactionsV0[]) {
    let info = await this.chainClient.getBlockchainInfo();

    if (this.blockHeight === 0) {
      this.logger.info('cannot sync from block height 0');
      return;
    }

    let numBlocksToSync = Math.max(info.blocks - this.blockHeight, 0);
    this.logger.info('validating %d blocks for closing utxos', numBlocksToSync);
    const oct = Math.trunc(numBlocksToSync / 16);
    let i = 0;
    while (info.blocks > this.blockHeight) {
      await sleep(10);

      if ((i + 1) % oct === 0) {
        this.logger.info(
          'validating block %s, closing utxos %s% complete',
          this.blockHeight,
          (((i + 1) / numBlocksToSync) * 100).toFixed(2),
        );
      }

      // Log every 10 blocks
      if (this.blockHeight % 10 === 0) {
        this.logger.info(
          'Validating block %s for closing utxos',
          this.blockHeight,
        );
      }

      this.blockHeight += 1;

      const blockHash = await this.chainClient.getBlockHash(this.blockHeight);
      const blockBuf = await this.chainClient.getRawBlock(blockHash);

      const block = Block.fromBuffer(blockBuf);
      for (const transaction of block.transactions) {
        try {
          const bjsTx = Transaction.fromBuffer(transaction.toBuffer());
          if (!bjsTx.isCoinbase()) {
            // ignore coinbase txs for outpoint check
            const tx = Tx.fromBuffer(transaction.toBuffer());
            await this._checkOutpoints(dlcTxsList, tx, block.getId());
          }
        } catch (e) {
          this.logger.error(
            'Invalid tx for validating closing utxo: %s',
            transaction.toHex(),
          );
          this.logger.trace('Error: ', e);
        }
      }

      if (info.blocks === this.blockHeight) {
        info = await this.chainClient.getBlockchainInfo();
        if (info.blocks === this.blockHeight) break;
        numBlocksToSync += info.blocks - this.blockHeight;
      }

      i++;
    }

    this.logger.info('validating closing utxos 100% complete');
  }

  private async _checkOutpoints(
    dlcTxsList: DlcTransactionsV0[],
    tx: Tx,
    blockHash: string,
  ) {
    for (const dlcTxs of dlcTxsList) {
      for (const input of tx.inputs) {
        if (dlcTxs.fundTx.txId.toString() === input.outpoint.txid.toString()) {
          const block = await this.chainClient.getBlock(blockHash);
          await this.updateCloseEpoch(dlcTxs, tx, block);
        }
      }
    }
  }
}
