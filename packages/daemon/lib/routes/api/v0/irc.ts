import { Logger } from '@node-lightning/logger';
import { Request, Response } from 'express';
import { IArguments, IDB } from '../../../utils/config';
import { routeErrorHandler } from '../../handler/ErrorHandler';
import BaseRoutes from '../../base';
import { Client } from '../../../client';
import {
  OrderAcceptV0,
  OrderOfferV0,
  ContractInfo,
  OrderNegotiationFieldsV0,
  OrderNegotiationFieldsV1,
  DlcOfferV0,
  DlcOffer,
  DlcSignV0,
} from '@node-dlc/messaging';
import { sha256 } from '@node-lightning/crypto';
import {
  validateType,
  validateBigInt,
  validateNumber,
  validateString,
  validateBuffer,
} from '../../validate/ValidateFields';
import { chainHashFromNetwork } from '@atomicfinance/bitcoin-networks';
import * as zmq from 'zeromq';
import { verifyToken } from '../../../utils/crypto';

export default class IrcRoutes extends BaseRoutes {
  public sock: zmq.socket;

  constructor(
    argv: IArguments,
    db: IDB,
    logger: Logger,
    client: Client,
    sock: zmq.socket,
  ) {
    super(argv, db, logger, client);
    this.sock = sock;
  }

  public async postOffers(req: Request, res: Response): Promise<Response> {
    this.ircAuth(req, res);

    const { ircNickname } = req.params;
    const { dlcoffer } = req.body;

    validateType(dlcoffer, 'Dlc Offer', DlcOfferV0, this, res);
    const dlcOffer = DlcOffer.deserialize(
      Buffer.from(dlcoffer as string, 'hex'),
    );

    await this.db.dlc.saveDlcOffer(dlcOffer);
    await this.db.irc.saveTempContractIdByNick(
      sha256(dlcOffer.serialize()),
      ircNickname,
    );

    await this.sock.send(['dlcoffer', dlcOffer.serialize().toString('hex')]);

    return res.json({ msg: 'success' });
  }

  public async getAccept(req: Request, res: Response): Promise<Response> {
    this.ircAuth(req, res);

    const { ircNickname, tempContractId } = req.params;

    validateBuffer(tempContractId as string, 'TempContractId', this, res);

    const tempContractIds = await this.db.irc.findTempContractIdsByNick(
      ircNickname,
    );
    const tempContractIndex = tempContractIds.ids.findIndex(
      (id) => id.toString('hex') === tempContractId,
    );
    if (tempContractIndex === -1)
      return routeErrorHandler(
        this,
        res,
        404,
        'TempContractId for DlcAccept not found',
      );

    const dlcAccepts = await this.db.dlc.findDlcAccepts();
    const dlcAcceptIndex = dlcAccepts.findIndex(
      (dlcAccept) =>
        dlcAccept.tempContractId.toString('hex') === tempContractId,
    );
    if (dlcAcceptIndex === -1)
      return routeErrorHandler(this, res, 404, 'DlcAccept not found');

    const dlcAccept = dlcAccepts[dlcAcceptIndex];

    return res.json({ hex: dlcAccept.serialize().toString('hex') });
  }

  public async postSigns(req: Request, res: Response): Promise<Response> {
    this.ircAuth(req, res);

    const { ircNickname } = req.params;
    const { dlcsign } = req.body;

    validateType(dlcsign, 'Dlc Sign', DlcSignV0, this, res);
    const dlcSign = DlcSignV0.deserialize(
      Buffer.from(dlcsign as string, 'hex'),
    );

    await this.db.dlc.saveDlcSign(dlcSign);
    await this.db.irc.saveContractIdByNick(dlcSign.contractId, ircNickname);

    await this.sock.send(['dlcsign', dlcSign.serialize().toString('hex')]);

    return res.json({ msg: 'success' });
  }

  private ircAuth = (req: Request, res: Response): void => {
    const signature = req.header('X-SIGNATURE');
    const timestamp = parseInt(req.header('X-TIMESTAMP')!);
    const pubkey = req.header('X-PUBKEY');
    const { ircNickname } = req.params;

    validateBuffer(pubkey as string, 'Pubkey', this, res);
    const pubKey = Buffer.from(pubkey, 'hex');
    const expectedNick = this.client.ircManager.generateNick(pubKey);

    if (ircNickname !== expectedNick) throw Error('Incorrect pubkey for nick');
    if (isNaN(timestamp)) throw new Error('Invalid timestamp value');
    verifyToken(Buffer.from(signature, 'hex'), timestamp, pubKey);
  };
}
