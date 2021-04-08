import { RocksdbDlcStore, RocksdbWalletStore } from '@node-dlc/rocksdb';
import { ConsoleTransport, Logger, LogLevel } from '@node-lightning/logger';
import * as bodyParser from 'body-parser';
import { Application, ErrorRequestHandler } from 'express';
import * as fs from 'fs';
import { WriteStream } from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import * as path from 'path';
import * as winston from 'winston';
import { RoutesAPI, RoutesV1, RoutesFallback } from './routes';
import { IArguments, IDB } from './utils/config';
import { Client } from './client';

export default class Server {
  public routesV1: RoutesV1;
  public routesAPI: RoutesAPI;
  public RoutesFallback: RoutesFallback;
  public client: Client;
  constructor(app: Application, argv: IArguments, logger: Logger) {
    const { datadir, network } = argv;

    this.config(app, argv);
    const walletDb = new RocksdbWalletStore(`${datadir}/${network}/wallet`);
    const dlcDb = new RocksdbDlcStore(`${datadir}/${network}/dlc`);
    const db: IDB = { wallet: walletDb, dlc: dlcDb };
    this.client = new Client(argv, db, logger);
    this.routesAPI = new RoutesAPI(app, argv, db, logger, this.client);
    this.routesV1 = new RoutesV1(app, argv, db, logger, this.client);
    this.RoutesFallback = new RoutesFallback(app, logger);
  }

  public config(app: Application, argv: IArguments): void {
    const { datadir, network } = argv;
    const accessLogStream: WriteStream = fs.createWriteStream(
      `${datadir}/${network}/access.log`,
      { flags: 'a' },
    );
    app.use(morgan('combined', { stream: accessLogStream }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(helmet());
  }
}

process.on('beforeExit', (err) => {
  const logger = new Logger('DLCd');
  logger.transports.push(new ConsoleTransport(console));
  logger.level = LogLevel.Debug;

  winston.error(JSON.stringify(err));
  logger.error(err);
});

function wrapAsync(fn) {
  return function (req, res, next) {
    // Make sure to `.catch()` any errors and pass them along to the `next()`
    // middleware in the chain, in this case the error handler.
    fn(req, res, next).catch(next);
  };
}
