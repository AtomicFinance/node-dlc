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
  DlcSign,
  OracleAttestationV0,
} from '@node-dlc/messaging';
import { Tx } from '@node-lightning/bitcoin';
import {
  validateBigInt,
  validateNumber,
  validateString,
  validateBuffer,
  validateType,
} from '../../validate/ValidateFields';
import {
  AcceptDlcOfferResponse,
  SignDlcAcceptResponse,
  checkTypes,
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
    } = req.body;

    validateType(contractinfo, 'Contract Info', ContractInfo, this, res);
    const contractInfo = ContractInfo.deserialize(
      Buffer.from(contractinfo as string, 'hex'),
    );

    validateBigInt(collateral, 'collateral', this, res);
    validateBigInt(feerate, 'feerate', this, res);
    validateNumber(locktime, 'locktime', this, res);
    validateNumber(refundlocktime, 'refundlocktime', this, res);

    const _dlcOffer: DlcOffer = await this.client.createDlcOffer(
      contractInfo,
      BigInt(collateral as string),
      BigInt(feerate as string),
      Number(locktime),
      Number(refundlocktime),
    );

    const { dlcOffer } = checkTypes({ _dlcOffer });
    await this.db.dlc.saveDlcOffer(dlcOffer);

    return res.json({
      hex: dlcOffer.serialize().toString('hex'),
      tempContractId: sha256(dlcOffer.serialize()),
    });
  }

  public async postAccept(req: Request, res: Response): Promise<Response> {
    const { dlcoffer } = req.body;

    validateType(dlcoffer, 'Dlc Offer', DlcOffer, this, res);
    const _dlcOffer: DlcOffer = DlcOffer.deserialize(
      Buffer.from(dlcoffer as string, 'hex'),
    );

    const {
      dlcAccept: _dlcAccept,
      dlcTransactions: _dlcTxs,
    }: AcceptDlcOfferResponse = await this.client.acceptDlcOffer(_dlcOffer);

    const { dlcOffer, dlcAccept, dlcTxs } = checkTypes({
      _dlcOffer,
      _dlcAccept,
      _dlcTxs,
    });

    if (Buffer.compare(dlcOffer.fundingPubKey, dlcAccept.fundingPubKey) === 0)
      throw Error('DlcOffer and DlcAccept FundingPubKey cannot be the same');

    const txBuilder = new DlcTxBuilder(dlcOffer, dlcAccept.withoutSigs());
    const tx = txBuilder.buildFundingTransaction();
    const fundingTxid = tx.txId.serialize();
    const contractId = xor(fundingTxid, dlcAccept.tempContractId);

    if (Buffer.compare(contractId, dlcTxs.contractId) !== 0)
      return routeErrorHandler(this, res, 400, `Contract Id doesn't match`);

    await this.db.dlc.saveDlcOffer(dlcOffer);
    await this.db.dlc.saveDlcAccept(dlcAccept);
    await this.db.dlc.saveDlcTransactions(dlcTxs);

    return res.json({
      hex: dlcAccept.serialize().toString('hex'),
      contractId: contractId.toString('hex'),
    });
  }

  public async postSign(req: Request, res: Response): Promise<Response> {
    const { dlcaccept } = req.body;

    validateType(dlcaccept, 'Dlc Accept', DlcAccept, this, res);
    const _dlcAccept: DlcAccept = DlcAccept.deserialize(
      Buffer.from(dlcaccept as string, 'hex'),
    );
    const { dlcAccept } = checkTypes({ _dlcAccept });
    const dlcOffer = await this.db.dlc.findDlcOffer(dlcAccept.tempContractId);

    if (Buffer.compare(dlcOffer.fundingPubKey, dlcAccept.fundingPubKey) === 0)
      throw Error('DlcOffer and DlcAccept FundingPubKey cannot be the same');

    const txBuilder = new DlcTxBuilder(dlcOffer, dlcAccept.withoutSigs());
    const tx = txBuilder.buildFundingTransaction();
    const fundingTxid = tx.txId.serialize();
    const contractId = xor(fundingTxid, dlcAccept.tempContractId);

    const {
      dlcSign: _dlcSign,
      dlcTransactions: _dlcTxs,
    }: SignDlcAcceptResponse = await this.client.signDlcAccept(
      dlcOffer,
      dlcAccept,
    );

    const { dlcSign, dlcTxs } = checkTypes({ _dlcSign, _dlcTxs });

    if (Buffer.compare(contractId, dlcSign.contractId) !== 0)
      return routeErrorHandler(
        this,
        res,
        400,
        `Contract Id doesn't match on DlcSign`,
      );
    if (Buffer.compare(contractId, dlcTxs.contractId) !== 0)
      return routeErrorHandler(
        this,
        res,
        400,
        `Contract Id doesn't match on DlcTransactions`,
      );

    await this.db.dlc.saveDlcAccept(dlcAccept);
    await this.db.dlc.saveDlcSign(dlcSign);
    await this.db.dlc.saveDlcTransactions(dlcTxs);

    return res.json({
      hex: dlcSign.serialize().toString('hex'),
      txs: dlcTxs.serialize().toString('hex'),
      contractId: contractId.toString('hex'),
    });
  }

  public async postFinalize(req: Request, res: Response): Promise<Response> {
    const { dlcsign } = req.body;

    validateType(dlcsign, 'Dlc Sign', DlcSign, this, res);
    const _dlcSign: DlcSign = DlcSign.deserialize(
      Buffer.from(dlcsign as string, 'hex'),
    );
    const { dlcSign } = checkTypes({ _dlcSign });
    const dlcTxs = await this.db.dlc.findDlcTransactions(dlcSign.contractId);
    const dlcAccept = await this.db.dlc.findDlcAccept(dlcSign.contractId);
    const dlcOffer = await this.db.dlc.findDlcOffer(dlcAccept.tempContractId);

    const fundTx: Tx = await this.client.finalizeDlcSign(
      dlcOffer,
      dlcAccept,
      dlcSign,
      dlcTxs,
    );

    dlcTxs.fundTx = fundTx;
    await this.db.dlc.saveDlcTransactions(dlcTxs);

    return res.json({
      contractId: dlcSign.contractId.toString('hex'),
    });
  }

  public async getContract(req: Request, res: Response): Promise<Response> {
    const { contractid } = req.params;

    validateString(contractid, 'ContractId', this, res);
    validateBuffer(contractid as string, 'ContractId', this, res);
    const contractId = Buffer.from(contractid as string, 'hex');

    const dlcTxs = await this.db.dlc.findDlcTransactions(contractId);

    return res.json({
      fundTx: dlcTxs.fundTx.serialize().toString('hex'),
    });
  }

  public async postExecute(req: Request, res: Response): Promise<Response> {
    const { contractid, oracleattestation } = req.body;

    validateString(contractid, 'ContractId', this, res);
    validateString(oracleattestation, 'OracleAttestation', this, res);
    validateType(
      oracleattestation,
      'OracleAttestation',
      OracleAttestationV0,
      this,
      res,
    );
    const contractId = Buffer.from(contractid as string, 'hex');
    const oracleAttestation: OracleAttestationV0 = OracleAttestationV0.deserialize(
      Buffer.from(oracleattestation as string, 'hex'),
    );
    const dlcTxs = await this.db.dlc.findDlcTransactions(contractId);
    const dlcSign = await this.db.dlc.findDlcSign(contractId);
    const dlcAccept = await this.db.dlc.findDlcAccept(contractId);
    const dlcOffer = await this.db.dlc.findDlcOffer(dlcAccept.tempContractId);

    const isOfferer = await this.client.isOfferer(dlcOffer, dlcAccept);

    const executeTx: Tx = await this.client.execute(
      dlcOffer,
      dlcAccept,
      dlcSign,
      dlcTxs,
      oracleAttestation,
      isOfferer,
    );

    return res.json({
      hex: executeTx.serialize().toString('hex'),
    });
  }

  public async postRefund(req: Request, res: Response): Promise<Response> {
    const { contractid } = req.body;

    validateString(contractid, 'ContractId', this, res);
    const contractId = Buffer.from(contractid as string, 'hex');

    const dlcTxs = await this.db.dlc.findDlcTransactions(contractId);
    const dlcSign = await this.db.dlc.findDlcSign(contractId);
    const dlcAccept = await this.db.dlc.findDlcAccept(contractId);
    const dlcOffer = await this.db.dlc.findDlcOffer(dlcAccept.tempContractId);

    const refundTx: Tx = await this.client.refund(
      dlcOffer,
      dlcAccept,
      dlcSign,
      dlcTxs,
    );

    return res.json({
      hex: refundTx.serialize().toString('hex'),
    });
  }
}
