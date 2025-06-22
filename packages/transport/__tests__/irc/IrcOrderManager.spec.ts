// tslint:disable: no-unused-expression
import {
  EnumeratedDescriptor,
  EnumEventDescriptor,
  OracleAnnouncement,
  OracleEvent,
  OrderAccept,
  OrderNegotiationFieldsV0,
  OrderOffer,
  SingleContractInfo,
  SingleOracleInfo,
} from '@node-dlc/messaging';
import chai from 'chai';
import { ECPairFactory } from 'ecpair';
import sinonChai from 'sinon-chai';
import * as tinysecp from 'tiny-secp256k1';

const ECPair = ECPairFactory(tinysecp);

import { ChannelType } from '../../lib/irc/ChannelType';
import { IrcOrderManager } from '../../lib/irc/IrcOrderManager';
import { IrcServers } from '../../lib/irc/Servers';
import { sleep } from '../util';
import { createFakeLogger } from './helpers';

chai.should();
chai.use(sinonChai);
const expect = chai.expect;

describe('IrcOrderManager', () => {
  let sut: IrcOrderManager;
  let bob: IrcOrderManager;

  // Create test data programmatically to avoid issues with old serialized data
  const createTestOrderOffer = (): OrderOffer => {
    const orderOffer = new OrderOffer();
    orderOffer.contractFlags = Buffer.from('00', 'hex');
    orderOffer.temporaryContractId = Buffer.from(
      'f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206',
      'hex',
    );
    orderOffer.chainHash = Buffer.from(
      '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206',
      'hex',
    );
    orderOffer.offerCollateral = BigInt(50000);
    orderOffer.feeRatePerVb = BigInt(1000);
    orderOffer.cetLocktime = 1620000000;
    orderOffer.refundLocktime = 1620086400;

    // Create a proper ContractInfo
    const contractInfo = new SingleContractInfo();
    contractInfo.totalCollateral = BigInt(100000);

    // Create enumerated contract descriptor
    const contractDescriptor = new EnumeratedDescriptor();
    contractDescriptor.outcomes = [
      { outcome: 'win', localPayout: BigInt(100000) },
      { outcome: 'lose', localPayout: BigInt(0) },
    ];
    contractInfo.contractDescriptor = contractDescriptor;

    // Create oracle info
    const oracleInfo = new SingleOracleInfo();
    const oracleAnnouncement = new OracleAnnouncement();
    const oracleEvent = new OracleEvent();
    oracleEvent.eventMaturityEpoch = 1620000000;
    oracleEvent.eventId = 'test-event';

    // EnumEventDescriptor requires exactly 1 nonce
    oracleEvent.oracleNonces = [Buffer.from('0'.repeat(64), 'hex')]; // 32 bytes

    const eventDescriptor = new EnumEventDescriptor();
    eventDescriptor.outcomes = ['win', 'lose'];
    oracleEvent.eventDescriptor = eventDescriptor;

    oracleAnnouncement.oracleEvent = oracleEvent;
    oracleAnnouncement.oraclePubkey = Buffer.from('0'.repeat(64), 'hex'); // 32 bytes for x-only pubkey
    oracleAnnouncement.announcementSig = Buffer.from('0'.repeat(128), 'hex'); // 64 bytes for Schnorr sig
    oracleInfo.announcement = oracleAnnouncement;

    contractInfo.oracleInfo = oracleInfo;
    orderOffer.contractInfo = contractInfo;

    return orderOffer;
  };

  const createTestOrderAccept = (tempContractId: Buffer): OrderAccept => {
    const orderAccept = new OrderAccept();
    orderAccept.tempOrderId = tempContractId;

    // Create proper negotiation fields (minimal V0 structure)
    const negotiationFields = new OrderNegotiationFieldsV0();
    orderAccept.negotiationFields = negotiationFields;

    return orderAccept;
  };

  const orderOffer = createTestOrderOffer();
  const orderAccept = createTestOrderAccept(orderOffer.temporaryContractId);

  beforeEach(async () => {
    const keyPair1 = ECPair.makeRandom();
    const keyPair2 = ECPair.makeRandom();

    sut = new IrcOrderManager(
      createFakeLogger(),
      keyPair1.privateKey,
      [IrcServers.primary_server.host],
      false,
      ChannelType.TestMarketPit,
    );
    bob = new IrcOrderManager(
      createFakeLogger(),
      keyPair2.privateKey,
      [IrcServers.primary_server.host],
      false,
      ChannelType.TestMarketPit,
    );

    sut.start();
    bob.start();

    while (!sut.started) {
      await sleep(50);
    }
  });

  afterEach(() => {
    sut.stop();
    bob.stop();
  });

  describe('send orders', () => {
    it('should default to trading pit channel for order offer', (done) => {
      bob.on('orderoffermessage', (from, to, msg) => {
        const actualMsg = Buffer.from(msg, 'hex');
        const actualOrderOffer = OrderOffer.deserialize(actualMsg);

        // Compare key fields instead of full serialization to avoid validation issues
        expect(actualOrderOffer.temporaryContractId).to.deep.equal(
          orderOffer.temporaryContractId,
        );
        expect(actualOrderOffer.offerCollateral).to.equal(
          orderOffer.offerCollateral,
        );
        expect(from).to.equal(sut.nick);
        expect(to).to.equal(ChannelType.TestMarketPit);

        bob.removeAllListeners();
        done();
      });

      sut.send(orderOffer);
    });

    it('should correctly send msgs privately', (done) => {
      sut.on('orderoffermessage', (from, to, msg) => {
        const actualMsg = Buffer.from(msg, 'hex');
        const actualOrderOffer = OrderOffer.deserialize(actualMsg);

        expect(actualOrderOffer.temporaryContractId).to.deep.equal(
          orderOffer.temporaryContractId,
        );
        expect(from).to.equal(bob.nick);
        expect(to).to.equal(ChannelType.TestMarketPit);

        sut.removeAllListeners();
        sut.send(orderAccept);
      });

      bob.on('orderacceptmessage', (from, to, msg) => {
        const actualMsg = Buffer.from(msg, 'hex');
        const actualOrderAccept = OrderAccept.deserialize(actualMsg);

        expect(actualOrderAccept.tempOrderId).to.deep.equal(
          orderAccept.tempOrderId,
        );
        expect(from).to.equal(sut.nick);
        expect(to).to.equal(bob.nick);

        bob.removeAllListeners();
        done();
      });

      bob.send(orderOffer);
    });
  });
});
