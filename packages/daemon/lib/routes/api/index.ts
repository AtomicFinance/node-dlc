import { Logger } from '@node-lightning/logger';
import { Application } from 'express';
import basicAuth, { IAsyncAuthorizerOptions } from 'express-basic-auth';
import { sha256 } from '@node-lightning/crypto';
import { IArguments, IDB } from '../../utils/config';
import { wrapAsync, validApiKey } from '../../utils/helper';
import { Client } from '../../client';
import ContractRoutes from './contract';
import { Endpoint } from '../Endpoint';
import InfoRoutes from './getinfo';
import WalletRoutes from './wallet';
import OrderRoutes from './order';
import OracleRoutes from './oracle';
import DlcRoutes from './dlc';

export class RoutesAPI {
  public info: InfoRoutes;
  public wallet: WalletRoutes;
  public contract: ContractRoutes;
  public order: OrderRoutes;
  public oracle: OracleRoutes;
  public dlc: DlcRoutes;
  public db: IDB;
  public client: Client;
  public prefix = 'api';

  constructor(
    app: Application,
    argv: IArguments,
    db: IDB,
    logger: Logger,
    client: Client,
  ) {
    this.db = db;
    this.client = client;
    this.info = new InfoRoutes(argv, db, logger, client);
    this.wallet = new WalletRoutes(argv, db, logger, client);
    this.contract = new ContractRoutes(argv, db, logger, client);
    this.order = new OrderRoutes(argv, db, logger, client);
    this.oracle = new OracleRoutes(argv, db, logger, client);
    this.dlc = new DlcRoutes(argv, db, logger, client);

    const options: IAsyncAuthorizerOptions = {
      authorizeAsync: true,
      authorizer: this.authorizer.bind(this),
    };

    app.get(
      this.getEndpoint(Endpoint.GetInfo),
      wrapAsync(this.info.getInfo.bind(this.info)),
    );
    app.post(
      this.getEndpoint(Endpoint.WalletCreate),
      wrapAsync(this.wallet.postCreate.bind(this.wallet)),
    );
    app.get(
      this.getEndpoint(Endpoint.WalletNewAddress),
      basicAuth(options),
      wrapAsync(this.wallet.getNewAddress.bind(this.wallet)),
    );
    app.get(
      this.getEndpoint(Endpoint.WalletBalance),
      basicAuth(options),
      wrapAsync(this.wallet.getBalance.bind(this.wallet)),
    );
    app.get(
      this.getEndpoint(Endpoint.WalletUnspent),
      basicAuth(options),
      wrapAsync(this.wallet.getUnspent.bind(this.wallet)),
    );
    app.post(
      this.getEndpoint(Endpoint.WalletSendCoins),
      basicAuth(options),
      wrapAsync(this.wallet.postSendCoins.bind(this.wallet)),
    );
    app.post(
      this.getEndpoint(Endpoint.WalletSweepCoins),
      basicAuth(options),
      wrapAsync(this.wallet.postSweepCoins.bind(this.wallet)),
    );
    app.post(
      this.getEndpoint(Endpoint.WalletSendMany),
      basicAuth(options),
      wrapAsync(this.wallet.postSendMany.bind(this.wallet)),
    );
    app.post(
      this.getEndpoint(Endpoint.ContractInfo, 'decode'),
      wrapAsync(this.contract.postInfoDecode.bind(this.contract)),
    );
    app.post(
      this.getEndpoint(Endpoint.ContractInfo, 'decode'),
      wrapAsync(this.contract.postInfoDecode.bind(this.contract)),
    );
    app.post(
      this.getEndpoint(Endpoint.OrderOffer, 'decode'),
      wrapAsync(this.order.postOfferDecode.bind(this.order)),
    );
    app.post(
      this.getEndpoint(Endpoint.OrderAccept, 'decode'),
      wrapAsync(this.order.postAcceptDecode.bind(this.order)),
    );
    app.post(
      this.getEndpoint(Endpoint.DlcOffer, 'decode'),
      wrapAsync(this.dlc.postOfferDecode.bind(this.dlc)),
    );
    app.post(
      this.getEndpoint(Endpoint.DlcAccept, 'decode'),
      wrapAsync(this.dlc.postAcceptDecode.bind(this.dlc)),
    );
    app.post(
      this.getEndpoint(Endpoint.OracleAnnouncement, 'decode'),
      wrapAsync(this.oracle.postAnnouncementDecode.bind(this.oracle)),
    );
    app.post(
      this.getEndpoint(Endpoint.OracleAttestation, 'decode'),
      wrapAsync(this.oracle.postAttestationDecode.bind(this.oracle)),
    );
  }

  private getEndpoint(endpoint: Endpoint, suffix?: string): string {
    return `/${this.prefix}/${endpoint}${suffix ? `/${suffix}` : ``}`;
  }

  private async authorizer(_: string, password: string, cb) {
    const walletExists = await this.db.wallet.checkSeed();
    if (!walletExists) return cb('Wallet not created', false);

    const valid = validApiKey(password);
    if (!valid) return cb('Invalid API Key', false);

    try {
      const apiKey = Buffer.from(password, 'hex');
      const apiKeyHash = await this.db.wallet.findApiKeyHash();
      if (Buffer.compare(apiKeyHash, sha256(apiKey)) !== 0)
        throw Error('Invalid API Key');
      const mnemonic = await this.db.wallet.findSeed(apiKey);
      if (!this.client.seedSet) {
        this.client.setSeed(mnemonic);
      }
      return cb(null, true);
    } catch (e) {
      return cb('Incorrect API Key', false);
    }
  }
}
