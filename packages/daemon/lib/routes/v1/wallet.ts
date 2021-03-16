import { Logger } from "@node-lightning/logger";
import { generateMnemonic, validateMnemonic } from "bip39";
import { NextFunction, Request, Response } from "express";
import { IArguments, IDB } from "../../utils/config";
import { routeErrorHandler } from "../handler/ErrorHandler";
import BaseRoutes from "./base";

export default class WalletRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger) {
    super(argv, db, logger);
  }

  public async postCreate(req: Request, res: Response, next: NextFunction) {
    const { apikey, mnemonic: _mnemonic } = req.query;

    if (!apikey) return routeErrorHandler(this, res, 401, "Api Key Required");

    const walletExists = await this.db.wallet.checkSeed();
    if (walletExists) return routeErrorHandler(this, res, 403, "Wallet already created");

    let mnemonic: string = _mnemonic;
    if (!mnemonic) {
      this.logger.info(`Cipher seed mnemonic not provided. Generating...`);
      mnemonic = generateMnemonic(256);
    }

    if (!validateMnemonic(mnemonic)) return routeErrorHandler(this, res, 400, "Invalid Mnemonic");

    this.logger.info(`Saving cipher seed mnemonic to DB...`);
    await this.db.wallet.saveSeed(mnemonic, Buffer.from(apikey));

    res.json({ mnemonic });
  }
}
