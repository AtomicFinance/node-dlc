import { Logger } from '@node-lightning/logger';
import { Request, Response } from 'express';
import { IArguments, IDB } from '../../../utils/config';
import { routeErrorHandler } from '../../handler/ErrorHandler';
import BaseRoutes from '../../base';
import { Client } from '../../../client';
import {
  ContractInfo,
  DlcOffer,
  DlcAccept,
  DlcSign,
  OracleAttestationV0,
  FundingInputV0,
} from '@node-dlc/messaging';
import { Tx } from '@node-lightning/bitcoin';
import {
  validateBigInt,
  validateNumber,
  validateString,
  validateBuffer,
  validateType,
  validateArray,
} from '../../validate/ValidateFields';
import {
  AcceptDlcOfferResponse,
  SignDlcAcceptResponse,
  checkTypes,
} from '@atomicfinance/bitcoin-dlc-provider';
import { DlcTxBuilder } from '@node-dlc/core';
import { sha256, xor } from '@node-lightning/crypto';
import { Input } from '@atomicfinance/types';

export default class DlcRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async getOffer(req: Request, res: Response): Promise<Response> {
    const { tempcontractid } = req.params;

    validateString(tempcontractid, 'TempContractId', this, res);
    validateBuffer(tempcontractid as string, 'TempContractId', this, res);
    const tempContractId = Buffer.from(tempcontractid as string, 'hex');

    const dlcOffer = await this.db.dlc.findDlcOffer(tempContractId);

    if (dlcOffer === undefined)
      return routeErrorHandler(this, res, 404, `DlcOffer not found.`);

    return res.json({ hex: dlcOffer.serialize().toString('hex') });
  }

  public async postOffer(req: Request, res: Response): Promise<Response> {
    const {
      contractinfo,
      collateral,
      feerate,
      locktime,
      refundlocktime,
      fundinginputs,
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

    let fixedInputs: Input[] = [];
    if (fundinginputs !== null) {
      validateArray(fundinginputs, 'funding inputs', this, res);
      fundinginputs.forEach((fundinginput) =>
        validateBuffer(fundinginput, 'Funding Input', this, res),
      );

      const fundingInputs: FundingInputV0[] = fundinginputs.map(
        (fundinginput) =>
          FundingInputV0.deserialize(Buffer.from(fundinginput, 'hex')),
      );
      fixedInputs = await Promise.all(
        fundingInputs.map(async (fundingInput) => {
          return this.client.client.getMethod('fundingInputToInput')(
            fundingInput,
          );
        }),
      );
    }

    this.logger.info('Generating offer...');
    const _dlcOffer: DlcOffer = await this.client.client.dlc.createDlcOffer(
      contractInfo,
      BigInt(collateral as string),
      BigInt(feerate as string),
      Number(locktime),
      Number(refundlocktime),
      fixedInputs,
    );
    this.logger.info('Offer generated');

    const { dlcOffer } = checkTypes({ _dlcOffer });

    this.logger.info('Saving DLC Offer to DB...');
    await this.db.dlc.saveDlcOffer(dlcOffer);
    this.logger.info('DLC Offer saved');

    this.logger.info('End Offer DLC');

    if (this.client.rpc) {
      const {
        fundingAddress,
        changeAddress,
        payoutAddress,
      } = dlcOffer.getAddresses(this.client.network);

      await this.client.importAddressesToRpc([
        fundingAddress,
        changeAddress,
        payoutAddress,
      ]);
    }

    return res.json({
      hex: dlcOffer.serialize().toString('hex'),
      tempcontractid: sha256(dlcOffer.serialize()).toString('hex'),
    });
  }

  public async getAccept(req: Request, res: Response): Promise<Response> {
    const { contractid } = req.params;

    validateString(contractid, 'ContractId', this, res);
    validateBuffer(contractid as string, 'ContractId', this, res);
    const contractId = Buffer.from(contractid as string, 'hex');

    const dlcAccept = await this.db.dlc.findDlcAccept(contractId);

    if (dlcAccept === undefined)
      return routeErrorHandler(this, res, 404, `DlcAccept not found.`);

    return res.json({ hex: dlcAccept.serialize().toString('hex') });
  }

  public async postAccept(req: Request, res: Response): Promise<Response> {
    const { dlcoffer, fundinginputs } = req.body;

    this.logger.info('Start Accept DLC');
    this.logger.info('Validate DlcOffer...');
    validateType(dlcoffer, 'Dlc Offer', DlcOffer, this, res);
    const _dlcOffer: DlcOffer = DlcOffer.deserialize(
      Buffer.from(dlcoffer as string, 'hex'),
    );
    this.logger.info('DlcOffer Valid');

    let fixedInputs: Input[] = [];
    if (fundinginputs !== null) {
      validateArray(fundinginputs, 'funding inputs', this, res);
      fundinginputs.forEach((fundinginput) =>
        validateBuffer(fundinginput, 'Funding Input', this, res),
      );

      const fundingInputs: FundingInputV0[] = fundinginputs.map(
        (fundinginput) =>
          FundingInputV0.deserialize(Buffer.from(fundinginput, 'hex')),
      );
      fixedInputs = await Promise.all(
        fundingInputs.map(async (fundingInput) => {
          return this.client.client.getMethod('fundingInputToInput')(
            fundingInput,
          );
        }),
      );
    }

    this.logger.info('Generating sigs...');
    const {
      dlcAccept: _dlcAccept,
      dlcTransactions: _dlcTxs,
    }: AcceptDlcOfferResponse = await this.client.client.dlc.acceptDlcOffer(
      _dlcOffer,
      fixedInputs,
    );
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

    if (this.client.rpc) {
      const {
        fundingAddress,
        changeAddress,
        payoutAddress,
      } = dlcAccept.getAddresses(this.client.network);

      await this.client.importAddressesToRpc([
        fundingAddress,
        changeAddress,
        payoutAddress,
      ]);
    }

    return res.json({
      hex: dlcAccept.serialize().toString('hex'),
      contractid: contractId.toString('hex'),
    });
  }

  public async getSign(req: Request, res: Response): Promise<Response> {
    const { contractid } = req.params;

    validateString(contractid, 'ContractId', this, res);
    validateBuffer(contractid as string, 'ContractId', this, res);
    const contractId = Buffer.from(contractid as string, 'hex');

    const dlcSign = await this.db.dlc.findDlcSign(contractId);

    if (dlcSign === undefined)
      return routeErrorHandler(this, res, 404, `DlcSign not found.`);

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
    }: SignDlcAcceptResponse = await this.client.client.dlc.signDlcAccept(
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
      contractid: contractId.toString('hex'),
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
    const fundTx: Tx = await this.client.client.dlc.finalizeDlcSign(
      dlcOffer,
      dlcAccept,
      dlcSign,
      dlcTxs,
    );
    this.logger.info('Sigs generated');

    dlcTxs.fundTx = fundTx;
    this.logger.info('Saving DLC Transactions to DB...');
    await this.db.dlc.saveDlcTransactions(dlcTxs);
    await this.db.dlc.saveDlcSign(dlcSign);
    this.logger.info('DLC Transactions saved');

    this.logger.info('End Finalize DLC');

    return res.json({
      contractid: dlcSign.contractId.toString('hex'),
    });
  }

  public async getContract(req: Request, res: Response): Promise<Response> {
    const { contractid } = req.params;

    validateString(contractid, 'ContractId', this, res);
    validateBuffer(contractid as string, 'ContractId', this, res);
    const contractId = Buffer.from(contractid as string, 'hex');

    const dlcTxs = await this.db.dlc.findDlcTransactions(contractId);

    if (dlcTxs === undefined)
      return routeErrorHandler(this, res, 404, `Contract not found.`);

    return res.json({
      hex: dlcTxs.fundTx.serialize().toString('hex'),
    });
  }

  public async postExecute(req: Request, res: Response): Promise<Response> {
    const { contractid, oracleattestation } = req.body;

    this.logger.info('Start Execute DLC');

    this.logger.info('Validate OracleAttestation...');
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
    this.logger.info('OracleAttestation Valid');

    this.logger.info('Fetch Dlc Messages from DB');
    const dlcTxs = await this.db.dlc.findDlcTransactions(contractId);
    const dlcSign = await this.db.dlc.findDlcSign(contractId);
    const dlcAccept = await this.db.dlc.findDlcAccept(contractId);
    const dlcOffer = await this.db.dlc.findDlcOffer(dlcAccept.tempContractId);

    if (dlcTxs === undefined)
      return routeErrorHandler(this, res, 404, `DlcTxs not found.`);
    if (dlcSign === undefined)
      return routeErrorHandler(this, res, 404, `DlcSign not found.`);
    if (dlcAccept === undefined)
      return routeErrorHandler(this, res, 404, `DlcAccept not found.`);
    if (dlcOffer === undefined)
      return routeErrorHandler(this, res, 404, `DlcOffer not found.`);

    this.logger.info('Dlc Messages fetched');

    const isOfferer = await this.client.client.dlc.isOfferer(
      dlcOffer,
      dlcAccept,
    );

    this.logger.info('Execute...');
    const executeTx: Tx = await this.client.client.dlc.execute(
      dlcOffer,
      dlcAccept,
      dlcSign,
      dlcTxs,
      oracleAttestation,
      isOfferer,
    );
    this.logger.info('Executed');

    this.logger.info('End Execute DLC');

    return res.json({
      hex: executeTx.serialize().toString('hex'),
    });
  }

  public async postRefund(req: Request, res: Response): Promise<Response> {
    const { contractid } = req.body;

    this.logger.info('Start Refund DLC');

    this.logger.info('Validate ContractId...');
    validateString(contractid, 'ContractId', this, res);
    const contractId = Buffer.from(contractid as string, 'hex');
    this.logger.info('ContractId Valid');

    this.logger.info('Fetch Dlc Messages from DB');
    const dlcTxs = await this.db.dlc.findDlcTransactions(contractId);
    const dlcSign = await this.db.dlc.findDlcSign(contractId);
    const dlcAccept = await this.db.dlc.findDlcAccept(contractId);
    const dlcOffer = await this.db.dlc.findDlcOffer(dlcAccept.tempContractId);
    this.logger.info('Dlc Messages fetched');

    this.logger.info('Refund...');
    const refundTx: Tx = await this.client.client.dlc.refund(
      dlcOffer,
      dlcAccept,
      dlcSign,
      dlcTxs,
    );
    this.logger.info('Refunded');

    this.logger.info('End Refund DLC');

    return res.json({
      hex: refundTx.serialize().toString('hex'),
    });
  }
}
