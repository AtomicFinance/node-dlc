import chai from 'chai';
import chaiHttp from 'chai-http';
import { Endpoint } from '../lib/routes';
import Server from '../lib/server';
import { apiPrefix, apikey } from './daemon';
import request from 'superagent';
import HttpException from '../lib/routes/handler/HttpException';

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
