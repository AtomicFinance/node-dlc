import {
  RocksdbDlcStore,
  RocksdbOrderStore,
  RocksdbWalletStore,
} from '@node-dlc/rocksdb';
import { ConsoleTransport, Logger, LogLevel } from '@node-lightning/logger';
import {
  Application,
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
import * as winston from 'winston';
import { RoutesAPI, RoutesV0, RoutesFinance, RoutesFallback } from './routes';
import { IArguments, IDB } from './utils/config';
import { Client } from './client';
import * as http from 'http';
import * as WebSocket from 'ws';

export default class Server {
  public routesV0: RoutesV0;
  public routesAPI: RoutesAPI;
  public routesFinance: RoutesFinance;
  public RoutesFallback: RoutesFallback;
  public client: Client;
  public app: Application;
  public argv: IArguments;
  public logger: Logger;
  public db: IDB;
  private server: http.Server;
  private wss: WebSocket;

  constructor(app: Application, argv: IArguments, logger: Logger) {
    const { datadir, network } = argv;

    this.app = app;
    this.argv = argv;
    this.logger = logger;

    this.config();
    const walletDb = new RocksdbWalletStore(`${datadir}/${network}/wallet`);
    const dlcDb = new RocksdbDlcStore(`${datadir}/${network}/dlc`);
    const orderDb = new RocksdbOrderStore(`${datadir}/${network}/order`);
    const db: IDB = { wallet: walletDb, dlc: dlcDb, order: orderDb };
    this.db = db;
    this.client = new Client(argv, db, logger);
    this.client.setAddressCache();
    this.client.chainMon();
    this.client.setIrcManager();
    this.routesAPI = new RoutesAPI(app, argv, db, logger, this.client);
    this.routesV0 = new RoutesV0(app, argv, db, logger, this.client);
    this.routesFinance = new RoutesFinance(app, argv, db, logger, this.client);
    this.RoutesFallback = new RoutesFallback(app, logger);
  }

  public config(): void {
    this.app.use(json({ limit: '50mb' }));
    this.app.use(
      urlencoded({
        extended: false,
        limit: '50mb',
      }),
    );
    this.createAccessLogStream();
    this.app.use(helmet());
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const ip =
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress;

      this.logger.info(`${req.method} ${req.url} from ${ip}`);

      res.setTimeout(480000, function () {
        // 4 minute timeout adjust for larger dlc messages
        this.logger.error('Request has timed out.');
        res.send(408);
      });

      next();
    });
  }

  public createAccessLogStream(): void {
    const { datadir, network } = this.argv;
    if (this.argv.test !== 'true') {
      if (!fs.existsSync(datadir)) fs.mkdirSync(datadir);
      if (!fs.existsSync(`${datadir}/${network}`))
        fs.mkdirSync(`${datadir}/${network}`);
      const accessLogStream: WriteStream = fs.createWriteStream(
        `${datadir}/${network}/access.log`,
        { flags: 'a' },
      );
      this.app.use(morgan('combined', { stream: accessLogStream }));
    }
  }

  public start(): void {
    this.server = http.createServer(this.app);

    this.wss = new WebSocket.Server({ server: this.server });

    this.server.listen(this.argv.port, 'localhost', () => {
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
