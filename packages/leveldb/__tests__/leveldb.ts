import fs from 'fs';
import path from 'path';

import {
  LeveldbDlcStore,
  LeveldbGossipStore,
  LeveldbInfoStore,
  LeveldbIrcStore,
  LeveldbOracleStore,
  LeveldbOrderStore,
  LeveldbWalletStore,
} from '../lib';

/**
 * Recursively deletes a directory
 * @param dir path to directory
 */
export function cleanDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach((file) => {
      const curPath = path.join(dir, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        cleanDir(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dir);
  }
}

export const dlcStore = new LeveldbDlcStore('./tmp-leveldb');
export const gossipStore = new LeveldbGossipStore('./tmp-leveldb');
export const infoStore = new LeveldbInfoStore('./tmp-leveldb');
export const ircStore = new LeveldbIrcStore('./tmp-leveldb');
export const oracleStore = new LeveldbOracleStore('./tmp-leveldb');
export const orderStore = new LeveldbOrderStore('./tmp-leveldb');
export const walletStore = new LeveldbWalletStore('./tmp-leveldb');

// Alias for backward compatibility
export const rmdir = cleanDir;

export {
  LeveldbDlcStore,
  LeveldbGossipStore,
  LeveldbInfoStore,
  LeveldbIrcStore,
  LeveldbOracleStore,
  LeveldbOrderStore,
  LeveldbWalletStore,
};
