import { Logger } from '@node-lightning/logger';
import { Application } from 'express';
import basicAuth, { IAsyncAuthorizerOptions } from 'express-basic-auth';
import { IArguments, IDB } from '../../utils/config';
import { Client } from '../../client';
import ContractRoutes from './contract';
import { Endpoint } from '../Endpoint';
import InfoRoutes from './getinfo';
import WalletRoutes from './wallet';

export class RoutesAPI {
  public info: InfoRoutes;
  public wallet: WalletRoutes;
  public contract: ContractRoutes;
  public db: IDB;
  public prefix = 'api';

  constructor(
    app: Application,
    argv: IArguments,
    db: IDB,
    logger: Logger,
    client: Client,
  ) {
    this.db = db;
    this.info = new InfoRoutes(argv, db, logger, client);
    this.wallet = new WalletRoutes(argv, db, logger, client);
    this.contract = new ContractRoutes(argv, db, logger, client);

    app.get(
      this.getEndpoint(Endpoint.GetInfo),
      this.info.getInfo.bind(this.info),
    );
    app.post(
      this.getEndpoint(Endpoint.WalletCreate),
      this.wallet.postCreate.bind(this.wallet),
    );
    app.post(
      this.getEndpoint(Endpoint.ContractInfo, 'decode'),
      this.contract.postInfoDecode.bind(this.contract),
    );
  }

  private getEndpoint(endpoint: Endpoint, suffix?: string): string {
    return `/${this.prefix}/${endpoint}${suffix ? `/${suffix}` : ``}`;
  }
}
