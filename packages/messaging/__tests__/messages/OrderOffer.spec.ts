import { expect } from 'chai';

import { EnumeratedDescriptor } from '../../lib/messages/ContractDescriptor';
import { SingleContractInfo } from '../../lib/messages/ContractInfo';
import { EnumEventDescriptorV0 } from '../../lib/messages/EventDescriptor';
import { OracleAnnouncement } from '../../lib/messages/OracleAnnouncement';
import { OracleEvent } from '../../lib/messages/OracleEvent';
import { SingleOracleInfo } from '../../lib/messages/OracleInfo';
import { OrderOffer } from '../../lib/messages/OrderOffer';

describe('OrderOffer', () => {
  const chainHash = Buffer.from(
    '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
    'hex',
  );

  describe('basic functionality', () => {
    let instance: OrderOffer;

    beforeEach(() => {
      instance = new OrderOffer();

      // Set required properties for simplified OrderOffer
      instance.contractFlags = Buffer.from('00', 'hex');
      instance.chainHash = chainHash;
      instance.temporaryContractId = Buffer.from(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        'hex',
      );

      // Create a simple contract info with enumerated outcomes
      const contractInfo = new SingleContractInfo();
      contractInfo.totalCollateral = BigInt(200000000);

      // Create enumerated contract descriptor
      const contractDescriptor = new EnumeratedDescriptor();
      contractDescriptor.outcomes = [
        { outcome: 'win', localPayout: BigInt(0) },
        { outcome: 'lose', localPayout: BigInt(200000000) },
      ];

      // Create oracle info (simplified)
      const oracleInfo = new SingleOracleInfo();
      const announcement = new OracleAnnouncement();
      announcement.announcementSig = Buffer.alloc(64);
      announcement.oraclePublicKey = Buffer.alloc(32);

      const oracleEvent = new OracleEvent();
      oracleEvent.oracleNonces = [Buffer.alloc(32)];
      oracleEvent.eventMaturityEpoch = 0;

      // Use proper EnumEventDescriptorV0 for new dlcspecs PR #163 format
      const eventDescriptor = new EnumEventDescriptorV0();
      eventDescriptor.outcomes = ['win', 'lose'];
      oracleEvent.eventDescriptor = eventDescriptor;
      oracleEvent.eventId = 'test';

      announcement.oracleEvent = oracleEvent;
      oracleInfo.announcement = announcement;

      contractInfo.contractDescriptor = contractDescriptor;
      contractInfo.oracleInfo = oracleInfo;

      instance.contractInfo = contractInfo;
      instance.offerCollateralSatoshis = BigInt(100000000);
      instance.feeRatePerVb = BigInt(1);
      instance.cetLocktime = 100;
      instance.refundLocktime = 200;
    });

    it('creates and validates instance', () => {
      expect(instance.chainHash).to.deep.equal(chainHash);
      expect(instance.temporaryContractId).to.deep.equal(
        Buffer.from(
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          'hex',
        ),
      );
      expect(Number(instance.offerCollateralSatoshis)).to.equal(100000000);
      expect(Number(instance.feeRatePerVb)).to.equal(1);
      expect(instance.cetLocktime).to.equal(100);
      expect(instance.refundLocktime).to.equal(200);
    });

    it('serializes and deserializes', () => {
      const serialized = instance.serialize();
      expect(serialized).to.be.instanceof(Buffer);
      expect(serialized.length).to.be.greaterThan(0);

      const deserialized = OrderOffer.deserialize(serialized);
      expect(deserialized.chainHash).to.deep.equal(instance.chainHash);
      expect(deserialized.temporaryContractId).to.deep.equal(
        instance.temporaryContractId,
      );
      expect(deserialized.offerCollateralSatoshis).to.equal(
        instance.offerCollateralSatoshis,
      );
      expect(deserialized.feeRatePerVb).to.equal(instance.feeRatePerVb);
      expect(deserialized.cetLocktime).to.equal(instance.cetLocktime);
      expect(deserialized.refundLocktime).to.equal(instance.refundLocktime);
    });

    it('converts to JSON', () => {
      const json = instance.toJSON();
      expect(json.type).to.equal(instance.type);
      expect(json.chainHash).to.equal(instance.chainHash.toString('hex'));
      expect(json.temporaryContractId).to.equal(
        instance.temporaryContractId.toString('hex'),
      );
      expect(json.offerCollateralSatoshis).to.equal(
        Number(instance.offerCollateralSatoshis),
      );
      expect(json.feeRatePerVb).to.equal(Number(instance.feeRatePerVb));
      expect(json.cetLocktime).to.equal(instance.cetLocktime);
      expect(json.refundLocktime).to.equal(instance.refundLocktime);
    });
  });

  // TODO: Legacy tests need to be updated for dlcspecs PR #163 format
  // The old hex test data uses the legacy TLV format and needs to be regenerated
});
