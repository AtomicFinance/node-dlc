import { RocksdbDlcStore, RocksdbWalletStore } from '@node-dlc/rocksdb';
import { ConsoleTransport, Logger, LogLevel } from '@node-lightning/logger';
import * as bodyParser from 'body-parser';
import {
  Application,
  ErrorRequestHandler,
  urlencoded,
  json,
  Request,
  Response,
  NextFunction,
} from 'express';
import * as fs from 'fs';
import { WriteStream } from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import * as path from 'path';
import * as core from 'express-serve-static-core';
import * as winston from 'winston';
import { RoutesAPI, RoutesV1, RoutesFallback } from './routes';
import { IArguments, IDB } from './utils/config';
import { Client } from './client';
import * as http from 'http';

export default class Server {
  public routesV1: RoutesV1;
  public routesAPI: RoutesAPI;
  public RoutesFallback: RoutesFallback;
  public client: Client;
  public app: Application;
  public argv: IArguments;
  public logger: Logger;
  private server: http.Server;

  constructor(app: Application, argv: IArguments, logger: Logger) {
    const { datadir, network } = argv;

    this.config(app, argv, logger);
    const walletDb = new RocksdbWalletStore(`${datadir}/${network}/wallet`);
    const dlcDb = new RocksdbDlcStore(`${datadir}/${network}/dlc`);
    const db: IDB = { wallet: walletDb, dlc: dlcDb };
    this.client = new Client(argv, db, logger);
    this.client.setAddressCache();
    this.app = app;
    this.argv = argv;
    this.logger = logger;
    this.routesAPI = new RoutesAPI(app, argv, db, logger, this.client);
    this.routesV1 = new RoutesV1(app, argv, db, logger, this.client);
    this.RoutesFallback = new RoutesFallback(app, logger);
  }

  public config(app: Application, argv: IArguments, logger: Logger): void {
    const { datadir, network } = argv;
    app.use(json({ limit: '50mb' }));
    app.use(
      urlencoded({
        extended: false,
        limit: '50mb',
      }),
    );
    if (argv.test !== 'true') {
      const accessLogStream: WriteStream = fs.createWriteStream(
        `${datadir}/${network}/access.log`,
        { flags: 'a' },
      );
      app.use(morgan('combined', { stream: accessLogStream }));
    }
    app.use(helmet());
    app.use(function (req: Request, res: Response, next: NextFunction) {
      const ip =
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress;

      logger.info(`${req.method} ${req.url} from ${ip}`);

      res.setTimeout(480000, function () {
        // 4 minute timeout adjust for larger uploads
        console.log('Request has timed out.');
        res.send(408);
      });

      next();
    });
  }

  public start(): void {
    this.server = this.app.listen(this.argv.port, 'localhost', () => {
      this.logger.info(`Server running on http://localhost:${this.argv.port}`);
    });
  }

  public stop(): void {
    this.server.close();
  }
}

process.on('beforeExit', (err) => {
  const logger = new Logger('DLCd');
  logger.transports.push(new ConsoleTransport(console));
  logger.level = LogLevel.Debug;

  winston.error(JSON.stringify(err));
  logger.error(err);
});
