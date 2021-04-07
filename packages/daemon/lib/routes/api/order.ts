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
} from '@node-dlc/messaging';

export default class OrderRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async postOfferDecode(req: Request, res: Response): Promise<Response> {
    const { orderoffer } = req.query;

    if (!orderoffer)
      return routeErrorHandler(this, res, 401, 'No Contract Info Provided');

    if (!(typeof orderoffer === 'string'))
      return routeErrorHandler(this, res, 400, 'Invalid Contract Info');

    const orderOffer = OrderOffer.deserialize(
      Buffer.from(orderoffer as string, 'hex'),
    );

    switch (orderOffer.type) {
      case MessageType.OrderOfferV0:
        return res.json((orderOffer as ContractInfoV0).toJSON());
      default:
        return routeErrorHandler(
          this,
          res,
          401,
          'Only OrderOfferV1 Decoding Supported',
        );
    }
  }
}
