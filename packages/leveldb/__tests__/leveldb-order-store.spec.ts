// tslint:disable: no-unused-expression

import { sha256 } from '@node-dlc/crypto';
import {
  ContractInfoType,
  EnumeratedDescriptor,
  EnumEventDescriptor,
  OracleAnnouncement,
  OracleEvent,
  OrderAccept,
  OrderOffer,
  SingleContractInfo,
  SingleOracleInfo,
} from '@node-dlc/messaging';
import { expect } from 'chai';

import { LeveldbOrderStore } from '../lib/leveldb-order-store';
import * as util from './leveldb';

describe('LeveldbOrderStore', () => {
  let sut: LeveldbOrderStore;

  // Helper function to create test order offer programmatically
  function createTestOrderOffer(refundLocktime = 200): OrderOffer {
    // Create enum event descriptor
    const eventDescriptor = new EnumEventDescriptor();
    eventDescriptor.outcomes = ['dummy1', 'dummy2'];

    // Create oracle event
    const oracleEvent = new OracleEvent();
    oracleEvent.eventMaturityEpoch = 0;
    oracleEvent.eventDescriptor = eventDescriptor;
    oracleEvent.eventId = 'dummy';
    oracleEvent.oracleNonces = [Buffer.alloc(32, 0x3c)];

    // Create oracle announcement
    const oracleAnnouncement = new OracleAnnouncement();
    oracleAnnouncement.announcementSig = Buffer.alloc(64, 0xfa);
    oracleAnnouncement.oraclePublicKey = Buffer.alloc(32, 0xda);
    oracleAnnouncement.oracleEvent = oracleEvent;

    // Create oracle info
    const oracleInfo = new SingleOracleInfo();
    oracleInfo.announcement = oracleAnnouncement;

    // Create contract descriptor
    const contractDescriptor = new EnumeratedDescriptor();
    contractDescriptor.outcomes = [
      { outcome: 'dummy1', localPayout: BigInt(0) },
      { outcome: 'dummy2', localPayout: BigInt(153323539) },
      { outcome: 'dummy3', localPayout: BigInt(200000000) },
    ];

    // Create contract info
    const contractInfo = new SingleContractInfo();
    contractInfo.contractInfoType = ContractInfoType.Single;
    contractInfo.totalCollateral = BigInt(200000000);
    contractInfo.contractDescriptor = contractDescriptor;
    contractInfo.oracleInfo = oracleInfo;

    // Create order offer
    const orderOffer = new OrderOffer();
    orderOffer.protocolVersion = 1;
    orderOffer.contractFlags = Buffer.from('00', 'hex');
    orderOffer.chainHash = Buffer.from(
      '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
      'hex',
    );
    orderOffer.temporaryContractId = Buffer.from(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      'hex',
    );
    orderOffer.contractInfo = contractInfo;
    orderOffer.offerCollateralSatoshis = BigInt(100000000);
    orderOffer.feeRatePerVb = BigInt(1);
    orderOffer.cetLocktime = 100;
    orderOffer.refundLocktime = refundLocktime;

    return orderOffer;
  }

  // Helper function to create test order accept programmatically
  function createTestOrderAccept(tempOrderId: Buffer): OrderAccept {
    const orderAccept = new OrderAccept();
    orderAccept.tempOrderId = tempOrderId;

    // negotiationFields is now optional - no need to set it for basic tests

    return orderAccept;
  }

  const orderOffer = createTestOrderOffer();
  const orderOffer2 = createTestOrderOffer(201); // Different refund locktime
  const orderOfferWithMetadata = createTestOrderOffer();

  const orderOfferHex = orderOffer.serialize();
  const orderOfferHex2 = orderOffer2.serialize();
  const orderOfferWithMetadataHex = orderOfferWithMetadata.serialize();

  const tempOrderId = sha256(orderOfferHex);
  const tempOrderId2 = sha256(orderOfferHex2);
  const tempOrderWithMetadataId = sha256(orderOfferWithMetadataHex);

  const orderAccept = createTestOrderAccept(tempOrderId);
  const orderAccept2 = createTestOrderAccept(tempOrderId2);

  const orderMetadataId = Buffer.alloc(32, 0); // Placeholder for metadata ID

  const nick = 'A033vb7L82Z4EBMq';

  before(async () => {
    util.rmdir('.testdb');
    sut = new LeveldbOrderStore('./.testdb/nested/dir');
    await sut.open();
  });

  after(async () => {
    await sut.close();
    util.rmdir('.testdb');
  });

  describe('save order_offer', () => {
    it('should save order_offer', async () => {
      await sut.saveOrderOffer(orderOffer);
    });
  });

  describe('find order_offer by tempOrderId', () => {
    it('should return the order_offer object', async () => {
      const tempOrderId = sha256(orderOfferHex);
      const actual = await sut.findOrderOffer(tempOrderId);

      expect(actual.serialize()).to.deep.equal(orderOffer.serialize());
    });
  });

  describe('delete order_offer', () => {
    it('should delete order_offer', async () => {
      const tempOrderId = sha256(orderOfferHex);

      await sut.deleteOrderOffer(tempOrderId);

      const actual = await sut.findOrderOffer(tempOrderId);
      expect(actual).to.be.undefined;
    });
  });

  describe('save order_offer by nick', () => {
    it('should save order_offer', async () => {
      await sut.saveOrderOfferByNick(orderOffer, nick);
      await sut.saveOrderOfferByNick(orderOffer2, nick);
    });
  });

  describe('find order_offers by nick', () => {
    it('should return the order_offer object', async () => {
      const actual = await sut.findOrderOffersByNick(nick);

      await sut.deleteOrderOffer(tempOrderId);
      await sut.deleteOrderOffer(tempOrderId2);

      expect(actual.length).to.equal(2);

      // Sort both arrays by refund locktime to ensure consistent comparison
      const sortedActual = actual.sort(
        (a, b) => a.refundLocktime - b.refundLocktime,
      );
      const sortedExpected = [orderOffer, orderOffer2].sort(
        (a, b) => a.refundLocktime - b.refundLocktime,
      );

      expect(sortedActual[0].serialize()).to.deep.equal(
        sortedExpected[0].serialize(),
      );
      expect(sortedActual[1].serialize()).to.deep.equal(
        sortedExpected[1].serialize(),
      );
    });
  });

  describe('save order_offer by metadata and nick', () => {
    it('should return order_offer object', async () => {
      await sut.saveOrderOfferByMetadataAndNick(orderOfferWithMetadata, nick);
    });
  });

  describe('find order_offers by metadata and nick', async () => {
    const actual = await sut.findOrderOffersByNickAndMetadata(
      nick,
      orderMetadataId,
    );

    await sut.deleteOrderOffer(tempOrderWithMetadataId);

    expect(actual.length).to.equal(1);
    expect(actual[0].serialize()).to.deep.equal(
      orderOfferWithMetadata.serialize(),
    );
  });

  describe('find order_offer by metadata and nick', async () => {
    const actual = await sut.findOrderOfferByNickAndMetadata(
      nick,
      orderMetadataId,
    );

    await sut.deleteOrderOffer(tempOrderWithMetadataId);

    expect(actual.serialize()).to.deep.equal(
      orderOfferWithMetadata.serialize(),
    );
  });

  describe('save order_accept', () => {
    it('should save order_accept', async () => {
      await sut.saveOrderOffer(orderOffer);
      await sut.saveOrderAccept(orderAccept);
    });
  });

  describe('find order_accept by tempOrderId', () => {
    it('should return the order_accept object', async () => {
      const actual = await sut.findOrderAccept(tempOrderId);

      expect(actual.serialize()).to.deep.equal(orderAccept.serialize());
    });
  });

  describe('delete order_accept', () => {
    it('should delete order_accept', async () => {
      await sut.deleteOrderAccept(tempOrderId);

      const actual = await sut.findOrderAccept(tempOrderId);
      expect(actual).to.be.undefined;
    });
  });

  describe('save order_accept by nick', () => {
    it('should save order_accept', async () => {
      await sut.saveOrderAcceptByNick(orderAccept, nick);
      await sut.saveOrderAcceptByNick(orderAccept2, nick);
    });
  });

  describe('find order_accept by nick', () => {
    it('should return the order_accept object', async () => {
      const actual = await sut.findOrderAcceptsByNick(nick);

      await sut.deleteOrderAccept(tempOrderId);
      await sut.deleteOrderAccept(tempOrderId2);

      expect(actual.length).to.equal(2);

      // Sort both arrays by tempOrderId to ensure consistent comparison
      const sortedActual = actual.sort((a, b) =>
        a.tempOrderId.compare(b.tempOrderId),
      );
      const sortedExpected = [orderAccept, orderAccept2].sort((a, b) =>
        a.tempOrderId.compare(b.tempOrderId),
      );

      expect(sortedActual[0].serialize()).to.deep.equal(
        sortedExpected[0].serialize(),
      );
      expect(sortedActual[1].serialize()).to.deep.equal(
        sortedExpected[1].serialize(),
      );
    });
  });
});
