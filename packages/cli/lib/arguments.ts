type Network = 'mainnet' | 'testnet' | 'regtest';
export const networks: ReadonlyArray<Network> = [
  'mainnet',
  'testnet',
  'regtest',
];

type Log = 'trace' | 'debug' | 'info' | 'warn' | 'error';
export const logs: ReadonlyArray<Log> = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
];

export interface IArguments {
  [x: string]: unknown;
  apiKey: string;
  apikey: string;
  a: string;
  network: Network;
  n: Network;
  port: number;
  p: number;
  host: string;
  h: string;
  loglevel: string;
  l: string;
  contractinfo: string;
  orderoffer: string;
  orderaccept: string;
  change: boolean;
  filepath: string;
}
