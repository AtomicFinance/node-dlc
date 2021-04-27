import { Logger } from '@node-lightning/logger';
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
import { AddressCache, DlcTransactionsV0 } from '@node-dlc/messaging';
import { ChainSub } from '../chainsub/chainsub';

export class Client {
  public client: FinanceClient;
  public seedSet = false;
  public rpc = false;
  private argv: IArguments;
  private db: IDB;
  private logger: Logger;
  public network: BitcoinNetwork;
  public chainsub: ChainSub;

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
      // setup zmq thing
      this.chainsub = new ChainSub(argv);
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

  async chainUpdateAndStream(): Promise<void> {
    // TODO: get best block and update up to that point
    this.chainsub.subscribe(
      this.processBlock.bind(this),
      this.processTx.bind(this),
    );
  }

  async processBlock(blockHash: string): Promise<void> {
    if (this.rpc) {
      this._nodeProcessBlock(blockHash);
    } else {
      this._apiProcessBlock(blockHash);
    }
  }

  private async _nodeProcessBlock(blockHash: string): Promise<void> {
    const verbosity = 0;
    const blockHex: string = await this.client.getMethod('jsonrpc')(
      'getblock',
      blockHash,
      verbosity,
    );
    const blockHeader = await this.client.getMethod('jsonrpc')(
      'getblockheader',
      blockHash,
    );
    const block = Block.fromHex(blockHex);

    const dlcTxsToUpdate: DlcTransactionsV0[] = [];

    const dlcTxsList = await this.db.dlc.findDlcTransactionsList();

    block.transactions.forEach((transaction) => {
      dlcTxsList.forEach((dlcTxs) => {
        let dlcTxsNeedsUpdate = false;
        if (transaction.getId() === dlcTxs.fundTx.txId.toString()) {
          dlcTxs.fundEpoch.hash = Buffer.from(block.getId(), 'hex');
          dlcTxs.fundEpoch.height = Number(blockHeader.height);
          dlcTxsNeedsUpdate = true;
        }

        transaction.ins.forEach((input) => {
          if (input.hash.toString('hex') === dlcTxs.fundTx.txId.toString()) {
            const txid = transaction.getId();

            dlcTxs.closeEpoch.hash = Buffer.from(block.getId(), 'hex');
            dlcTxs.closeEpoch.height = Number(blockHeader.height);
            dlcTxs.closeTxHash = Buffer.from(txid, 'hex');
            dlcTxs.closeType = 3; // Default to cooperative close if txid not refund or cet txid

            // figure out if it's execute, refund or mutual close
            if (txid === dlcTxs.refundTx.txId.toString()) {
              dlcTxs.closeType = 2;
            } else {
              const cetIndex = dlcTxs.cets.findIndex(
                (cet) => txid === cet.txId.toString(),
              );
              if (cetIndex >= 0) dlcTxs.closeType = 1;
            }
            dlcTxsNeedsUpdate = true;
          }
        });

        if (dlcTxsNeedsUpdate) dlcTxsToUpdate.push(dlcTxs);
      });
    });

    const dlcTxsUpdatePromises = [];
    dlcTxsToUpdate.forEach((dlcTxs) => {
      dlcTxsUpdatePromises.push(this.db.dlc.saveDlcTransactions(dlcTxs));
    });
    await Promise.all(dlcTxsUpdatePromises);
  }

  private async _apiProcessBlock(blockHash: string): Promise<void> {
    throw Error(
      `State update from blockhash ${blockHash} for Esplora not yet implemented`,
    );
  }

  async processTx(txId: string): Promise<void> {
    if (this.rpc) {
      this._nodeProcessTx(txId);
    } else {
      this._apiProcessTx(txId);
    }
  }

  private async _nodeProcessTx(txId: string): Promise<void> {
    throw Error(`State update from txid ${txId} for Json rpc`);
  }

  private async _apiProcessTx(txId: string): Promise<void> {
    throw Error(
      `State update from txid ${txId} for Esplora not yet implemented`,
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
