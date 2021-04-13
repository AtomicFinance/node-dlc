import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import { entropyToMnemonic } from 'bip39';
import DlcdClient from '../../lib/client/DlcdClient';
import { Logger } from '@node-dlc/logger';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('DlcdClient', () => {
  const host = '127.0.0.1';
  const port = 8575;
  const apiKey =
    '15b26b5e281479d19c0440e3f1a6aec4efe4c6b0989d10cb8930c6a85ad10af9';
  const logger = new Logger();

  describe('get', () => {
    const expectedInfoResponse = {
      version: '0.1.0',
      num_dlc_offers: 0,
      num_dlc_accepts: 0,
      num_dlc_signs: 0,
    };

    beforeEach(() => {
      nock(`http://${host}:${port}`)
        .get('/api/getinfo')
        .reply(200, expectedInfoResponse);
    });

    it('should return response data if status 200', async () => {
      const client = new DlcdClient(host, port, logger);
      const actualResponse = await client.get('/getinfo');
      expect(expectedInfoResponse).to.deep.equal(actualResponse);
    });
  });

  describe('post', () => {
    const mnemonic = entropyToMnemonic('00000000000000000000000000000000');

    beforeEach(() => {
      nock(`http://${host}:${port}`)
        .post('/api/wallet/create')
        .reply(200, { mnemonic })
        .post('/api/wallet/create')
        .reply(400, { error: 'Api Key Required' });
    });

    it('should return response data if status 200', async () => {
      const client = new DlcdClient(host, port, logger, apiKey);
      const actualResponse = await client.post('/wallet/create');
      expect({ mnemonic }).to.deep.equal(actualResponse);
    });

    it('should reject and log error if status 400', async () => {
      let consoleError = '';
      console.error = (err) => {
        consoleError = err;
      };
      const client = new DlcdClient(host, port, logger);
      expect(client.post('/wallet/create')).to.be.rejected.then((_) => {
        expect(consoleError).to.equal('Api Key Required');
      });
    });
  });
});
