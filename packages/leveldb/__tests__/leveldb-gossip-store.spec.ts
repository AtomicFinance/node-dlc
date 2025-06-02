// tslint:disable: no-unused-expression

import { ShortChannelId } from '@node-dlc/core';
import {
  ChannelAnnouncementMessage,
  ChannelUpdateMessage,
  ExtendedChannelAnnouncementMessage,
  NodeAnnouncementMessage,
} from '@node-dlc/wire';
import { expect } from 'chai';

import { LeveldbGossipStore } from '../lib/leveldb-gossip-store';
import * as util from './leveldb';

describe('LeveldbGossipStore', () => {
  let sut: LeveldbGossipStore;

  const chanAnnHex = Buffer.from("0100ce1d69dbb62e86ad28157f4c24705e325f069d5158b91b28bdf55e508afcc1b554a498f4bda8a3d34a206ddb617ad0e945ecadc9a61086bac5afae3e19976242d464e8d305772f29021a4d07617c4159e7e0634bd53991c0e0577c0e9c3d3ee61d7311e6773275335c12f17e573e2813391a71050ab58c03c17d06c0d841db2ec6c6514c2156713651dfbee13d491559764c95343386218ab904173742dde6ca3118d303967e073a44e94f16eef4d878d4d74f1ff1f6924109421cf9c41e8e5c961cf1c7e2316e61a952c7caad056fea1d13d2f4bf855bd3f06d019a33814bc70ea99fa79f026c791b87040e781e8493f5165dafbfc23fabe2912c3ed0ab7e0f000043497fd7f826957108f4a30fd9cec3aeba79972084e90ead01ea33090000000013a9090000030000036b96e4713c5f84dcb8030592e1bd42a2d9a43d91fa2e535b9bfd05f2c5def9b9039cc950286a8fa99218283d1adc2456e0d5e81be558da77dd6e85ba9a1fff5ad303ca63b9acbadf5b644c11d0a9dd65b82b14e0d26fc5e0bcf071a90879f603d46203a0ee0a716f4a436864fe53bb788a003321aee63150bf63fd5529e4e1da93481d", "hex"); // prettier-ignore
  const chanAnn = ChannelAnnouncementMessage.deserialize(chanAnnHex);
  const nodeId1 = Buffer.from("036b96e4713c5f84dcb8030592e1bd42a2d9a43d91fa2e535b9bfd05f2c5def9b9", "hex"); // prettier-ignore
  const nodeId2 = Buffer.from("039cc950286a8fa99218283d1adc2456e0d5e81be558da77dd6e85ba9a1fff5ad3", "hex"); // prettier-ignore
  const scid = new ShortChannelId(1288457, 3, 0);

  const chanAnn2 = ChannelAnnouncementMessage.deserialize(Buffer.from("01009b33af5fe59b236b2383ed442fa7c1361a68fe13f89f9c9712ae04b9eb13ce962584851bedf84b9682ed3c351828164d6f24fcdaf1ad577f6378c170fb68a1fac5daa19b89932d2aeaa0327aaf7da830e5b15e0d033fa62613e2a35b67fc53d02ab5f2335733dda30ba24751f33d229af579927e09a94a619dd4a4626615f1c1de45fdf85a1702805d0708bc676ddfb99b27308ea6e12fd76200c65a01c4d9fe7d9e96f20e09949d539fedeaf88cea8a2df7d28a4ddcb622559ccf1624ba61f4270e93a347b0c8329ec6c6162e450ebc0fe07611ff90d33f5b0fb9466ea306ec30e4bf688d619c903c79eacd0e05ae91ec84e370d4e572b100c19f4a3d53e172000043497fd7f826957108f4a30fd9cec3aeba79972084e90ead01ea33090000000013a90e0000030000036b96e4713c5f84dcb8030592e1bd42a2d9a43d91fa2e535b9bfd05f2c5def9b903e5f9d1935c67a029bf0a26af5f63109f4f4c45993a8f45177a8f2f39bcb46144033164d62ebff9e5c20b524dd796251113e5fe93bdafced041159cc0df8e95a28b03a3d66f3f59bf350ae414d2cc510899c684801ebd61b3b9fcf22731462ed9d80e", "hex")); // prettier-ignore

  const extChanAnnHex = Buffer.from("010027927395fe531904ecae995006cbbfe1338482c23008bc46a357a4f629cc47dd0f85651fbe47f779dcfab1cd4908de6a66843b364d6dfc848eb3e5459d00eab5b9674df33652a36bdac711098fdd2adb97d0bfd6f134ac1f9caa420919bfb55d17c3c606d468da05ff0054b40e41e7f4be93f793101b625f68d7124ccd70bc7315df61709a912458e6a378420b1a44ef914062f9a14c84b61226898d6e81a4be31a27e7b19237001c189e523bebd51af289520ff935b98db5426d5b22b1ac56fb063dd7a82583211185fea8bd7a47f1dec88fbda2377f76dfc253cc85e7c33231023d6647f1379e84ff36b4286edd1a2a71f817964bb16f0fd19254ce6441d5a000043497fd7f826957108f4a30fd9cec3aeba79972084e90ead01ea33090000000013a9160000040000036b96e4713c5f84dcb8030592e1bd42a2d9a43d91fa2e535b9bfd05f2c5def9b903c3feb1e9b84d7aa83ea93f1bc58bfe34fa17603d955eb723a9d236336d97f9e9028154cc6b7fb5e58e0bf989de51b8d946183918c5aa08f361825a2b9e767783b803338034d89e56588f7117653074c4ee1920082d53b20710b2578e0d3f08dcfc33fe010000372019ae00cc05676137495595172ff82382e0c7f8b7bd512a26e6c4b6af4093ed9ffe0100003903ffff65", "hex"); // prettier-ignore
  const extChanAnn = ExtendedChannelAnnouncementMessage.deserialize(
    extChanAnnHex,
  );

  const chanUpdateHex = Buffer.from("01024e6eac97124742ba6a033612c8009945c0d52568756a885692b4adbf202666503b56ecb6f5758ea450dda940b2a6853b8e1706c3bd4f38a347be91b08c5e5c4743497fd7f826957108f4a30fd9cec3aeba79972084e90ead01ea33090000000013a90900000300005cdd9d780002009000000000000003e8000003e800000001", "hex"); // prettier-ignore
  const chanUpdate = ChannelUpdateMessage.deserialize(chanUpdateHex);

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
