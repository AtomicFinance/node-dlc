import {
  RocksdbDlcStore,
  RocksdbOrderStore,
  RocksdbWalletStore,
} from '@node-dlc/rocksdb';
import { LogLevel } from '@node-lightning/logger';

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
  test?: string;
}

export interface IDB {
  wallet: RocksdbWalletStore;
  dlc: RocksdbDlcStore;
  order: RocksdbOrderStore;
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

export type ConfLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
export const loglevels: ReadonlyArray<ConfLogLevel> = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
];

export const confToLogLevel = (loglevel: string): LogLevel => {
  switch (loglevel) {
    case 'trace':
      return LogLevel.Trace;
    case 'info':
      return LogLevel.Info;
    case 'warn':
      return LogLevel.Warn;
    case 'error':
      return LogLevel.Error;
    default:
      return LogLevel.Debug;
  }
};
