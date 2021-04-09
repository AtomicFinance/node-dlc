import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { NextFunction, Request, Response } from 'express';
import { IArguments, IDB } from '../../../utils/config';
import { routeErrorHandler } from '../../handler/ErrorHandler';
import BaseRoutes from '../../base';
import { Client } from '../../../client';
import {
  ContractInfo,
  DlcOffer,
  DlcOfferV0,
  DlcAccept,
} from '@node-dlc/messaging';
import {
  validateBigInt,
  validateNumber,
  validateString,
  validateType,
} from '../../validate/ValidateFields';
import { AcceptDlcOfferResponse } from '@atomicfinance/bitcoin-dlc-provider';
import { DlcTxBuilder } from '@node-dlc/core';

export default class DlcRoutes extends BaseRoutes {
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
    } = req.query;

    validateType(contractinfo, 'Contract Info', ContractInfo, this, res);
    const contractInfo = ContractInfo.deserialize(
      Buffer.from(contractinfo as string, 'hex'),
    );

    validateBigInt(collateral, 'collateral', this, res);
    validateBigInt(feerate, 'feerate', this, res);
    validateNumber(locktime, 'locktime', this, res);
    validateNumber(refundlocktime, 'refundlocktime', this, res);

    const dlcOffer: DlcOffer = await this.client.createDlcOffer(
      contractInfo,
      BigInt(collateral as string),
      BigInt(feerate as string),
      Number(locktime),
      Number(refundlocktime),
    );

    return res.json({ hex: dlcOffer.serialize().toString('hex') });
  }

  public async postAccept(req: Request, res: Response): Promise<Response> {
    const { dlcoffer } = req.query;

    validateType(dlcoffer, 'Dlc Offer', DlcOffer, this, res);
    const dlcOffer: DlcOffer = DlcOffer.deserialize(
      Buffer.from(dlcoffer as string, 'hex'),
    );

    const {
      dlcAccept,
      dlcTransactions,
    }: AcceptDlcOfferResponse = await this.client.acceptDlcOffer(dlcOffer);

    const _dlcOffer = dlcOffer as DlcOfferV0;
    console.log('_dlcOffer.changeSPK', _dlcOffer.changeSPK.toString('hex'));
    console.log('dlcAccept.changeSPK', dlcAccept.changeSPK.toString('hex'));

    const txBuilder = new DlcTxBuilder(_dlcOffer, dlcAccept.withoutSigs());
    const tx = txBuilder.buildFundingTransaction();
    const fundingTxid = tx.serialize().toString('hex');
    console.log('fundingTxid', fundingTxid);

    console.log(
      'dlcTransactions',
      dlcTransactions.fundTx.serialize().toString('hex'),
    );

    return res.json({ hex: dlcAccept.serialize().toString('hex') });
  }
}
