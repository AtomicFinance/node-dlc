#!/usr/bin/env node

process.title = "dlcd";

import yargs from 'yargs/yargs';
import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import { Application } from "express";
import { ConsoleTransport, Logger, LogLevel } from "@node-lightning/logger";
import Server from "./server";
import { parseConfig, Arguments } from "./utils/config"

const Path = require('path');
const os = require('os');
const HOME = os.homedir ? os.homedir() : '/';

const Config = require('bcfg');

const config = new Config('node-dlc');
config.open('node-dlc.conf'); // TODO: allow users to pass in their on conf directory

type Network = 'mainnet' | 'testnet' | 'regtest'
const networks: ReadonlyArray<Network> = ['mainnet', 'testnet', 'regtest']

const defaultDatadir = Path.join(HOME, `.node-dlc`)

const argv: Arguments = yargs(process.argv.slice(2))
  .usage('Usage:   dlcd [options]             start DLCd')
  .scriptName('dlcd')
  .config(parseConfig(config.data))
  .options({
    p: { alias: 'port', type: 'number', default: 8575, global: true },
    n: { alias: 'network', type: 'string', default: 'mainnet', choices: networks, global: true },
    h: { alias: 'host', type: 'string', default: '127.0.0.1', global: true },
    d: { alias: 'datadir', type: 'string', default: defaultDatadir, global: true },
    c: { alias: 'conf', type: 'string', default: 'node-dlc.conf', global: true }
  })
  .check((argv, _) => {
    const { p } = argv
    if (isNaN(p)) {
      throw new Error('Port must be a number')
    }
    return true
  })
  .argv;

const logger = new Logger("DLCd");
logger.transports.push(new ConsoleTransport(console));
logger.level = LogLevel.Debug;

const app: Application = express();
const server: Server = new Server(app, argv, logger);

logger.info("DLC Daemon version v0.1.0")
logger.info(`Starting server on http://localhost:${argv.port}`)
logger.info(`Default data directory ${defaultDatadir}`)
logger.info(`Using data directory ${argv.datadir}/${argv.network}`)

for (const key of Object.keys(argv)) {
  if (key.length > 1 && key !== '$0') {
    logger.info(`Command-line arg: ${key}="${argv[key]}"`)
  }
}

async function setup() {
  app.listen(argv.port, "localhost", function(err: any) {
    if (err) return err;
    logger.info(`Server running on http://localhost:${argv.port}`)
  });
}

setup()
  .then(() => {
    process.stdin.resume()
  })
  .catch(err => {
    logger.error(err)
    process.exit(1)
  })
