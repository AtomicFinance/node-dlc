import { Logger } from '@node-lightning/logger';
import { Request, Response } from 'express';
import { version } from '../../../package.json';
import { IArguments, IDB } from '../../utils/config';
import BaseRoutes from '../base';
import { Client } from '../../client';
import { Block } from '@liquality/types';
import { BitcoinNetwork } from '@liquality/bitcoin-networks';

export default class InfoRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async getInfo(req: Request, res: Response): Promise<Response> {
    const dlcOffers = await this.db.dlc.findDlcOffers();
    const dlcAccepts = await this.db.dlc.findDlcAccepts();
    const dlcSigns = await this.db.dlc.findDlcSigns();

    const blockHeight: number = await this.client.client.chain.getBlockHeight();
    const block: Block = await this.client.client.chain.getBlockByNumber(
      blockHeight,
    );
    const bitcoinNetwork: BitcoinNetwork = await this.client.network;

    const [chain, network] = bitcoinNetwork.name.split('_');

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
