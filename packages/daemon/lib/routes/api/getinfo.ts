import { Logger } from '@node-lightning/logger';
import { NextFunction, Request, Response } from 'express';
import { version } from '../../../package.json';
import { IArguments, IDB } from '../../utils/config';
import BaseRoutes from '../base';
import { Client } from '../../client';

export default class InfoRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async getInfo(req: Request, res: Response, next: NextFunction) {
    const dlcOffers = await this.db.dlc.findDlcOffers();
    const dlcAccepts = await this.db.dlc.findDlcAccepts();
    const dlcSigns = await this.db.dlc.findDlcSigns();

    /**
     * TODO:
     * - check if testnet
     * - block height
     */

    return res.json({
      version,
      num_dlc_offers: dlcOffers.length,
      num_dlc_accepts: dlcAccepts.length,
      num_dlc_signs: dlcSigns.length,
    });
  }
}
