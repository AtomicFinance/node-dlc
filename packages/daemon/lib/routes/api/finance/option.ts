import { Logger } from '@node-lightning/logger';
import { Request, Response } from 'express';
import { IArguments, IDB } from '../../../utils/config';
import { longVal, routeErrorHandler } from '../../handler/ErrorHandler';
import BaseRoutes from '../../base';
import { Client } from '../../../client';
import { OrderOfferV0, ContractInfo, DlcOfferV0 } from '@node-dlc/messaging';
import {
  getOptionInfoFromContractInfo,
  getOptionInfoFromOffer,
} from '@node-dlc/core';
import { validateType } from '../../validate/ValidateFields';

export default class OptionRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async postContractInfoDecodeOptionInfo(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const { contractinfo } = req.body;
    this.logger.info(
      `Decode ContractInfo to OptionInfo: ${longVal(contractinfo)}`,
    );

    validateType(contractinfo, 'Contract Info', ContractInfo, this, res);
    const contractInfo = ContractInfo.deserialize(
      Buffer.from(contractinfo as string, 'hex'),
    );

    const optionInfo = getOptionInfoFromContractInfo(contractInfo);

    return res.json({
      contractsize: Number(optionInfo.contractSize),
      strikeprice: Number(optionInfo.strikePrice),
      expiry: Math.floor(optionInfo.expiry.getTime() / 1000),
    });
  }

  public async postOfferDecodeOptionInfo(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const { orderoffer, dlcoffer } = req.body;
    this.logger.info(
      `Decode Offer to OptionInfo: ${longVal(
        orderoffer ? orderoffer : dlcoffer,
      )}`,
    );

    if (orderoffer) {
      validateType(orderoffer, 'Order Offer', OrderOfferV0, this, res);
      const orderOffer = OrderOfferV0.deserialize(
        Buffer.from(orderoffer as string, 'hex'),
      );

      const optionInfo = getOptionInfoFromOffer(orderOffer);

      return res.json({
        contractsize: Number(optionInfo.contractSize),
        strikeprice: Number(optionInfo.strikePrice),
        premium: Number(optionInfo.premium),
        expiry: Math.floor(optionInfo.expiry.getTime() / 1000),
      });
    } else if (dlcoffer) {
      validateType(dlcoffer, 'Dlc Offer', DlcOfferV0, this, res);
      const dlcOffer = DlcOfferV0.deserialize(
        Buffer.from(dlcoffer as string, 'hex'),
      );

      const optionInfo = getOptionInfoFromOffer(dlcOffer);

      return res.json({
        contractsize: Number(optionInfo.contractSize),
        strikeprice: Number(optionInfo.strikePrice),
        premium: Number(optionInfo.premium),
        expiry: Math.floor(optionInfo.expiry.getTime() / 1000),
      });
    } else {
      return routeErrorHandler(
        this,
        res,
        500,
        'No OrderOffer or DlcOffer provided',
      );
    }
  }
}
