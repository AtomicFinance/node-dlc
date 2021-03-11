import { Router, Request, Response, NextFunction } from 'express';
// import CourseRepo from './../repositories/CoursesRepo';
// import { apiErrorHandler } from './../handlers/errorHandler';

import { generateMnemonic } from 'bip39'
import { routeErrorHandler } from '../handler/ErrorHandler'
import { Arguments, DB } from '../../utils/config'
import { Logger } from "@node-lightning/logger";
import BaseRoutes from "./base"

export default class WalletRoutes extends BaseRoutes {
  constructor(argv: Arguments, db: DB, logger: Logger) {
    super(argv, db, logger);
  }

  async postCreate(req: Request, res: Response, next: NextFunction) {
    const { apiKey, mnemonic: mnemonic_ } = req.query

    if (!apiKey) return routeErrorHandler(this, res, 400, 'Api Key Required')

    const walletExists = await this.db.wallet.checkSeed()
    if (walletExists) return routeErrorHandler(this, res, 403, 'Wallet already created')

    let mnemonic: string = mnemonic_;
    if (!mnemonic) {
      this.logger.info(`Cipher seed mnemonic not provided. Generating...`)
      mnemonic = generateMnemonic(256)
    }

    // TODO: validate mnemonic

    this.logger.info(`Saving cipher seed mnemonic to DB...`)
    await this.db.wallet.saveSeed(mnemonic, Buffer.from(apiKey))

    res.json({ mnemonic })
  }
}
