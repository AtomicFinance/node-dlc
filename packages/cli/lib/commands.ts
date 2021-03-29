#!/usr/bin/env node

process.title = 'dlccli';

import Config from 'bcfg';
import yargs from 'yargs';
import { parseConfig } from './utils/config';
import { IArguments, networks, logs } from './arguments';

const config = new Config('node-dlc');
config.open('node-dlc.conf'); // TODO: allow users to pass in their on conf directory

// TODO allow user to pass in api-key on startup

const argv: IArguments = yargs(process.argv.slice(2))
  .usage('Usage:   dlccli [options]             start DLCd')
  .scriptName('dlccli')
  .config(parseConfig(config.data))
  .commandDir('cmds', { recurse: true })
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
  })
  .check((_argv: IArguments, _) => {
    const { port } = _argv;
    if (isNaN(port)) {
      throw new Error('Port must be a number');
    }
    return true;
  }).argv;
