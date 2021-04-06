import { RocksdbDlcStore, RocksdbWalletStore } from '@node-dlc/rocksdb';

export interface IArguments {
  [x: string]: unknown;
  network?: string;
  n: string;
  port?: number;
  p: number;
  host?: string;
  h: string;
  loglevel?: string;
  l: string;
  c: string;
  conf?: string;
  d: string;
  datadir?: string;
  rpcuser?: string;
  rpcpass?: string;
  rpchost?: string;
  rpcport?: string;
  electrsapi?: string;
  electrsbatchapi?: string;
}

export interface IDB {
  wallet: RocksdbWalletStore;
  dlc: RocksdbDlcStore;
}

export function parseConfig(configData: any): any {
  return JSON.parse(JSON.stringify(configData));
}

export type Network = 'mainnet' | 'testnet' | 'regtest';
export const networks: ReadonlyArray<Network> = [
  'mainnet',
  'testnet',
  'regtest',
];
