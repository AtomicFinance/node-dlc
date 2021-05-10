import { Logger } from '@node-lightning/logger';
import {
  BitcoindClient,
  BlockSummary,
  ConstantBackoff,
  RetryPolicy,
} from '@node-lightning/bitcoind';
import { Application } from 'express';
import { IArguments, IDB } from '../utils/config';

import BitcoinRpcProvider from '@liquality/bitcoin-rpc-provider';
import BitcoinEsploraApiProvider from '@liquality/bitcoin-esplora-api-provider';
import BitcoinEsploraBatchApiProvider from '@liquality/bitcoin-esplora-batch-api-provider';
import BitcoinJsWalletProvider from '@liquality/bitcoin-js-wallet-provider';
import BitcoinNetworks, { BitcoinNetwork } from '@liquality/bitcoin-networks';
import { bitcoin, Transaction } from '@liquality/types';
import { Block } from 'bitcoinjs-lib';

import FinanceClient from '@atomicfinance/client';
import BitcoinCfdProvider from '@atomicfinance/bitcoin-cfd-provider';
import BitcoinDlcProvider from '@atomicfinance/bitcoin-dlc-provider';
import BitcoinWalletProvider from '@atomicfinance/bitcoin-wallet-provider';
import { chainHashFromNetwork } from '@atomicfinance/bitcoin-networks';
import * as cfdJs from 'cfd-js';
import { getWrappedCfdDlcJs } from '../wrappers/WrappedCfdDlcJs';

import { Network } from '../utils/config';
import {
  AddressCache,
  ChainManager,
  DlcTransactionsV0,
} from '@node-dlc/messaging';
import { TxWatcher, BlockWatcher } from '@node-dlc/chainmon';
import { OutPoint, Value, Script, Tx } from '@node-lightning/bitcoin';
import { address } from 'bitcoinjs-lib';

export class Client {
  public client: FinanceClient;
  public chainClient: BitcoindClient;
  public seedSet = false;
  public rpc = false;
  public zmq = false;
  private argv: IArguments;
  public db: IDB;
  private logger: Logger;
  public network: BitcoinNetwork;
  public txWatcher: TxWatcher;
  public blockWatcher: BlockWatcher;
  public chainManager: ChainManager;

  constructor(argv: IArguments, db: IDB, logger: Logger) {
    this.argv = argv;
    this.db = db;
    this.logger = logger;
    const {
      electrsapi,
      electrsbatchapi,
      rpchost,
      rpcport,
      rpcuser,
      rpcpass,
      zmqpubrawtx,
      zmqpubrawblock,
    } = argv;

    const { network } = this.getNetwork();
    this.network = network;

    const rpcuri = `http://${rpchost}:${rpcport}`;

    this.client = new FinanceClient();

    // If no API URL use JSON RPC
    // Else use Esplora
    if (electrsapi === undefined || electrsapi === '') {
      this.client.addProvider(
        new BitcoinRpcProvider({
          uri: rpcuri,
          username: rpcuser,
          password: rpcpass,
          network,
        }),
      );
      this.rpc = true;

      if (zmqpubrawblock && zmqpubrawtx) {
        this.chainClient = new BitcoindClient({
          rpcuser: rpcuser,
          rpcpassword: rpcpass,
          host: rpchost,
          port: Number(rpcport),
          zmqpubrawtx,
          zmqpubrawblock,
          policyMaker: () => new RetryPolicy(5, new ConstantBackoff(5000)),
        });

        this.txWatcher = new TxWatcher(this.chainClient);
        this.blockWatcher = new BlockWatcher(this.chainClient);
        this.zmq = true;
      } else {
        this.logger.info('zmq addresses not set');
      }

      this.chainManager = new ChainManager(
        this.logger,
        this.chainClient,
        this.db.dlc,
      );
    } else {
      if (electrsbatchapi === undefined || electrsbatchapi === '') {
        this.client.addProvider(
          new BitcoinEsploraApiProvider({
            url: electrsapi,
            network,
          }),
        );
      } else {
        this.client.addProvider(
          new BitcoinEsploraBatchApiProvider({
            batchUrl: electrsbatchapi,
            url: electrsapi,
            network,
          }),
        );
      }
      // setup node cron job thing
    }
  }

  setSeed(mnemonic: string): void {
    if (this.seedSet) throw Error('Seed Set');

    this.client.addProvider(
      new BitcoinJsWalletProvider({
        network: this.network,
        mnemonic,
        addressType: bitcoin.AddressType.BECH32,
      }) as any,
    );
    this.seedSet = true;

    /**
     * Load CAL Finance providers last to ensure getMethod defaults
     * to their implementations
     */
    const cfdDlcJs =
      this.argv.test !== 'true'
        ? getWrappedCfdDlcJs()
        : getWrappedCfdDlcJs('./lib/wrappers/cfdDlcJsWorker.js');

    this.client.addProvider(new BitcoinCfdProvider(cfdJs));
    this.client.addProvider(new BitcoinDlcProvider(this.network, cfdDlcJs));
    this.client.addProvider(new BitcoinWalletProvider(this.network));
  }

  async setAddressCache(): Promise<void> {
    const addressCache = await this.db.wallet.findAddressCache();
    if (addressCache) {
      await this.client.getMethod('setUnusedAddressesBlacklist')(
        addressCache.toAddressCache(this.network),
      );
    }
  }

  async saveAddressCache(): Promise<void> {
    const _addressCache = await this.client.getMethod(
      'getUnusedAddressesBlacklist',
    )();
    const addressCache = AddressCache.fromAddressCache(
      _addressCache,
      this.network,
    );
    await this.db.wallet.saveAddressCache(addressCache);
  }

  async chainMon(): Promise<void> {
    if (!this.rpc) {
      this.logger.info(
        'skipping state update since esplora is currently not supported',
      );
      return;
    }

    if (!this.zmq) {
      this.logger.info('skipping state update since zmq address is not set');
      return;
    }

    const info = await this.chainClient.getBlockchainInfo();
    const block = await this.chainClient.getBlock(info.bestblockhash);

    await this.chainManager.start();
    await this.txWatcher.start();
    await this.blockWatcher.start(block);

    const dlcTxsList = await this.db.dlc.findDlcTransactionsList();

    const dlcTxsListFiltered = dlcTxsList.filter(
      (dlcTxs) =>
        dlcTxs.closeEpoch.height === 0 && dlcTxs.fundBroadcastHeight !== 0,
    );

    dlcTxsListFiltered.forEach((dlcTxs) => {
      if (dlcTxs.fundEpoch.height === 0) {
        // block watcher subscribe
        this.blockWatcher.watchScriptPubKey(
          dlcTxs.fundTx.outputs[dlcTxs.fundTxVout].scriptPubKey,
        );
      }

      if (dlcTxs.closeBroadcastHeight === 0) {
        // tx watcher subscribe
        this.txWatcher.watchOutpoint(
          OutPoint.fromString(
            `${dlcTxs.fundTx.txId.toString()}:${dlcTxs.fundTxVout}`,
          ),
        );
      }

      if (dlcTxs.closeEpoch.height === 0) {
        // block watcher subscribe
        this.blockWatcher.watchOutpoint(
          OutPoint.fromString(
            `${dlcTxs.fundTx.txId.toString()}:${dlcTxs.fundTxVout}`,
          ),
        );
      }
    });

    this.txWatcher.on(
      'scriptpubkeyreceived',
      async (tx, watchedScriptPubKey: [Script, Value]) => {
        const [scriptPubKey, _] = watchedScriptPubKey;
        const dlcTxs = await this.db.dlc.findDlcTransactionsByScriptPubKey(
          scriptPubKey,
        );
        this.logger.info(
          'scriptpubkeyreceived %s broadcast',
          address.fromOutputScript(
            scriptPubKey.serialize().slice(1),
            this.network,
          ),
        );
        this.chainManager.updateFundBroadcast(dlcTxs);
        this.logger.info(
          'updated fund broadcast contractid %s',
          dlcTxs.contractId.toString('hex'),
        );
      },
    );

    this.txWatcher.on(
      'outpointspent',
      async (tx, watchedOutpoint: OutPoint) => {
        const dlcTxs = await this.db.dlc.findDlcTransactionsByOutpoint(
          watchedOutpoint,
        );
        this.logger.info(
          'outpointspent %s broadcast',
          watchedOutpoint.toString(),
        );
        this.chainManager.updateCloseBroadcast(dlcTxs);
        this.logger.info(
          'updated close broadcast contractid %s',
          dlcTxs.contractId.toString('hex'),
        );
      },
    );

    this.blockWatcher.on(
      'scriptpubkeyreceived',
      async (block: BlockSummary, tx, watchedScriptPubKey: [Script, Value]) => {
        const [scriptPubKey, _] = watchedScriptPubKey;
        const dlcTxs = await this.db.dlc.findDlcTransactionsByScriptPubKey(
          scriptPubKey,
        );
        this.logger.info(
          'scriptpubkeyreceived %s confirmed at height %s',
          address.fromOutputScript(
            scriptPubKey.serialize().slice(1),
            this.network,
          ),
          block.height,
        );
        this.chainManager.updateFundEpoch(dlcTxs, block);
        this.logger.info(
          'updated fund epoch contractid %s',
          dlcTxs.contractId.toString('hex'),
        );
      },
    );

    this.blockWatcher.on(
      'outpointspent',
      async (block: BlockSummary, tx: Tx, watchedOutpoint: OutPoint) => {
        const dlcTxs = await this.db.dlc.findDlcTransactionsByOutpoint(
          watchedOutpoint,
        );
        this.logger.info(
          'outpointspent %s confirmed at height %s',
          watchedOutpoint.toString(),
          block.height,
        );
        this.chainManager.updateCloseEpoch(dlcTxs, tx, block);
        this.logger.info(
          'updated close epoch contractid: %s',
          dlcTxs.contractId.toString('hex'),
        );
      },
    );
  }

  async importAddressesToRpc(addresses: string[]): Promise<void> {
    const importPromises = [];
    addresses.forEach((address) => {
      importPromises.push(
        this.client.getMethod('jsonrpc')('importaddress', address, '', false),
      );
    });

    await Promise.all(importPromises);
  }

  public watchDlcTransactions(dlcTxs: DlcTransactionsV0): void {
    if (!this.zmq) {
      this.logger.info('skipping broadcast sub since zmq address not set');
      return;
    }

    this.txWatcher.watchScriptPubKey(
      dlcTxs.fundTx.outputs[dlcTxs.fundTxVout].scriptPubKey,
    );

    this.blockWatcher.watchScriptPubKey(
      dlcTxs.fundTx.outputs[dlcTxs.fundTxVout].scriptPubKey,
    );

    this.txWatcher.watchOutpoint(
      OutPoint.fromString(
        `${dlcTxs.fundTx.txId.toString()}:${dlcTxs.fundTxVout}`,
      ),
    );

    this.blockWatcher.watchOutpoint(
      OutPoint.fromString(
        `${dlcTxs.fundTx.txId.toString()}:${dlcTxs.fundTxVout}`,
      ),
    );
  }

  private getNetwork(): INetwork {
    switch (this.argv.network) {
      case 'mainnet':
        return {
          network: BitcoinNetworks.bitcoin,
        };
      case 'testnet':
        return {
          network: BitcoinNetworks.bitcoin_testnet,
        };
      case 'regtest':
        return {
          network: BitcoinNetworks.bitcoin_regtest,
        };
      default:
        throw Error(
          'Incorrect network provided. Must be mainnet, testnet, regtest',
        );
    }
  }
}

interface INetwork {
  network: any;
}
