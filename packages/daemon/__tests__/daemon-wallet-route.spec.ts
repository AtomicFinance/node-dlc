import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiLike from 'chai-like';
import chaiThings from 'chai-things';
import Server from '../lib/server';
import { ConsoleTransport, Logger } from '@node-lightning/logger';
import { Application } from 'express';
import express from 'express';
import * as util from './daemon';
import { Endpoint } from '../lib/routes';
import {
  ContractInfoV0,
  DlcAcceptV0,
  DlcOfferV0,
  DlcSignV0,
  FundingInputV0,
  OracleAttestationV0,
  OrderAcceptV0,
  OrderNegotiationFieldsV0,
  OrderNegotiationFieldsV1,
  OrderOfferV0,
} from '@node-dlc/messaging';
import { confToLogLevel } from '../lib/utils/config';
import HttpException from '../lib/routes/handler/HttpException';
import request from 'superagent';
import { sha256, xor } from '@node-lightning/crypto';
import { createWallet, getBalance, getInput, getNewAddress } from './wallet';
import { client, fundAddress, importAndFundClient, node } from './chain';
import { checkTypes } from '@atomicfinance/bitcoin-dlc-provider';
import { DlcTxBuilder } from '@node-dlc/core';

chai.use(chaiHttp);
chai.should();
const expect = chai.expect;
chai.use(chaiLike);
chai.use(chaiThings);

describe('Wallet Routes', () => {
  const argv = util.getArgv('wallet');
  let server: Server;
  const logger = new Logger('DLCd');
  if (util.enableLogger) {
    logger.transports.push(new ConsoleTransport(console));
    logger.level = confToLogLevel(argv.loglevel);
  }
  const app: Application = express();
  const apiPrefix = 'api';
  const apiV0Prefix = 'api/v0';

  before(async () => {
    util.rmdir(argv.datadir);
    server = new Server(app, argv, logger);
    server.start();
    createWallet(server);
    await importAndFundClient();
  });

  after(async () => {
    util.rmdir(argv.datadir);
    server.stop();
  });

  describe(`GET ${apiPrefix}/${Endpoint.WalletUnspent}`, () => {
    it('should return all utxos', async () => {
      const firstInput = await getInput(server);
      const secondInput = await getInput(server);

      const res: request.Response = await chai
        .request(server.app)
        .get(`/${apiPrefix}/${Endpoint.WalletUnspent}`)
        .auth('admin', util.apikey);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.utxos.should.be.an('array');
      res.body.utxos.forEach((utxo) => {
        expect(utxo).to.have.property('txid');
      });
      expect(
        res.body.utxos.findIndex((utxo) => utxo.txid === firstInput.txid),
      ).to.not.equal(-1);
      expect(
        res.body.utxos.findIndex((utxo) => utxo.txid === secondInput.txid),
      ).to.not.equal(-1);
    });
  });

  describe(`POST ${apiPrefix}/${Endpoint.WalletSendCoins}`, () => {
    it('should send coins to address', async () => {
      const input = await getInput(server);

      const address = await node.wallet.getUnusedAddress();
      const addr = address.address;
      const amt = Math.ceil(input.value / 2);
      const feerate = 30;

      const res: request.Response = await chai
        .request(server.app)
        .post(`/${apiPrefix}/${Endpoint.WalletSendCoins}`)
        .auth('admin', util.apikey)
        .send({
          addr,
          amt,
          feerate,
        });

      res.should.have.status(200);
      res.body.should.be.an('object');
      res.body.txid.should.be.a('string');

      const tx = await client.chain.getTransactionByHash(res.body.txid);
      expect(tx.hash).to.equal(res.body.txid);
      expect(
        tx._raw.vout.findIndex(
          (vout) => vout.scriptPubKey.addresses[0] === addr,
        ),
      ).to.not.equal(-1);
    });
  });

  describe(`POST ${apiPrefix}/${Endpoint.WalletSweepCoins}`, () => {
    it('should sweep coins from wallet', async () => {
      await getInput(server);

      const address = await node.wallet.getUnusedAddress();
      const addr = address.address;
      const feerate = 30;

      const balanceBefore = await getBalance(server);

      const res: request.Response = await chai
        .request(server.app)
        .post(`/${apiPrefix}/${Endpoint.WalletSweepCoins}`)
        .auth('admin', util.apikey)
        .send({
          addr,
          feerate,
        });

      res.should.have.status(200);
      res.body.should.be.an('object');
      res.body.txid.should.be.a('string');

      const balanceAfter = await getBalance(server);

      const tx = await client.chain.getTransactionByHash(res.body.txid);
      expect(tx.hash).to.equal(res.body.txid);
      expect(
        tx._raw.vout.findIndex(
          (vout) => vout.scriptPubKey.addresses[0] === addr,
        ),
      ).to.not.equal(-1);
      expect(balanceAfter).to.equal(0);
      expect(balanceBefore).to.be.greaterThan(balanceAfter);
    });
  });

  describe(`POST ${apiPrefix}/${Endpoint.WalletSendMany}`, () => {
    it('should send coins to many addresses', async () => {
      const input = await getInput(server);

      const addressOne = (await node.wallet.getUnusedAddress()).address;
      const addressTwo = (await getNewAddress(server)).address;

      const outputs = {};
      outputs[addressOne] = Math.ceil(input.value / 4);
      outputs[addressTwo] = Math.ceil(input.value / 4);

      const feerate = 30;

      const balanceBefore = Number(await getBalance(server));

      const res: request.Response = await chai
        .request(server.app)
        .post(`/${apiPrefix}/${Endpoint.WalletSendMany}`)
        .auth('admin', util.apikey)
        .send({
          outputs,
          feerate,
        });

      res.should.have.status(200);
      res.body.should.be.an('object');
      res.body.txid.should.be.a('string');

      const balanceAfter = Number(await getBalance(server));

      const tx = await client.chain.getTransactionByHash(res.body.txid);
      expect(tx.hash).to.equal(res.body.txid);
      expect(
        tx._raw.vout.findIndex(
          (vout) => vout.scriptPubKey.addresses[0] === addressOne,
        ),
      ).to.not.equal(-1);
      expect(
        tx._raw.vout.findIndex(
          (vout) => vout.scriptPubKey.addresses[0] === addressTwo,
        ),
      ).to.not.equal(-1);
      expect(balanceBefore).to.be.greaterThan(balanceAfter);
    });
  });
});
