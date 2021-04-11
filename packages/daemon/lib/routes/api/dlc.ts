import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { NextFunction, Request, Response } from 'express';
import { IArguments, IDB } from '../../utils/config';
import { routeErrorHandler } from '../handler/ErrorHandler';
import BaseRoutes from '../base';
import { Client } from '../../client';
import {
  MessageType,
  DlcOffer,
  DlcOfferV0,
  DlcAccept,
  DlcAcceptV0,
} from '@node-dlc/messaging';

export default class DlcRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async postOfferDecode(req: Request, res: Response): Promise<Response> {
    const { dlcoffer } = req.body;

    if (!dlcoffer)
      return routeErrorHandler(this, res, 401, `No ${DlcOffer.name} Provided`);

    if (!(typeof dlcoffer === 'string'))
      return routeErrorHandler(this, res, 400, `Invalid ${DlcOffer.name}`);

    const dlcOffer = DlcOffer.deserialize(
      Buffer.from(dlcoffer as string, 'hex'),
    );

    switch (dlcOffer.type) {
      case MessageType.DlcOfferV0:
        return res.json((dlcOffer as DlcOfferV0).toJSON());
      default:
        return routeErrorHandler(
          this,
          res,
          401,
          `Only ${DlcOfferV0.name} Decoding Supported`,
        );
    }
  }

  // public async postAcceptDecode(
  //   req: Request,
  //   res: Response,
  // ): Promise<Response> {
  //   const { dlcaccept } = req.query;

  //   if (!dlcaccept)
  //     return routeErrorHandler(this, res, 401, `No ${DlcAccept.name} Provided`);

  //   if (!(typeof dlcaccept === 'string'))
  //     return routeErrorHandler(this, res, 400, `Invalid ${DlcAccept.name}`);

  //   const dlcAccept = DlcAccept.deserialize(
  //     Buffer.from(dlcaccept as string, 'hex'),
  //   );

  //   switch (dlcAccept.type) {
  //     case MessageType.DlcAcceptV0:
  //       return res.json((dlcAccept as DlcAcceptV0).toJSON());
  //     default:
  //       return routeErrorHandler(
  //         this,
  //         res,
  //         401,
  //         `Only ${DlcAcceptV0.name} Decoding Supported`,
  //       );
  //   }
  // }
}
