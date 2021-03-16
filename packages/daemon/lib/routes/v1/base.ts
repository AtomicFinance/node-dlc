import { Logger } from "@node-lightning/logger";
import { IArguments, IDB } from "../../utils/config";
export default abstract class BaseRoutes {
  public argv: IArguments;
  public db: IDB;
  public logger: Logger;

  constructor(argv: IArguments, db: IDB, logger: Logger) {
    this.argv = argv;
    this.db = db;
    this.logger = logger;
  }
}
