import { Logger } from '@node-lightning/logger';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { Request, Response } from 'express';
import { IArguments, IDB } from '../../utils/config';
import { routeErrorHandler } from '../handler/ErrorHandler';
import BaseRoutes from '../base';
import { Client } from '../../client';
import { Address } from '@liquality/types';
import BN from 'bignumber.js';
import {
  validateBigInt,
  validateNumber,
  validateString,
} from '../validate/ValidateFields';

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

  public async getUnspent(req: Request, res: Response): Promise<Response> {
    const addresses = await this.client.client.wallet.getUsedAddresses();

    const utxos = await this.client.client.getMethod('getUnspentTransactions')(
      addresses,
    );

    return res.json({ utxos });
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

  public async postSendCoins(req: Request, res: Response): Promise<Response> {
    const { addr, amt, feerate } = req.body;

    validateString(addr, 'Address', this, res);
    validateBigInt(amt, 'Amount', this, res);
    if (feerate) validateNumber(feerate, 'Feerate', this, res);

    const to = addr;
    const value = new BN(amt);
    const fee = feerate ? Number(feerate) : feerate;

    const tx = await this.client.client.chain.sendTransaction({
      to,
      value,
      fee,
    });

    return res.json({ txid: tx.hash });
  }

  public async postSweepCoins(req: Request, res: Response): Promise<Response> {
    const { addr, feerate } = req.body;

    validateString(addr, 'Address', this, res);
    if (feerate) validateNumber(feerate, 'Feerate', this, res);

    const fee = feerate ? Number(feerate) : feerate;

    const tx = await this.client.client.chain.sendSweepTransaction(addr, fee);

    return res.json({ txid: tx.hash });
  }

  public async postSendMany(req: Request, res: Response): Promise<Response> {
    const { outputs, feerate } = req.body;

    if (feerate) validateNumber(feerate, 'Feerate', this, res);
    // TODO: validate if outputs is proper object

    const fee = Number(feerate);
    const txs: SendOptions[] = [];
    Object.keys(outputs).forEach((to, i) => {
      const value = new BN(outputs[to]);
      txs.push({ to, value, fee });
    });

    const tx = await this.client.client.chain.sendBatchTransaction(txs);

    return res.json({ txid: tx.hash });
  }
}

interface SendOptions {
  to: Address | string;
  value: BN;
  data?: string;
  fee?: number;
}
