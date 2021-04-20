import { Logger } from '@node-lightning/logger';
import { Application } from 'express';
import { IArguments, IDB } from '../utils/config';

import BitcoinRpcProvider from '@liquality/bitcoin-rpc-provider';
import BitcoinEsploraApiProvider from '@liquality/bitcoin-esplora-api-provider';
import BitcoinEsploraBatchApiProvider from '@liquality/bitcoin-esplora-batch-api-provider';
import BitcoinJsWalletProvider from '@liquality/bitcoin-js-wallet-provider';
import BitcoinNetworks, { BitcoinNetwork } from '@liquality/bitcoin-networks';
import { bitcoin } from '@liquality/types';

import FinanceClient from '@atomicfinance/client';
import BitcoinCfdProvider from '@atomicfinance/bitcoin-cfd-provider';
import BitcoinDlcProvider from '@atomicfinance/bitcoin-dlc-provider';
import BitcoinWalletProvider from '@atomicfinance/bitcoin-wallet-provider';
import * as cfdJs from 'cfd-js';
import { getWrappedCfdDlcJs } from '../wrappers/WrappedCfdDlcJs';

import { Network } from '../utils/config';
import { AddressCache } from '@node-dlc/messaging';

export class Client {
  public client: FinanceClient;
  public seedSet = false;
  public rpc = false;
  private argv: IArguments;
  private db: IDB;
  private logger: Logger;
  public network: BitcoinNetwork;

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
