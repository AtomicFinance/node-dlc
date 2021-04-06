import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { NextFunction, Request, Response } from 'express';
import { IArguments, IDB } from '../../utils/config';
import { routeErrorHandler } from '../handler/ErrorHandler';
import BaseRoutes from '../base';
import { Client } from '../../client';

export default class WalletRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async postCreate(req: Request, res: Response, next: NextFunction) {
    let apikey: string;
    if (req.headers.authorization) {
      apikey = Buffer.from(req.headers.authorization.split(' ')[1], 'base64')
        .toString()
        .split(':')[1];
    }
    const { mnemonic: _mnemonic } = req.query;

    if (!apikey) return routeErrorHandler(this, res, 401, 'Api Key Required');

    const walletExists = await this.db.wallet.checkSeed();
    if (walletExists)
      return routeErrorHandler(this, res, 403, 'Wallet already created');

    let mnemonic: string;
    if (!mnemonic) {
      this.logger.info(`Cipher seed mnemonic not provided. Generating...`);
      mnemonic = generateMnemonic(256);
    } else if (typeof _mnemonic === 'string') {
      mnemonic = _mnemonic;
    }

    if (!validateMnemonic(mnemonic))
      return routeErrorHandler(this, res, 400, 'Invalid Mnemonic');

    console.log(`Buffer.from(apikey, 'hex')`, Buffer.from(apikey, 'hex'));

    this.logger.info(`Saving cipher seed mnemonic to DB...`);
    await this.db.wallet.saveSeed(mnemonic, Buffer.from(apikey, 'hex'));

    res.json({ mnemonic });
  }
}
