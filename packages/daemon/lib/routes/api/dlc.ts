import { Logger } from '@node-lightning/logger';
import { Request, Response } from 'express';
import { IArguments, IDB } from '../../utils/config';
import { longVal } from '../handler/ErrorHandler';
import BaseRoutes from '../base';
import { Client } from '../../client';
import { DlcOfferV0, DlcAcceptV0, DlcSignV0 } from '@node-dlc/messaging';
import { validateType } from '../validate/ValidateFields';

export default class DlcRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async postOfferDecode(req: Request, res: Response): Promise<Response> {
    const { dlcoffer } = req.body;
    this.logger.info(`Decode DlcOffer: ${longVal(dlcoffer)}`);

    validateType(dlcoffer, 'DlcOffer', DlcOfferV0, this, res);
    const dlcOffer = DlcOfferV0.deserialize(
      Buffer.from(dlcoffer as string, 'hex'),
    );

    return res.json(dlcOffer.toJSON());
  }

  public async postAcceptDecode(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const { dlcaccept } = req.body;
    this.logger.info(`Decode DlcAccept: ${longVal(dlcaccept)}`);

    validateType(dlcaccept, 'DlcAccept', DlcAcceptV0, this, res);
    const dlcAccept = DlcAcceptV0.deserialize(
      Buffer.from(dlcaccept as string, 'hex'),
    );

    return res.json(dlcAccept.toJSON());
  }

  public async postSignDecode(req: Request, res: Response): Promise<Response> {
    const { dlcsign } = req.body;
    this.logger.info(`Decode DlcSign: ${longVal(dlcsign)}`);

    validateType(dlcsign, 'DlcSign', DlcSignV0, this, res);
    const dlcSign = DlcSignV0.deserialize(
      Buffer.from(dlcsign as string, 'hex'),
    );

    return res.json(dlcSign.toJSON());
  }
}
