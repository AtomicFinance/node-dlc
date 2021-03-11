#!/usr/bin/env node

process.title = "dlccli";

import yargs from 'yargs/yargs';
import { parseConfig } from "./utils/config"

const Config = require('bcfg');

const config = new Config('node-dlc');
config.open('node-dlc.conf'); // TODO: allow users to pass in their on conf directory

type Network = 'mainnet' | 'testnet' | 'regtest';
const networks: ReadonlyArray<Network> = ['mainnet', 'testnet', 'regtest'];

const argv: Arguments = yargs(process.argv.slice(2))
  .usage('Usage:   dlccli [options]             start DLCd')
  .scriptName('dlccli')
  .config(parseConfig(config.data))
  .commandDir('cmds', { recurse: true })
  // .updateStrings({
  //   'Commands:': 'My Commands -->\n'
  // })
  .options({
    p: { alias: 'port', type: 'number', default: 8575, global: true },
    n: { alias: 'network', type: 'string', default: 'mainnet', choices: networks, global: true },
    h: { alias: 'host', type: 'string', default: '127.0.0.1', global: true }
  })
  // .wrap(null)
  // .strict()
  .check((argv, _) => {
    const { port } = argv
    if (isNaN(port)) {
      throw new Error('Port must be a number')
    }
    return true
  })
  .argv;

interface Arguments {
  [x: string]: unknown;
  apiKey: string;
  network: Network;
  port: number;
}