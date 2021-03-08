import { Application } from "express";
import * as bodyParser from "body-parser";
import morgan from "morgan";
import * as fs from "fs";
import { WriteStream } from "fs";
import * as path from "path";
import helmet from "helmet";
import * as winston from "winston";

export default class Server {
  constructor(app: Application) {
    this.config(app);
  }

  public config(app: Application): void {
    const accessLogStream: WriteStream = fs.createWriteStream(
      path.join(__dirname, "../../../logs/access.log"),
      { flags: "a" }
    );
    app.use(morgan("combined", { stream: accessLogStream }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(helmet());
  }
}

process.on("beforeExit", function (err) {
  winston.error(JSON.stringify(err));
  console.error(err);
});
