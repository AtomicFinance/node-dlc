import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { NextFunction, Request, Response } from 'express';
import { IArguments, IDB } from '../../../utils/config';
import { routeErrorHandler } from '../../handler/ErrorHandler';
import BaseRoutes from '../../base';
import { Client } from '../../../client';
import { ContractInfo, DlcOffer, DlcAccept } from '@node-dlc/messaging';

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

    const contractInfo = ContractInfo.deserialize(
      Buffer.from(contractinfo as string, 'hex'),
    );

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

    const dlcOffer: DlcOffer = DlcOffer.deserialize(
      Buffer.from(dlcoffer as string, 'hex'),
    );

    const dlcAccept: DlcAccept = await this.client.acceptDlcOffer(dlcOffer);

    return res.json({ hex: dlcAccept.serialize().toString('hex') });
  }
}
