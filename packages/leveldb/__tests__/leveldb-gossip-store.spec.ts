// tslint:disable: no-unused-expression

import { NodeAnnouncementMessage } from '@node-dlc/wire';
import { expect } from 'chai';

import { LeveldbGossipStore } from '../lib/leveldb-gossip-store';
import * as util from './leveldb';

describe('LeveldbGossipStore', () => {
  let sut: LeveldbGossipStore;

  const nodeAnnHex = Buffer.from("01015254ffbc21374af9d998355151515933de1d998e9cb124aa4d65a7aa6b473e75201420c58f2414f4fb7461f3f133ab529cbbf9a57365ed6bcf775172826fdc7500005ae86dba039cc950286a8fa99218283d1adc2456e0d5e81be558da77dd6e85ba9a1fff5ad3f8e71c79616c6c732e6f7267000000000000000000000000000000000000000000000000070122c8fc922607", "hex"); // prettier-ignore
  const nodeAnn = NodeAnnouncementMessage.deserialize(nodeAnnHex);

  const nick = 'A033vb7L82Z4EBMq';

  before(async () => {
    util.rmdir('.testdb');
    sut = new LeveldbGossipStore('./.testdb/nested/dir');
    await sut.open();
  });

  after(async () => {
    await sut.close();
    util.rmdir('.testdb');
  });

  describe('save temp_contract_id by nick', () => {
    it('should save temp_contract_id by nick', async () => {
      await sut.saveNodeIdByNick(nodeAnn, nick);
    });
  });

  describe('find temp_contract_ids by nick', () => {
    it('should return the temp_contract_id object', async () => {
      const actual = await sut.findNodeIdByNick(nick);

      expect(actual).to.deep.equal(nodeAnn.nodeId);
    });
  });

  describe('delete temp_contract_ids by nick', () => {
    it('should delete temp_contract_ids', async () => {
      await sut.deleteNodeIdByNick(nick);

      const actual = await sut.findNodeIdByNick(nick);
      expect(actual).to.be.undefined;
    });
  });
});
