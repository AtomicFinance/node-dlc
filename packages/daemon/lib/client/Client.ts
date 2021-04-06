import { Logger } from '@node-lightning/logger';
import { Application } from 'express';
import { IArguments, IDB } from '../utils/config';

import WalletClient from '@liquality/client';
import BitcoinRpcProvider from '@liquality/bitcoin-rpc-provider';
import BitcoinEsploraApiProvider from '@liquality/bitcoin-esplora-api-provider';
import BitcoinEsploraBatchApiProvider from '@liquality/bitcoin-esplora-batch-api-provider';
import BitcoinJsWalletProvider from '@liquality/bitcoin-js-wallet-provider';
import BitcoinNetworks from '@liquality/bitcoin-networks';

import FinanceClient from '@atomicfinance/client';
import BitcoinCfdProvider from '@atomicfinance/bitcoin-cfd-provider';
import BitcoinDlcProvider from '@atomicfinance/bitcoin-dlc-provider';
import BitcoinWalletProvider from '@atomicfinance/bitcoin-wallet-provider';
import { BitcoinNetwork } from '@atomicfinance/bitcoin-networks';
import * as BitcoinFinanceNetworks from '@atomicfinance/bitcoin-networks';
import * as cfdJs from 'cfd-js';
import { getWrappedCfdDlcJs } from '../wrappers/WrappedCfdDlcJs';

import { Network } from '../utils/config';

export class Client {
  private client;
  public seedSet = false;
  private argv: IArguments;
  private db: IDB;
  private logger: Logger;

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

    const { network: _network, financeNetwork } = this.getNetwork();
    const rpcuri = `http://${rpchost}:${rpcport}`;
    const cfdDlcJs = getWrappedCfdDlcJs();

    this.client = new WalletClient();
    this.client.finance = new FinanceClient();

    // If no API URL use JSON RPC
    // Else use Esplora
    if (electrsapi === '') {
      this.client.addProvider(new BitcoinRpcProvider(rpcuri, rpcuser, rpcpass));
    } else {
      if (argv.electrsbatchapi === '') {
        this.client.addProvider(
          new BitcoinEsploraApiProvider(electrsbatchapi, electrsapi, _network),
        );
      } else {
        this.client.addProvider(
          new BitcoinEsploraBatchApiProvider(electrsapi, _network),
        );
      }
    }

    this.client.addProvider(new BitcoinCfdProvider(_network, cfdJs));
    this.client.addProvider(new BitcoinDlcProvider(financeNetwork, cfdDlcJs));
    this.client.addProvider(new BitcoinWalletProvider(financeNetwork));
  }

  setSeed(mnemonic: string): void {
    if (this.seedSet) throw Error('Seed Set');

    const { network: _network } = this.getNetwork();

    this.client.addProvider(new BitcoinJsWalletProvider(_network, mnemonic));
  }

  private getNetwork(): INetwork {
    switch (this.argv.network) {
      case 'mainnet':
        return {
          network: BitcoinNetworks.bitcoin,
          financeNetwork: BitcoinFinanceNetworks.bitcoin,
        };
      case 'testnet':
        return {
          network: BitcoinNetworks.bitcoin_testnet,
          financeNetwork: BitcoinFinanceNetworks.bitcoin_testnet,
        };
      case 'regtest':
        return {
          network: BitcoinNetworks.bitcoin_regtest,
          financeNetwork: BitcoinFinanceNetworks.bitcoin_regtest,
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
  financeNetwork: BitcoinNetwork;
}
