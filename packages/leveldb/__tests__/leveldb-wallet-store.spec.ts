// tslint:disable: no-unused-expression

import { AddressCache } from '@node-dlc/messaging';
import { generateMnemonic } from 'bip39';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { randomBytes } from 'crypto';

import { LeveldbWalletStore } from '../lib/leveldb-wallet-store';
import * as util from './leveldb';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('LeveldbWalletStore', () => {
  let sut: LeveldbWalletStore;

  const mnemonic = generateMnemonic(256);
  const apiKey = randomBytes(32);

  const addressCacheHex = Buffer.from(
    "fe6c" + // type address_cache
      "02" + // num_cache_spks
      "16" + // cache_spk_1_len
      "0014c9c950ceb96d430394cfcad2a64b033d3178b189" + // cache_spk_1
      "16" + // cache_spk_2_len
      "00145e350a1eb28fbc5f5e102e627ae54038e6fddc5c" // cache_spk_2
    , "hex"
  ); // prettier-ignore

  const addressCache = AddressCache.deserialize(addressCacheHex);

  before(async () => {
    util.rmdir('.testdb');
    sut = new LeveldbWalletStore('./.testdb/nested/dir');
    await sut.open();
  });

  after(async () => {
    await sut.close();
    util.rmdir('.testdb');
  });

  describe('check seed before', () => {
    it('should return false if no seed', async () => {
      const seedExists = await sut.checkSeed();
      expect(seedExists).to.equal(false);
    });
  });

  describe('save seed', () => {
    it('should save seed', async () => {
      await sut.saveSeed(mnemonic, apiKey);
    });

    it('should fail with duplicate seed', async () => {
      expect(sut.saveSeed(mnemonic, apiKey)).to.be.eventually.rejectedWith(
        Error,
      );
    });
  });

  describe('check seed after', () => {
    it('should return true if seed exists', async () => {
      const seedExists = await sut.checkSeed();
      expect(seedExists).to.equal(true);
    });
  });

  describe('find seed', () => {
    it('should return the seed object', async () => {
      const actual = await sut.findSeed(apiKey);
      expect(actual).to.deep.equal(mnemonic);
    });
  });

  describe('delete seed', () => {
    it('should delete seed', async () => {
      await sut.deleteSeed(apiKey);

      expect(sut.findSeed(apiKey)).to.be.eventually.rejectedWith(Error);
    });
  });

  describe('save address cache', () => {
    it('should save address cache', async () => {
      await sut.saveAddressCache(addressCache);
    });
  });

  describe('find address cache', () => {
    it('should return the address cache object', async () => {
      const actual = await sut.findAddressCache();
      expect(actual.serialize()).to.deep.equal(addressCacheHex);
    });
  });
});
