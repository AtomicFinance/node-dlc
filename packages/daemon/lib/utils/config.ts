import { RocksdbWalletStore } from "@node-dlc/rocksdb";

export interface Arguments {
  [x: string]: unknown;
  network?: string;
  n: string;
  port?: number;
  p: number;
  host?: string;
  h: string;
  loglevel?: string;
  c: string;
  conf?: string;
  d: string;
  datadir?: string;
}

export interface DB {
  wallet: RocksdbWalletStore
}

export function parseConfig(configData) {
  return JSON.parse(JSON.stringify(configData))
}
