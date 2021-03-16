import { RocksdbDlcStore, RocksdbWalletStore } from '@node-dlc/rocksdb';
import { ConsoleTransport, Logger, LogLevel } from '@node-lightning/logger';
import * as bodyParser from 'body-parser';
import { Application } from 'express';
import * as fs from 'fs';
import { WriteStream } from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import * as path from 'path';
import * as winston from 'winston';
import { RoutesV1 } from './routes';
import { IArguments, IDB } from './utils/config';

export default class Server {
  public routesV1: RoutesV1;
  constructor(app: Application, argv: IArguments, logger: Logger) {
    const { datadir, network } = argv;

    this.config(app, argv);
    const walletDb = new RocksdbWalletStore(`${datadir}/${network}/wallet`);
    const dlcDb = new RocksdbDlcStore(`${datadir}/${network}/dlc`);
    const db: IDB = { wallet: walletDb, dlc: dlcDb };
    this.routesV1 = new RoutesV1(app, argv, db, logger);
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
