// tslint:disable: no-unused-expression

import { DlcInfoV0 } from '@node-dlc/messaging';
import { expect } from 'chai';

import { LeveldbInfoStore } from '../lib/leveldb-info-store';
import * as util from './leveldb';

describe('LeveldbDlcStore', () => {
  let sut: LeveldbInfoStore;

  const dlcInfoHex = Buffer.from(
    "ef32" + // type
    "0000000a" + // num dlc offers
    "00000009" + // num dlc accepts
    "00000009" + // num dlc signs
    "00000004" + // num dlc cancels
    "00000004" + // num dlc closes
    "00000009" // num dlc transactions
    , "hex"
  ); // prettier-ignore

  const dlcInfo = DlcInfoV0.deserialize(dlcInfoHex);

  before(async () => {
    util.rmdir('.testdb');
    sut = new LeveldbInfoStore('./.testdb/nested/dir');
    await sut.open();
  });

  after(async () => {
    await sut.close();
    util.rmdir('.testdb');
  });

  describe('save dlc_info', () => {
    it('should save dlc_info', async () => {
      await sut.saveDlcInfo(dlcInfo);
    });
  });

  describe('find dlc_info', () => {
    it('should return the dlc_info object', async () => {
      const actual = await sut.findDlcInfo();
      expect(actual).to.deep.equal(dlcInfo);
    });
  });

  describe('increment dlc_info value', () => {
    it('should increments offers', async () => {
      await sut.incrementDlcInfoValues(['offer']);
      const actual = await sut.findDlcInfo();
      expect(actual.numDlcOffers).to.equal(11);
    });
  });

  describe('delete dlc_info', () => {
    it('should delete dlc_info', async () => {
      await sut.deleteDlcInfo();

      const actual = await sut.findDlcInfo();
      expect(actual).to.be.undefined;
    });
  });
});
