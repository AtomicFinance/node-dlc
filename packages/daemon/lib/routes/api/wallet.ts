import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { Request, Response } from 'express';
import { IArguments, IDB } from '../../utils/config';
import { routeErrorHandler } from '../handler/ErrorHandler';
import BaseRoutes from '../base';
import { Client } from '../../client';
import { Address } from '@liquality/types';

export default class WalletRoutes extends BaseRoutes {
  constructor(argv: IArguments, db: IDB, logger: Logger, client: Client) {
    super(argv, db, logger, client);
  }

  public async getNewAddress(req: Request, res: Response): Promise<Response> {
    const { change } = req.query;

    let _change = false;
    if (typeof change === 'string' && change === 'true') _change = true;

    const address: Address = await this.client.client.financewallet.getUnusedAddress(
      _change,
    );
    await this.client.saveAddressCache();

    if (this.client.rpc)
      await this.client.importAddressesToRpc([address.address]);

    return res.json({
      address: address.address,
      derivationPath: address.derivationPath,
      publicKey: Buffer.from(address.publicKey, 'hex').toString('hex'),
    });
  }

  public async getBalance(req: Request, res: Response): Promise<Response> {
    const addresses = await this.client.client.wallet.getUsedAddresses();

    const balance = await this.client.client.chain.getBalance(addresses);

    return res.json({ balance });
  }

  public async postCreate(req: Request, res: Response): Promise<Response> {
    let apikey: string;
    if (req.headers.authorization) {
      apikey = Buffer.from(req.headers.authorization.split(' ')[1], 'base64')
        .toString()
        .split(':')[1];
    }
    const { mnemonic: _mnemonic } = req.body;

    if (!apikey) return routeErrorHandler(this, res, 401, 'Api Key Required');

    const walletExists = await this.db.wallet.checkSeed();
    if (walletExists)
      return routeErrorHandler(this, res, 403, 'Wallet already created');

    let mnemonic: string;
    if (!mnemonic) {
      this.logger.info(`Cipher seed mnemonic not provided. Generating...`);
      mnemonic = generateMnemonic(256);
    } else if (typeof _mnemonic === 'string') {
      mnemonic = _mnemonic;
    }

    if (!validateMnemonic(mnemonic))
      return routeErrorHandler(this, res, 400, 'Invalid Mnemonic');

    this.logger.info(`Saving cipher seed mnemonic to DB...`);
    await this.db.wallet.saveSeed(mnemonic, Buffer.from(apikey, 'hex'));
    await this.client.setSeed(mnemonic);

    res.json({ mnemonic });
  }
}
