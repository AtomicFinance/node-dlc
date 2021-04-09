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
  DlcTransactionsV0,
  DlcAcceptV0,
} from '@node-dlc/messaging';
import {
  validateBigInt,
  validateNumber,
  validateString,
  validateType,
} from '../../validate/ValidateFields';
import {
  AcceptDlcOfferResponse,
  SignDlcAcceptResponse,
} from '@atomicfinance/bitcoin-dlc-provider';
import { DlcTxBuilder } from '@node-dlc/core';
import { sha256, xor } from '@node-lightning/crypto';

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

    return res.json({
      hex: dlcOffer.serialize().toString('hex'),
      tempContractId: sha256(dlcOffer.serialize()),
    });
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
    const _dlcAccept = dlcAccept as DlcAcceptV0;
    const _dlcTransactions = dlcTransactions as DlcTransactionsV0;

    const txBuilder = new DlcTxBuilder(_dlcOffer, _dlcAccept.withoutSigs());
    const tx = txBuilder.buildFundingTransaction();
    const fundingTxid = tx.txId.serialize();
    const contractId = xor(fundingTxid, _dlcAccept.tempContractId);

    if (Buffer.compare(contractId, _dlcTransactions.contractId) !== 0)
      return routeErrorHandler(this, res, 400, `Contract Id doesn't match`);

    return res.json({
      hex: dlcAccept.serialize().toString('hex'),
    });
  }

  public async postSign(req: Request, res: Response): Promise<Response> {
    const { dlcaccept } = req.query;

    // get Dlc offer from db

    throw Error('testing');

    // validateType(dlcoffer, 'Dlc Offer', DlcOffer, this, res);
    // const dlcOffer: DlcOffer = DlcOffer.deserialize(
    //   Buffer.from(dlcoffer as string, 'hex'),
    // );

    // validateType(dlcaccept, 'Dlc Accept', DlcAccept, this, res);
    // const dlcAccept: DlcAccept = DlcAccept.deserialize(
    //   Buffer.from(dlcaccept as string, 'hex'),
    // );

    // const {
    //   dlcSign,
    //   dlcTransactions,
    // }: SignDlcAcceptResponse = await this.client.signDlcAccept(
    //   dlcOffer,
    //   dlcAccept,
    // );

    // const _dlcOffer = dlcOffer as DlcOfferV0;
    // const _dlcAccept = dlcAccept as DlcAcceptV0;
    // const _dlcTransactions = dlcTransactions as DlcTransactionsV0;

    // const txBuilder = new DlcTxBuilder(_dlcOffer, _dlcAccept.withoutSigs());
    // const tx = txBuilder.buildFundingTransaction();
    // const fundingTxid = tx.txId.serialize();
    // const contractId = xor(fundingTxid, _dlcAccept.tempContractId);

    // if (Buffer.compare(contractId, _dlcTransactions.contractId) !== 0)
    //   return routeErrorHandler(this, res, 400, `Contract Id doesn't match`);

    // return res.json({
    //   hex: dlcSign.serialize().toString('hex'),
    // });
  }
}
