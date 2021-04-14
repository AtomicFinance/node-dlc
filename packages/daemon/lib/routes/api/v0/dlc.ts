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

  public async getOffer(req: Request, res: Response): Promise<Response> {
    const { tempcontractid } = req.query;

    validateString(tempcontractid, 'TempContractId', this, res);
    validateBuffer(tempcontractid as string, 'TempContractId', this, res);
    const tempContractId = Buffer.from(tempcontractid as string, 'hex');

    const dlcOffer = await this.db.dlc.findDlcOffer(tempContractId);

    return res.json({ hex: dlcOffer.serialize().toString('hex') });
  }

  public async postOffer(req: Request, res: Response): Promise<Response> {
    const {
      contractinfo,
      collateral,
      feerate,
      locktime,
      refundlocktime,
    } = req.body;

    this.logger.info('Start Offer DLC');
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

    this.logger.info('Generating offer...');
    const _dlcOffer: DlcOffer = await this.client.createDlcOffer(
      contractInfo,
      BigInt(collateral as string),
      BigInt(feerate as string),
      Number(locktime),
      Number(refundlocktime),
    );
    this.logger.info('Offer generated');

    const { dlcOffer } = checkTypes({ _dlcOffer });

    this.logger.info('Saving DLC Offer to DB...');
    await this.db.dlc.saveDlcOffer(dlcOffer);
    this.logger.info('DLC Offer saved');

    this.logger.info('End Offer DLC');

    return res.json({
      hex: dlcOffer.serialize().toString('hex'),
      tempContractId: sha256(dlcOffer.serialize()),
    });
  }

  public async getAccept(req: Request, res: Response): Promise<Response> {
    const { contractid } = req.query;

    validateString(contractid, 'ContractId', this, res);
    validateBuffer(contractid as string, 'ContractId', this, res);
    const contractId = Buffer.from(contractid as string, 'hex');

    const dlcAccept = await this.db.dlc.findDlcAccept(contractId);

    return res.json({ hex: dlcAccept.serialize().toString('hex') });
  }

  public async postAccept(req: Request, res: Response): Promise<Response> {
    const { dlcoffer } = req.body;

    this.logger.info('Start Accept DLC');
    this.logger.info('Validate DlcOffer...');
    validateType(dlcoffer, 'Dlc Offer', DlcOffer, this, res);
    const _dlcOffer: DlcOffer = DlcOffer.deserialize(
      Buffer.from(dlcoffer as string, 'hex'),
    );
    this.logger.info('DlcOffer Valid');

    this.logger.info('Generating sigs...');
    const {
      dlcAccept: _dlcAccept,
      dlcTransactions: _dlcTxs,
    }: AcceptDlcOfferResponse = await this.client.acceptDlcOffer(_dlcOffer);
    this.logger.info('Sigs generated');

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

    this.logger.info('Saving DLC messages to DB...');
    await this.db.dlc.saveDlcOffer(dlcOffer);
    await this.db.dlc.saveDlcAccept(dlcAccept);
    await this.db.dlc.saveDlcTransactions(dlcTxs);
    this.logger.info('DLC messages saved');

    this.logger.info('End Accept DLC');

    return res.json({
      hex: dlcAccept.serialize().toString('hex'),
      contractId: contractId.toString('hex'),
    });
  }

  public async getSign(req: Request, res: Response): Promise<Response> {
    const { contractid } = req.query;

    validateString(contractid, 'ContractId', this, res);
    validateBuffer(contractid as string, 'ContractId', this, res);
    const contractId = Buffer.from(contractid as string, 'hex');

    const dlcSign = await this.db.dlc.findDlcSign(contractId);

    return res.json({ hex: dlcSign.serialize().toString('hex') });
  }

  public async postSign(req: Request, res: Response): Promise<Response> {
    const { dlcaccept } = req.body;

    this.logger.info('Start Sign DLC');
    this.logger.info('Validate DlcAccept...');
    validateType(dlcaccept, 'Dlc Accept', DlcAccept, this, res);
    const _dlcAccept: DlcAccept = DlcAccept.deserialize(
      Buffer.from(dlcaccept as string, 'hex'),
    );
    this.logger.info('DlcAccept Valid');
    const { dlcAccept } = checkTypes({ _dlcAccept });

    this.logger.info('Fetch DlcOffer from DB');
    const dlcOffer = await this.db.dlc.findDlcOffer(dlcAccept.tempContractId);
    this.logger.info('DlcOffer fetched');

    if (Buffer.compare(dlcOffer.fundingPubKey, dlcAccept.fundingPubKey) === 0)
      throw Error('DlcOffer and DlcAccept FundingPubKey cannot be the same');

    const txBuilder = new DlcTxBuilder(dlcOffer, dlcAccept.withoutSigs());
    const tx = txBuilder.buildFundingTransaction();
    const fundingTxid = tx.txId.serialize();
    const contractId = xor(fundingTxid, dlcAccept.tempContractId);

    this.logger.info('Generating sigs...');
    const {
      dlcSign: _dlcSign,
      dlcTransactions: _dlcTxs,
    }: SignDlcAcceptResponse = await this.client.signDlcAccept(
      dlcOffer,
      dlcAccept,
    );
    this.logger.info('Sigs generated');

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

    this.logger.info('Saving DLC messages to DB...');
    await this.db.dlc.saveDlcAccept(dlcAccept);
    await this.db.dlc.saveDlcSign(dlcSign);
    await this.db.dlc.saveDlcTransactions(dlcTxs);
    this.logger.info('DLC messages saved');

    this.logger.info('End Sign DLC');

    return res.json({
      hex: dlcSign.serialize().toString('hex'),
      txs: dlcTxs.serialize().toString('hex'),
      contractId: contractId.toString('hex'),
    });
  }

  public async postFinalize(req: Request, res: Response): Promise<Response> {
    const { dlcsign } = req.body;

    this.logger.info('Start Finalize DLC');
    this.logger.info('Validate DlcSign...');
    validateType(dlcsign, 'Dlc Sign', DlcSign, this, res);
    const _dlcSign: DlcSign = DlcSign.deserialize(
      Buffer.from(dlcsign as string, 'hex'),
    );
    this.logger.info('DlcSign Valid');

    const { dlcSign } = checkTypes({ _dlcSign });

    this.logger.info('Fetch Dlc Messages from DB');
    const dlcTxs = await this.db.dlc.findDlcTransactions(dlcSign.contractId);
    const dlcAccept = await this.db.dlc.findDlcAccept(dlcSign.contractId);
    const dlcOffer = await this.db.dlc.findDlcOffer(dlcAccept.tempContractId);
    this.logger.info('Dlc Messages fetched');

    this.logger.info('Generating sigs...');
    const fundTx: Tx = await this.client.finalizeDlcSign(
      dlcOffer,
      dlcAccept,
      dlcSign,
      dlcTxs,
    );
    this.logger.info('Sigs generated');

    dlcTxs.fundTx = fundTx;
    this.logger.info('Saving DLC Transactions to DB...');
    await this.db.dlc.saveDlcTransactions(dlcTxs);
    this.logger.info('DLC Transactions saved');

    this.logger.info('End Finalize DLC');

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
