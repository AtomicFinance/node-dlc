// tslint:disable: no-unused-expression

import chai from "chai";
import chaiAsPromised from 'chai-as-promised'
import { RocksdbWalletStore } from "../lib/rocksdb-wallet-store";
import { generateMnemonic } from "bip39"
import * as bcrypto from "bcrypto"
import * as util from "./rocksdb";

chai.use(chaiAsPromised)
const expect = chai.expect

describe("RocksdbGossipStore", () => {
  let sut: RocksdbWalletStore;

  const mnemonic = generateMnemonic(256)
  const apiKey = bcrypto.random.randomBytes(32)

  before(async () => {
    util.rmdir(".testdb");
    sut = new RocksdbWalletStore("./.testdb/nested/dir");
    await sut.open();
  });

  after(async () => {
    await sut.close();
    util.rmdir(".testdb");
  });

  describe("check seed before", () => {
    it("should return false if no seed", async () => {
      const seedExists = await sut.checkSeed()
      expect(seedExists).to.equal(false)
    })
  })

  describe("save seed", () => {
    it("should save seed", async () => {
      await sut.saveSeed(mnemonic, apiKey)
    })

    it("should fail with duplicate seed", async () => {
      expect(sut.saveSeed(mnemonic, apiKey)).to.be.eventually.rejectedWith(Error)
    })
  })

  describe("check seed after", () => {
    it("should return true if seed exists", async () => {
      const seedExists = await sut.checkSeed()
      expect(seedExists).to.equal(true)
    })
  })

  describe("find seed", () => {
    it("should return the seed object", async () => {
      const actual = await sut.findSeed(apiKey)
      expect(actual).to.deep.equal(mnemonic)
    })
  })

  describe("delete seed", () => {
    it("should delete seed", async () => {
      await sut.deleteSeed(apiKey)

      expect(sut.findSeed(apiKey)).to.be.eventually.rejectedWith(Error)
    });
  })
});
