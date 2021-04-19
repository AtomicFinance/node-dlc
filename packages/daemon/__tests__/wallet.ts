import chai from 'chai';
import chaiHttp from 'chai-http';
import { Endpoint } from '../lib/routes';
import Server from '../lib/server';
import { apiPrefix, apikey } from './daemon';
import request from 'superagent';
import HttpException from '../lib/routes/handler/HttpException';
import * as util from './daemon';
import { Input } from '@atomicfinance/types';
import { decodeRawTransaction } from '@liquality/bitcoin-utils';
import { fundAddress, bitcoinNetwork } from './chain';
import BN from 'bignumber.js';

chai.use(chaiHttp);
chai.should();
const expect = chai.expect;

export const createWallet = (server: Server): void => {
  /**
   * Create Wallet
   */
  chai
    .request(server.app)
    .post(`/${apiPrefix}/${Endpoint.WalletCreate}`)
    .auth('admin', apikey)
    .end((err: HttpException, res: request.Response) => {
      expect(err).to.equal(null);
      res.should.have.status(200);
    });
};

export const getNewAddress = async (
  server: Server,
): Promise<INewAddressResponse> => {
  const res: request.Response = await chai
    .request(server.app)
    .get(`/${apiPrefix}/${Endpoint.WalletNewAddress}`)
    .auth('admin', util.apikey);

  res.should.have.status(200);
  res.body.should.be.a('object');
  res.body.address.should.be.a('string');

  return res.body;
};

export const getBalance = async (server: Server): Promise<number> => {
  const res: request.Response = await chai
    .request(server.app)
    .get(`/${apiPrefix}/${Endpoint.WalletBalance}`)
    .auth('admin', util.apikey);

  res.should.have.status(200);
  res.body.should.be.a('object');
  res.body.balance.should.be.a('string');

  return Number(res.body.balance);
};

export const getInput = async (server: Server): Promise<Input> => {
  const { address: unusedAddress, derivationPath } = await getNewAddress(
    server,
  );

  const txRaw = await fundAddress(unusedAddress);
  const tx = await decodeRawTransaction(txRaw._raw.hex, bitcoinNetwork);

  const vout = tx.vout.find(
    (vout) => vout.scriptPubKey.addresses[0] === unusedAddress,
  );

  const input: Input = {
    txid: tx.txid,
    vout: vout.n,
    address: unusedAddress,
    scriptPubKey: vout.scriptPubKey.hex,
    amount: vout.value,
    value: new BN(vout.value).times(1e8).toNumber(),
    derivationPath,
    maxWitnessLength: 108,
    redeemScript: '',
    toUtxo: Input.prototype.toUtxo,
  };

  return input;
};

interface INewAddressResponse {
  address: string;
  derivationPath: string;
  publicKey: string;
}
