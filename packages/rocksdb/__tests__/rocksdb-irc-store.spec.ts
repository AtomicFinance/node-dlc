// tslint:disable: no-unused-expression

import { expect } from 'chai';

import { RocksdbIrcStore } from '../lib/rocksdb-irc-store';
import * as util from './rocksdb';

describe('RocksdbIrcStore', () => {
  let sut: RocksdbIrcStore;

  const tempContractId = Buffer.from(
    'a860dfb8d9eb5412d98c2c12936150ed606fb078edacd256aa4eef94cefc6c7d',
    'hex',
  );

  const tempContractId2 = Buffer.from(
    '59830ebc3a4184110566bf1a290d08473dfdcbd492ce498b14cd1a5e2fa2e441',
    'hex',
  );

  const contractId = Buffer.from(
    '4a74dfc6da77550e2971eba10a9a1eef9253b000c00d96f5c6589ebef1c84b7b',
    'hex',
  );

  const contractId2 = Buffer.from(
    '639e1ce562a40107e9e72276ead73144098f92df41b90db2a251e8e030c522a6',
    'hex',
  );

  const nick = 'A033vb7L82Z4EBMq';

  before(async () => {
    util.rmdir('.testdb');
    sut = new RocksdbIrcStore('./.testdb/nested/dir');
    await sut.open();
  });

  after(async () => {
    await sut.close();
    util.rmdir('.testdb');
  });

  describe('save temp_contract_id by nick', () => {
    it('should save temp_contract_id by nick', async () => {
      await sut.saveTempContractIdByNick(tempContractId, nick);
      await sut.saveTempContractIdByNick(tempContractId2, nick);
    });
  });

  describe('find temp_contract_ids by nick', () => {
    it('should return the temp_contract_id object', async () => {
      const actual = await sut.findTempContractIdsByNick(nick);

      expect(actual.ids[0]).to.deep.equal(tempContractId);
      expect(actual.ids[1]).to.deep.equal(tempContractId2);
    });
  });

  describe('delete temp_contract_ids by nick', () => {
    it('should delete temp_contract_ids', async () => {
      await sut.deleteTempContractIdsByNick(nick);

      const actual = await sut.findTempContractIdsByNick(nick);
      expect(actual).to.be.undefined;
    });
  });

  describe('save contract_id by nick', () => {
    it('should save contract_id by nick', async () => {
      await sut.saveContractIdByNick(contractId, nick);
      await sut.saveContractIdByNick(contractId2, nick);
    });
  });

  describe('find contract_ids by nick', () => {
    it('should return the contract_id object', async () => {
      const actual = await sut.findContractIdsByNick(nick);

      expect(actual.ids[0]).to.deep.equal(contractId);
      expect(actual.ids[1]).to.deep.equal(contractId2);
    });
  });

  describe('delete contract_ids by nick', () => {
    it('should delete contract_ids', async () => {
      await sut.deleteContractIdsByNick(nick);

      const actual = await sut.findContractIdsByNick(nick);
      expect(actual).to.be.undefined;
    });
  });
});
