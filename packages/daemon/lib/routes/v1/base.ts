import { Arguments, DB } from '../../utils/config'
import { Logger } from "@node-lightning/logger";
export default abstract class BaseRoutes {
  argv: Arguments;
  db: DB;
  logger: Logger

  constructor(argv: Arguments, db: DB, logger: Logger) {
    this.argv = argv;
    this.db = db;
    this.logger = logger;
  }
}
