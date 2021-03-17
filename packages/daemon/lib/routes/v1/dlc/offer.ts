import { Logger } from '@node-lightning/logger';
import { NextFunction, Request, Response } from 'express';
import { IArguments, IDB } from '../../../utils/config';
import { routeErrorHandler } from '../../handler/ErrorHandler';
import BaseRoutes from '../base';

export default class DlcOfferRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger) {
    super(argv, db, logger);
  }

  public async getOffers(req: Request, res: Response, next: NextFunction) {
    const { apikey } = req.query;

    if (!apikey) return routeErrorHandler(this, res, 401, 'Api Key Required');

    const dlcOffers = await this.db.dlc.findDlcOffers();

    return res.json({
      offers: dlcOffers,
    });
  }
}
