#!/usr/bin/env node

process.title = "dlcd";

import yargs = require('yargs/yargs');
import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import { Application } from "express";
import { ConsoleTransport, Logger, LogLevel } from "@node-lightning/logger";
import Server from "./server";

type Network = 'mainnet' | 'testnet' | 'regtest'
const networks: ReadonlyArray<Network> = ['mainnet', 'testnet', 'regtest']

const argv: Arguments = yargs(process.argv.slice(2))
  .usage('Usage:   dlcd [options]             start DLCd')
  .options({
    p: { alias: 'port', type: 'number', default: 8575 },
    n: { alias: 'network', type: 'string', choices: networks, default: 'mainnet' },
    d: { alias: 'daemon', type: 'boolean', default: false }
  }).argv;

console.log('argv', argv)

const app: Application = express();
const server: Server = new Server(app);

const logger = new Logger("DLCd");
logger.transports.push(new ConsoleTransport(console));
logger.level = LogLevel.Debug;

logger.info("DLC Daemon version v0.1.0")

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

interface Arguments {
  [x: string]: unknown;
  p: number;
  n: string;
  d: boolean;
}
