import fs from 'fs';
import path from 'path';
import { Network, ConfLogLevel, IArguments } from '../lib/utils/config';
import bcrypto from 'bcrypto';

/**
 * Recursively removes a directory and all files that
 * are contained within the directory.
 */
export function rmdir(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.lstatSync(filepath).isDirectory()) rmdir(filepath);
    else fs.unlinkSync(filepath);
  }
  fs.rmdirSync(dir);
}

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
export const loglevel: ConfLogLevel = 'debug';
export const port = 8475;

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
