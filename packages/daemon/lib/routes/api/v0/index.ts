import { Logger } from '@node-lightning/logger';
import { Application } from 'express';
import basicAuth, { IAsyncAuthorizerOptions } from 'express-basic-auth';
import { IArguments, IDB } from '../../../utils/config';
import OrderRoutes from './order';
import { Endpoint } from '../../Endpoint';
import { Client } from '../../../client';
import ContractInfoRoutes from './contract';

export class RoutesV1 {
  public contractInfo: ContractInfoRoutes;
  public order: OrderRoutes;
  public db: IDB;
  public prefix = 'api/v0';

  constructor(
    app: Application,
    argv: IArguments,
    db: IDB,
    logger: Logger,
    client: Client,
  ) {
    this.db = db;
    this.contractInfo = new ContractInfoRoutes(argv, db, logger, client);
    this.order = new OrderRoutes(argv, db, logger, client);

    const options: IAsyncAuthorizerOptions = {
      authorizeAsync: true,
      authorizer: this.authorizer.bind(this),
    };

    app.post(
      this.getEndpoint(Endpoint.OrderOffer),
      basicAuth(options),
      this.order.postOffer.bind(this.order),
    );
  }

  private getEndpoint(endpoint: Endpoint): string {
    return `/${this.prefix}/${endpoint}`;
  }

  private async authorizer(_: string, password: string, cb) {
    console.log('password', password);
    const walletExists = await this.db.wallet.checkSeed();
    if (!walletExists) return cb('Wallet not created', false);

    const valid = validApiKey(password);
    if (!valid) return cb('Invalid API Key', false);

    try {
      const apiKey = Buffer.from(password, 'hex');
      await this.db.wallet.findSeed(apiKey);
      return cb(null, true);
    } catch (e) {
      return cb('Incorrect API Key', false);
    }
  }
}

function validApiKey(str: string): boolean {
  return str.match(/^#[a-f0-9]{64}$/i) !== null;
}
