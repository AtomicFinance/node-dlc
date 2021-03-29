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
  a: string;
  network: Network;
  n: Network;
  port: number;
  p: number;
  host: string;
  h: string;
  loglevel: string;
  l: string;
}
