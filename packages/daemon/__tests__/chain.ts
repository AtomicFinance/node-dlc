import WalletClient from '@liquality/client';
import BitcoinRpcProvider from '@liquality/bitcoin-rpc-provider';
import BitcoinNodeWalletProvider from '@liquality/bitcoin-node-wallet-provider';
import BitcoinNetworks, { BitcoinNetwork } from '@liquality/bitcoin-networks';
import { argv } from './daemon';

export const client = new WalletClient();

const bitcoinNetwork: BitcoinNetwork = BitcoinNetworks.bitcoin_regtest;

client.addProvider(
  new BitcoinRpcProvider({
    uri: `http://${argv.rpchost}:${argv.rpcport}`,
    username: argv.rpcuser,
    password: argv.rpcpass,
    network: bitcoinNetwork,
  }),
);

client.addProvider(
  new BitcoinNodeWalletProvider({
    uri: `http://${argv.rpchost}:${argv.rpcport}`,
    username: argv.rpcuser,
    password: argv.rpcpass,
    network: bitcoinNetwork,
  }),
);
