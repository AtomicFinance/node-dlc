import * as bodyParser from "body-parser";
import { Application } from "express";
import * as fs from "fs";
import { WriteStream } from "fs";
import helmet from "helmet";
import morgan from "morgan";
import * as path from "path";
import * as winston from "winston";
import { RoutesV1 } from "./routes";
import { Arguments, DB } from './utils/config'
import { RocksdbWalletStore } from "@node-dlc/rocksdb";
import { ConsoleTransport, Logger, LogLevel } from "@node-lightning/logger";

export default class Server {
  constructor(app: Application, argv: Arguments, logger: Logger) {
    const { datadir, network } = argv

    this.config(app);
    const walletDb = new RocksdbWalletStore(`${datadir}/${network}/wallet`);
    const db: DB = { wallet: walletDb }
    new RoutesV1(app, argv, db, logger);
  }

  public config(app: Application): void {
    const accessLogStream: WriteStream = fs.createWriteStream(
      path.join(__dirname, "../../../logs/access.log"), // TODO move log to daemon directory
      { flags: "a" }
    );
    app.use(morgan("combined", { stream: accessLogStream }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(helmet());
  }
}

process.on("beforeExit", function(err) {
  winston.error(JSON.stringify(err));
  console.error(err);
});
