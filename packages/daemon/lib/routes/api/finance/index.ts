import { Logger } from '@node-lightning/logger';
import { Application, Request } from 'express';
import basicAuth, { IAsyncAuthorizerOptions } from 'express-basic-auth';
import { sha256 } from '@node-lightning/crypto';
import { IArguments, IDB } from '../../../utils/config';
import { wrapAsync, validApiKey } from '../../../utils/helper';
import { Endpoint } from '../../Endpoint';
import { Client } from '../../../client';
import OptionRoutes from './option';

export class RoutesFinance {
  public option: OptionRoutes;
  public db: IDB;
  public client: Client;
  public prefix = 'api/finance';

  constructor(
    app: Application,
    argv: IArguments,
    db: IDB,
    logger: Logger,
    client: Client,
  ) {
    this.db = db;
    this.client = client;
    this.option = new OptionRoutes(argv, db, logger, client);

    const options: IAsyncAuthorizerOptions = {
      authorizeAsync: true,
      authorizer: this.authorizer.bind(this),
      unauthorizedResponse: (req: Request) => {
        const ip =
          req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress;

        return `Unauthorized: Incorect API Key. IP ${ip}`;
      },
    };

    app.post(
      this.getEndpoint(Endpoint.OptionContractInfo, 'decode'),
      basicAuth(options),
      wrapAsync(this.option.postContractInfoDecodeOptionInfo.bind(this.option)),
    );
    app.post(
      this.getEndpoint(Endpoint.OptionOffer, 'decode'),
      basicAuth(options),
      wrapAsync(this.option.postOfferDecodeOptionInfo.bind(this.option)),
    );
  }

  private getEndpoint(endpoint: Endpoint, suffix?: string): string {
    return `/${this.prefix}/${endpoint}${suffix ? `/${suffix}` : ``}`;
  }

  private async authorizer(_: string, password: string, cb) {
    const walletExists = await this.db.wallet.checkSeed();
    if (!walletExists) return cb(new Error('Wallet not created'), false);

    const valid = validApiKey(password);
    if (!valid) return cb(new Error('Invalid API Key'), false);

    try {
      const apiKey = Buffer.from(password, 'hex');
      const apiKeyHash = await this.db.wallet.findApiKeyHash();
      if (Buffer.compare(apiKeyHash, sha256(apiKey)) !== 0)
        return cb(new Error('Incorrect API Key'), false);
      const mnemonic = await this.db.wallet.findSeed(apiKey);
      if (!this.client.seedSet) {
        this.client.setSeed(mnemonic);
      }
      return cb(null, true);
    } catch (e) {
      return cb(new Error('Incorrect API Key'), false);
    }
  }
}
