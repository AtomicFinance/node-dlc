import { Logger } from '@node-lightning/logger';
import { Request, Response } from 'express';
import { version } from '../../../package.json';
import { IArguments, IDB } from '../../utils/config';
import BaseRoutes from '../base';
import { Client } from '../../client';
import { Block } from '@atomicfinance/bitcoin-dlc-provider';
import { BitcoinNetwork } from '@atomicfinance/bitcoin-networks';

export default class InfoRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async getInfo(req: Request, res: Response): Promise<Response> {
    const dlcOffers = await this.db.dlc.findDlcOffers();
    const dlcAccepts = await this.db.dlc.findDlcAccepts();
    const dlcSigns = await this.db.dlc.findDlcSigns();

    const blockHeight: number = await this.client.blockHeight();
    const block: Block = await this.client.blockByNumber(blockHeight);
    const financeNetwork: BitcoinNetwork = await this.client.financeNetwork;

    const [chain, network] = financeNetwork.name.split('_');

    return res.json({
      version,
      num_dlc_offers: dlcOffers.length,
      num_dlc_accepts: dlcAccepts.length,
      num_dlc_signs: dlcSigns.length,
      block_height: blockHeight,
      block_hash: block.hash,
      network,
      chain,
    });
  }
}
