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
  public rpc = false;
  private argv: IArguments;
  private db: IDB;
  private logger: Logger;
  public network;
  public financeNetwork: BitcoinNetwork;

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
    this.network = _network;
    this.financeNetwork = financeNetwork;

    const rpcuri = `http://${rpchost}:${rpcport}`;

    this.client = new WalletClient();
    const financeClient: FinanceClient = new FinanceClient(this.client);
    this.client.finance = financeClient;

    // If no API URL use JSON RPC
    // Else use Esplora
    if (electrsapi === '') {
      this.client.addProvider(new BitcoinRpcProvider(rpcuri, rpcuser, rpcpass));
      this.rpc = true;
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

    const cfdDlcJs = getWrappedCfdDlcJs();
    this.client.finance.addProvider(
      new BitcoinCfdProvider(this.network, cfdJs),
    );
    this.client.finance.addProvider(
      new BitcoinDlcProvider(this.financeNetwork, cfdDlcJs),
    );
    this.client.finance.addProvider(
      new BitcoinWalletProvider(this.financeNetwork),
    );
  }

  get createDlcOffer() {
    return this.client.finance.dlc.createDlcOffer.bind(this.client.finance.dlc);
  }

  get acceptDlcOffer() {
    return this.client.finance.dlc.acceptDlcOffer.bind(this.client.finance.dlc);
  }

  get newAddress() {
    return this.client.finance.wallet.getUnusedAddress.bind(
      this.client.finance.wallet,
    );
  }

  get usedAddresses() {
    return this.client.wallet.getUsedAddresses.bind(this.client.wallet);
  }

  get balance() {
    return this.client.chain.getBalance.bind(this.client.chain);
  }

  get getMethod() {
    return this.client.finance.getMethod.bind(this.client.finance);
  }

  setSeed(mnemonic: string): void {
    if (this.seedSet) throw Error('Seed Set');

    this.client.addProvider(
      new BitcoinJsWalletProvider(this.network, mnemonic),
    );
    this.seedSet = true;
  }

  private getNetwork(): INetwork {
    switch (this.argv.network) {
      case 'mainnet':
        return {
          network: BitcoinNetworks.bitcoin,
          financeNetwork: BitcoinFinanceNetworks.default.bitcoin,
        };
      case 'testnet':
        return {
          network: BitcoinNetworks.bitcoin_testnet,
          financeNetwork: BitcoinFinanceNetworks.default.bitcoin_testnet,
        };
      case 'regtest':
        return {
          network: BitcoinNetworks.bitcoin_regtest,
          financeNetwork: BitcoinFinanceNetworks.default.bitcoin_regtest,
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
