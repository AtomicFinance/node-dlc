import FinanceClient from '@atomicfinance/client';
import BitcoinRpcProvider from '@liquality/bitcoin-rpc-provider';
import BitcoinNodeWalletProvider from '@liquality/bitcoin-node-wallet-provider';
import BitcoinNetworks, { BitcoinNetwork } from '@liquality/bitcoin-networks';
import { argv } from './daemon';
import BN from 'bignumber.js';
import { bitcoin, Transaction } from '@liquality/types';
import BitcoinDlcProvider from '@atomicfinance/bitcoin-dlc-provider';
import BitcoinCfdProvider from '@atomicfinance/bitcoin-cfd-provider';
import * as cfdJs from 'cfd-js';
import { getWrappedCfdDlcJs } from '../lib/wrappers/WrappedCfdDlcJs';
import BitcoinWalletProvider from '@atomicfinance/bitcoin-wallet-provider';
import BitcoinJsWalletProvider from '@liquality/bitcoin-js-wallet-provider';
import { generateMnemonic } from 'bip39';

const CONSTANTS = {
  BITCOIN_FEE_PER_BYTE: 3,
  BITCOIN_ADDRESS_DEFAULT_BALANCE: 2 * 1e8,
};

export const bitcoinNetwork: BitcoinNetwork = BitcoinNetworks.bitcoin_regtest;

export const node = new FinanceClient();

node.addProvider(
  new BitcoinRpcProvider({
    uri: `http://${argv.rpchost}:${argv.rpcport}`,
    username: argv.rpcuser,
    password: argv.rpcpass,
    network: bitcoinNetwork,
  }),
);

node.addProvider(
  new BitcoinNodeWalletProvider({
    uri: `http://${argv.rpchost}:${argv.rpcport}`,
    username: argv.rpcuser,
    password: argv.rpcpass,
    network: bitcoinNetwork,
  }),
);

export const client = new FinanceClient();

client.addProvider(
  new BitcoinRpcProvider({
    uri: `http://${argv.rpchost}:${argv.rpcport}`,
    username: argv.rpcuser,
    password: argv.rpcpass,
    network: bitcoinNetwork,
  }),
);

client.addProvider(
  new BitcoinJsWalletProvider({
    network: bitcoinNetwork,
    mnemonic: generateMnemonic(256),
    addressType: bitcoin.AddressType.BECH32,
  }) as any,
);

const cfdDlcJs = getWrappedCfdDlcJs('./lib/wrappers/cfdDlcJsWorker.js');

client.addProvider(new BitcoinCfdProvider(cfdJs));
client.addProvider(new BitcoinDlcProvider(bitcoinNetwork, cfdDlcJs));
client.addProvider(new BitcoinWalletProvider(bitcoinNetwork));

export const fundAddress = async (address: string): Promise<Transaction> => {
  const tx = await node.chain.sendTransaction({
    to: address,
    value: new BN(CONSTANTS.BITCOIN_ADDRESS_DEFAULT_BALANCE),
  });
  await mineBlock();
  return tx;
};

export const mineBlock = async (): Promise<void> => {
  await client.chain.generateBlock(1);
};

export const importAddresses = async (addresses: string[]) => {
  const request = addresses.map((address) => ({
    scriptPubKey: { address },
    timestamp: 0,
  }));
  return client.getMethod('jsonrpc')('importmulti', request, { rescan: false });
};

export const importAndFundClient = async (): Promise<void> => {
  const nonChangeAddresses = await client.wallet.getAddresses(0, 25, false);
  const changeAddresses = await client.wallet.getAddresses(0, 25, true);

  await importAddresses(nonChangeAddresses.map((address) => address.address));
  await importAddresses(changeAddresses.map((address) => address.address));
  await fundAddress(nonChangeAddresses[0].address);
};
