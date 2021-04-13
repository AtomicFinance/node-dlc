import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { NextFunction, Request, Response } from 'express';
import { IArguments, IDB } from '../../utils/config';
import { routeErrorHandler } from '../handler/ErrorHandler';
import BaseRoutes from '../base';
import { Client } from '../../client';
import { OracleAnnouncementV0, OracleAttestationV0 } from '@node-dlc/messaging';
import { validateType } from '../validate/ValidateFields';

export default class OracleRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async postAnnouncementDecode(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const { oracleannouncement } = req.body;

    validateType(
      oracleannouncement,
      'OracleAnnouncement',
      OracleAnnouncementV0,
      this,
      res,
    );
    const oracleAnnouncement = OracleAnnouncementV0.deserialize(
      Buffer.from(oracleannouncement as string, 'hex'),
    );

    return res.json(oracleAnnouncement.toJSON());
  }

  public async postAttestationDecode(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const { oracleattestation } = req.body;

    validateType(
      oracleattestation,
      'OracleAttestation',
      OracleAttestationV0,
      this,
      res,
    );
    const oracleAttestation = OracleAttestationV0.deserialize(
      Buffer.from(oracleattestation as string, 'hex'),
    );

    return res.json(oracleAttestation.toJSON());
  }
}
