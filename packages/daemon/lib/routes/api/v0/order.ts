import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { NextFunction, Request, Response } from 'express';
import { IArguments, IDB } from '../../../utils/config';
import { routeErrorHandler } from '../../handler/ErrorHandler';
import BaseRoutes from '../../base';
import { Client } from '../../../client';
import {
  OrderOffer,
  OrderAcceptV0,
  OrderOfferV0,
  ContractInfo,
  ContractInfoV0,
  OrderAccept,
  OrderNegotiationFields,
  OrderNegotiationFieldsV0,
  OrderNegotiationFieldsV1,
} from '@node-dlc/messaging';
import { sha256 } from '@node-lightning/crypto';

export default class OrderRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async postOffer(req: Request, res: Response): Promise<Response> {
    const {
      contractinfo,
      collateral,
      feerate,
      locktime,
      refundlocktime,
    } = req.body;

    const contractInfo = ContractInfo.deserialize(
      Buffer.from(contractinfo as string, 'hex'),
    );

    const orderOffer = new OrderOfferV0();
    orderOffer.chainHash = this.client.financeNetwork.chainHash;
    orderOffer.contractInfo = contractInfo;
    orderOffer.offerCollateralSatoshis = BigInt(collateral as string);
    orderOffer.feeRatePerVb = BigInt(feerate as string);
    orderOffer.cetLocktime = Number(locktime);
    orderOffer.refundLocktime = Number(refundlocktime);

    return res.json({ hex: orderOffer.serialize().toString('hex') });
  }

  public async postAccept(req: Request, res: Response): Promise<Response> {
    const {
      orderoffer,
      contractinfo,
      collateral,
      feerate,
      locktime,
      refundlocktime,
    } = req.body;

    const orderOffer = OrderOffer.deserialize(
      Buffer.from(orderoffer as string, 'hex'),
    ) as OrderOfferV0;

    const orderAccept = new OrderAcceptV0();

    orderAccept.tempOrderId = sha256(orderOffer.serialize());

    if (
      !contractinfo &&
      !collateral &&
      !feerate &&
      !locktime &&
      !refundlocktime
    ) {
      const orderNegotiationFields = new OrderNegotiationFieldsV0();

      orderAccept.negotiationFields = orderNegotiationFields;
    } else {
      const _orderOffer = new OrderOfferV0();

      _orderOffer.contractInfo = contractinfo
        ? ContractInfo.deserialize(Buffer.from(contractinfo as string, 'hex'))
        : orderOffer.contractInfo;

      _orderOffer.offerCollateralSatoshis = collateral
        ? BigInt(collateral)
        : orderOffer.offerCollateralSatoshis;

      _orderOffer.feeRatePerVb = feerate
        ? BigInt(feerate)
        : orderOffer.feeRatePerVb;

      _orderOffer.cetLocktime = locktime
        ? Number(locktime)
        : orderOffer.cetLocktime;

      _orderOffer.refundLocktime = refundlocktime
        ? Number(refundlocktime)
        : orderOffer.refundLocktime;

      const orderNegotiationFields = new OrderNegotiationFieldsV1();
      orderNegotiationFields.orderOffer = _orderOffer;

      orderAccept.negotiationFields = orderNegotiationFields;
    }

    return res.json({ hex: orderAccept.serialize().toString('hex') });
  }
}
