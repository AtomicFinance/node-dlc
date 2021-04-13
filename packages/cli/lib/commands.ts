#!/usr/bin/env node

process.title = 'dlccli';

import Config from 'bcfg';
import yargs from 'yargs';
import { parseConfig } from './utils/config';
import { IArguments, networks, logs } from './arguments';

const config = new Config('node-dlc');
config.open('node-dlc.conf'); // TODO: allow users to pass in their on conf directory

// TODO allow user to pass in api-key on startup

// const argv: IArguments =
const argv = yargs(process.argv.slice(2))
  .usage('Usage:   dlccli [options]             start DLCd')
  .scriptName('')
  .config(parseConfig(config.data))
  .commandDir('cmds/basic', { recurse: true })
  .commandDir('cmds/wallet', { recurse: true })
  .commandDir('cmds/contract', { recurse: true })
  .commandDir('cmds/order/offer', { recurse: true })
  .commandDir('cmds/order/accept', { recurse: true })
  .commandDir('cmds/dlc/offer', { recurse: true })
  .commandDir('cmds/dlc/accept', { recurse: true })
  .commandDir('cmds/dlc/sign', { recurse: true })
  .commandDir('cmds/dlc/finalize', { recurse: true })
  .commandDir('cmds/dlc/txs', { recurse: true })
  .commandDir('cmds/dlc/execute', { recurse: true })
  .commandDir('cmds/dlc/refund', { recurse: true })
  .commandDir('cmds/oracle/announcement', { recurse: true })
  .commandDir('cmds/oracle/attestation', { recurse: true })
  .options({
    p: { alias: 'port', type: 'number', default: 8575, global: true },
    n: {
      alias: 'network',
      type: 'string',
      default: 'mainnet',
      choices: networks,
      global: true,
    },
    h: { alias: 'host', type: 'string', default: '127.0.0.1', global: true },
    l: {
      alias: 'loglevel',
      type: 'string',
      default: 'info',
      choices: logs,
      global: true,
    },
    a: { alias: 'apikey', type: 'string', default: '', global: true },
  })
  .demandCommand(1)
  .check((_argv: IArguments, _) => {
    const { port } = _argv;
    if (isNaN(port)) {
      throw new Error('Port must be a number');
    }
    return true;
  }).argv;
