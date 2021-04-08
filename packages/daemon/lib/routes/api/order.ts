import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { NextFunction, Request, Response } from 'express';
import { IArguments, IDB } from '../../utils/config';
import { routeErrorHandler } from '../handler/ErrorHandler';
import BaseRoutes from '../base';
import { Client } from '../../client';
import {
  OrderOffer,
  OrderOfferV0,
  ContractInfo,
  ContractInfoV0,
  MessageType,
  OrderAccept,
  OrderAcceptV0,
} from '@node-dlc/messaging';

export default class OrderRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async postOfferDecode(req: Request, res: Response): Promise<Response> {
    const { orderoffer } = req.query;

    if (!orderoffer)
      return routeErrorHandler(
        this,
        res,
        401,
        `No ${OrderOffer.name} Provided`,
      );

    if (!(typeof orderoffer === 'string'))
      return routeErrorHandler(this, res, 400, `Invalid ${OrderOffer.name}`);

    const orderOffer = OrderOffer.deserialize(
      Buffer.from(orderoffer as string, 'hex'),
    );

    switch (orderOffer.type) {
      case MessageType.OrderOfferV0:
        return res.json((orderOffer as OrderOfferV0).toJSON());
      default:
        return routeErrorHandler(
          this,
          res,
          401,
          `Only ${OrderOfferV0.name} Decoding Supported`,
        );
    }
  }

  public async postAcceptDecode(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const { orderaccept } = req.query;

    if (!orderaccept)
      return routeErrorHandler(
        this,
        res,
        401,
        `No ${OrderAccept.name} Provided`,
      );

    if (!(typeof orderaccept === 'string'))
      return routeErrorHandler(this, res, 400, `Invalid ${OrderAccept.name}`);

    const orderAccept = OrderAccept.deserialize(
      Buffer.from(orderaccept as string, 'hex'),
    );

    switch (orderAccept.type) {
      case MessageType.OrderAcceptV0:
        return res.json((orderAccept as OrderAcceptV0).toJSON());
      default:
        return routeErrorHandler(
          this,
          res,
          401,
          `Only ${OrderAcceptV0.name} Decoding Supported`,
        );
    }
  }
}
