import chai from 'chai';
import chaiHttp from 'chai-http';
import Server from '../lib/server';
import { ConsoleTransport, Logger } from '@node-lightning/logger';
import { Application } from 'express';
import express from 'express';
import * as util from './daemon';
import { Endpoint } from '../lib/routes';
import {
  ContractInfoV0,
  OrderAcceptV0,
  OrderNegotiationFieldsV0,
  OrderNegotiationFieldsV1,
  OrderOfferV0,
} from '@node-dlc/messaging';
import { confToLogLevel } from '../lib/utils/config';
import HttpException from '../lib/routes/handler/HttpException';
import request from 'superagent';
import { sha256 } from '@node-lightning/crypto';
import { createWallet } from './wallet';

chai.use(chaiHttp);
chai.should();
const expect = chai.expect;

describe('Info Routes', () => {
  const argv = util.getArgv('info');
  let server: Server;
  const logger = new Logger('DLCd');
  if (util.enableLogger) {
    logger.transports.push(new ConsoleTransport(console));
    logger.level = confToLogLevel(argv.loglevel);
  }
  const app: Application = express();
  const apiPrefix = 'api';

  before(async () => {
    util.rmdir(argv.datadir);
    server = new Server(app, argv, logger);
    server.start();
    createWallet(server);
  });

  after(async () => {
    util.rmdir(argv.datadir);
    server.stop();
  });

  describe(`GET ${apiPrefix}/${Endpoint.GetInfo}`, () => {
    it('should return info object', (done) => {
      chai
        .request(server.app)
        .get(`/${apiPrefix}/${Endpoint.GetInfo}`)
        .end((err: HttpException, res: request.Response) => {
          expect(err).to.equal(null);
          res.should.have.status(200);
          res.body.should.be.a('object');
          expect(res.body.num_dlc_offers).to.equal(0);
          done();
        });
    });
  });
});
