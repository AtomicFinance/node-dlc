import { Logger } from '@node-lightning/logger';
import { IArguments, IDB } from '../utils/config';
import { Client } from '../client';
export default abstract class BaseRoutes {
  public argv: IArguments;
  public db: IDB;
  public logger: Logger;
  public client: Client;

  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    this.argv = argv;
    this.db = db;
    this.logger = logger;
    this.client = client;
  }
}
