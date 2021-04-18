import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { NextFunction, Request, Response } from 'express';
import { IArguments, IDB } from '../../../utils/config';
import { routeErrorHandler } from '../../handler/ErrorHandler';
import BaseRoutes from '../../base';
import { Client } from '../../../client';
import { ContractInfo, ContractInfoV0, MessageType } from '@node-dlc/messaging';

export default class ContractInfoRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async postDecode(req: Request, res: Response, next: NextFunction) {
    const { contractinfo } = req.query;

    if (!contractinfo)
      return routeErrorHandler(this, res, 401, 'No Contract Info Provided');

    if (!(typeof contractinfo === 'string'))
      return routeErrorHandler(this, res, 400, 'Invalid Contract Info');

    const contractInfo = ContractInfo.deserialize(
      Buffer.from(contractinfo as string, 'hex'),
    );

    switch (contractInfo.type) {
      case MessageType.ContractInfoV0:
        res.json((contractInfo as ContractInfoV0).toJSON());
        break;
      default:
        return routeErrorHandler(
          this,
          res,
          401,
          'ContractInfoV1 deserialization not supported',
        );
    }
  }
}
