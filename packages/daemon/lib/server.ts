import * as bodyParser from "body-parser";
import { Application } from "express";
import * as fs from "fs";
import { WriteStream } from "fs";
import helmet from "helmet";
import morgan from "morgan";
import * as path from "path";
import * as winston from "winston";
import { RoutesV1 } from "./routes";

export default class Server {
  constructor(app: Application) {
    this.config(app);
    new RoutesV1(app);
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
