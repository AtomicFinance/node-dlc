import fs from 'fs';
import path from 'path';
import { Network, ConfLogLevel, IArguments } from '../lib/utils/config';
import bcrypto from 'bcrypto';

/**
 * Recursively removes a directory and all files that
 * are contained within the directory.
 */
export const rmdir = (dir: string): void => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.lstatSync(filepath).isDirectory()) rmdir(filepath);
    else fs.unlinkSync(filepath);
  }
  fs.rmdirSync(dir);
};

export const enableLogger = false;

export const apiPrefix = 'api';
export const apiV0Prefix = 'api/v0';

export const config = {
  bitcoin: {
    rpc: {
      host: '127.0.0.1',
      port: '18443',
      username: 'bitcoin',
      password: 'local321',
    },
  },
  host: '127.0.0.1',
  datadir: '.testdb',
  conf: 'node-dlc.conf',
  test: 'true',
  port: 8475,
};

export const network: Network = 'regtest';
export const apikey = bcrypto.random.randomBytes(32).toString('hex');
export const loglevel: ConfLogLevel = 'trace';
export const port = 8475;
export const chainHash = Buffer.from(
  '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206',
  'hex',
);

export const argv: IArguments = {
  network,
  n: network,
  test: config.test,
  loglevel,
  l: loglevel,
  apikey,
  rpchost: config.bitcoin.rpc.host,
  rpcport: config.bitcoin.rpc.port,
  rpcuser: config.bitcoin.rpc.username,
  rpcpass: config.bitcoin.rpc.password,
  p: config.port,
  port: config.port,
  h: config.host,
  host: config.host,
  d: config.datadir,
  datadir: config.datadir,
  c: config.conf,
  conf: config.conf,
};

export type Route =
  | 'info'
  | 'order'
  | 'dlc'
  | 'contract'
  | 'wallet'
  | 'oracle'
  | 'finance';

/**
 * Generates argument vector dependent on route to be tested
 */
export const getArgv = (route: Route): IArguments => {
  const newArgv = { ...argv };
  newArgv.datadir = `.testdb-${route}`;
  newArgv.d = `.testdb-${route}`;

  let newPort = port;

  switch (route) {
    case 'info':
      newPort = 8476;
      break;
    case 'order':
      newPort = 8477;
      break;
    case 'dlc':
      newPort = 8478;
      break;
    case 'contract':
      newPort = 8479;
      break;
    case 'wallet':
      newPort = 8480;
      break;
    case 'oracle':
      newPort = 8481;
      break;
    case 'finance':
      newPort = 8482;
      break;
    default:
      newPort = port;
  }

  newArgv.port = newPort;
  newArgv.p = newPort;

  return newArgv;
};
