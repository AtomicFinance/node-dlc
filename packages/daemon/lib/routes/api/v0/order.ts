import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { NextFunction, Request, Response } from 'express';
import { IArguments, IDB } from '../../../utils/config';
import { routeErrorHandler } from '../../handler/ErrorHandler';
import BaseRoutes from '../../base';
import { Client } from '../../../client';
import {
  OrderOffer,
  OrderOfferV0,
  ContractInfo,
  ContractInfoV0,
} from '@node-dlc/messaging';

export default class OrderRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async postOffer(req: Request, res: Response, next: NextFunction) {
    const {
      contractinfo,
      collateral,
      feerate,
      locktime,
      refundlocktime,
    } = req.query;

    const contractInfo = ContractInfo.deserialize(
      Buffer.from(contractinfo as string, 'hex'),
    );

    const orderOffer = new OrderOfferV0();
    orderOffer.contractInfo = contractInfo;
    orderOffer.offerCollateralSatoshis = BigInt(collateral as string);
    orderOffer.feeRatePerVb = BigInt(feerate as string);
    orderOffer.cetLocktime = Number(locktime);
    orderOffer.refundLocktime = Number(refundlocktime);

    res.json({ hex: orderOffer.serialize().toString('hex') });
  }
}
