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
import {
  validateType,
  validateBigInt,
  validateNumber,
  validateString,
  validateBuffer,
} from '../../validate/ValidateFields';

export default class OrderRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async getOffer(req: Request, res: Response): Promise<Response> {
    const { temporderid } = req.query;

    validateString(temporderid, 'temporderid', this, res);
    validateBuffer(temporderid as string, 'temporderid', this, res);
    const tempOrderId = Buffer.from(temporderid as string, 'hex');

    const orderOffer = await this.db.order.findOrderOffer(tempOrderId);

    if (orderOffer === undefined)
      return routeErrorHandler(this, res, 404, 'OrderOffer not found.');

    return res.json({ hex: orderOffer.serialize().toString('hex') });
  }

  public async postOffer(req: Request, res: Response): Promise<Response> {
    const {
      contractinfo,
      collateral,
      feerate,
      locktime,
      refundlocktime,
    } = req.body;

    this.logger.info('Start Offer Order');

    this.logger.info('Validate ContractInfo...');
    validateType(contractinfo, 'Contract Info', ContractInfo, this, res);
    const contractInfo = ContractInfo.deserialize(
      Buffer.from(contractinfo as string, 'hex'),
    );

    validateBigInt(collateral, 'collateral', this, res);
    validateBigInt(feerate, 'feerate', this, res);
    validateNumber(locktime, 'locktime', this, res);
    validateNumber(refundlocktime, 'refundlocktime', this, res);
    this.logger.info('ContractInfo Valid');

    const orderOffer = new OrderOfferV0();
    orderOffer.chainHash = Buffer.from(
      '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206',
      'hex',
    );
    orderOffer.contractInfo = contractInfo;
    orderOffer.offerCollateralSatoshis = BigInt(collateral as string);
    orderOffer.feeRatePerVb = BigInt(feerate as string);
    orderOffer.cetLocktime = Number(locktime);
    orderOffer.refundLocktime = Number(refundlocktime);

    await this.db.order.saveOrderOffer(orderOffer);

    return res.json({ hex: orderOffer.serialize().toString('hex') });
  }

  public async getAccept(req: Request, res: Response): Promise<Response> {
    const { temporderid } = req.query;

    validateString(temporderid, 'temporderid', this, res);
    validateBuffer(temporderid as string, 'temporderid', this, res);
    const tempOrderId = Buffer.from(temporderid as string, 'hex');

    const orderAccept = await this.db.order.findOrderAccept(tempOrderId);

    if (orderAccept === undefined)
      return routeErrorHandler(this, res, 404, 'OrderAccept not found.');

    return res.json({ hex: orderAccept.serialize().toString('hex') });
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

    validateType(orderoffer, 'Order Offer', OrderOfferV0, this, res);
    const orderOffer = OrderOfferV0.deserialize(
      Buffer.from(orderoffer as string, 'hex'),
    );

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

      _orderOffer.chainHash = orderOffer.chainHash;

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

    await this.db.order.saveOrderOffer(orderOffer);
    await this.db.order.saveOrderAccept(orderAccept);

    return res.json({ hex: orderAccept.serialize().toString('hex') });
  }
}
