#!/usr/bin/env node

process.title = 'dlcd';

import * as dotenv from 'dotenv';
import yargs from 'yargs/yargs';
dotenv.config();
import { ConsoleTransport, Logger } from '@node-lightning/logger';
import { IrcServers } from '@node-dlc/transport';
import Config from 'bcfg';
import express from 'express';
import { Application } from 'express';
import * as os from 'os';
import * as Path from 'path';
import Server from './server';
import {
  IArguments,
  parseConfig,
  networks,
  loglevels,
  confToLogLevel,
} from './utils/config';
import { version } from '../package.json';

const HOME = os.homedir ? os.homedir() : '/';

const config = new Config('node-dlc');
config.open('node-dlc.conf'); // TODO: allow users to pass in their on conf directory

const defaultDatadir = Path.join(HOME, `.node-dlc`);

export const argv: IArguments = yargs(process.argv.slice(2))
  .usage('Usage:   dlcd [options]             start DLCd')
  .scriptName('dlcd')
  .config(parseConfig(config.data))
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
    d: {
      alias: 'datadir',
      type: 'string',
      default: defaultDatadir,
      global: true,
    },
    c: {
      alias: 'conf',
      type: 'string',
      default: 'node-dlc.conf',
      global: true,
    },
    l: {
      alias: 'loglevel',
      type: 'string',
      default: 'debug',
      choices: loglevels,
      global: true,
    },
    rpcuser: {
      type: 'string',
      default: 'bitcoin',
      global: true,
    },
    rpcpass: {
      type: 'string',
      default: 'local321',
      global: true,
    },
    rpchost: {
      type: 'string',
      default: '127.0.0.1',
      global: true,
    },
    rpcport: {
      type: 'string',
      default: '8332',
      global: true,
    },
    electrsapi: {
      type: 'string',
      default: '',
      global: true,
    },
    electrsbatchapi: {
      type: 'string',
      default: '',
      global: true,
    },
    zmqpubrawtx: {
      type: 'string',
      default: 'tcp://127.0.0.1:28332',
      global: true,
    },
    zmqpubrawblock: {
      type: 'string',
      default: 'tcp://127.0.0.1:28332',
      global: true,
    },
    zmqsub: {
      type: 'string',
      default: 'tcp://127.0.0.1:28575',
      global: true,
    },
    ircenabled: {
      type: 'string',
      default: 'true',
      global: true,
    },
    ircserverprimary: {
      type: 'string',
      default: IrcServers.primary_server.host,
      global: true,
    },
    ircserversecondary: {
      type: 'string',
      default: IrcServers.secondary_server.host,
      global: true,
    },
    ircservertertiary: {
      type: 'string',
      default: IrcServers.tertiary_server.host,
      global: true,
    },
    ircdebug: {
      type: 'string',
      default: 'false',
      global: true,
    },
    ircport: {
      type: 'string',
      default: '6697',
      global: true,
    },
  })
  .check((_argv, _) => {
    const { p } = _argv;
    if (isNaN(p)) {
      throw new Error('Port must be a number');
    }
    return true;
  }).argv;

const logger = new Logger('DLCd');
logger.transports.push(new ConsoleTransport(console));
logger.level = confToLogLevel(argv.loglevel);

const app: Application = express();
const server: Server = new Server(app, argv, logger);

logger.info(`DLC Daemon version v${version}`);
logger.info(`Starting server on http://localhost:${argv.port}`);
logger.info(`Default data directory ${defaultDatadir}`);
logger.info(`Using data directory ${argv.datadir}/${argv.network}`);

for (const key of Object.keys(argv)) {
  if (key.length > 1 && key !== '$0') {
    logger.info(`Command-line arg: ${key}="${argv[key]}"`);
  }
}

server.start();
