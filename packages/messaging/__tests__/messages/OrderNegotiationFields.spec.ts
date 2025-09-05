import { expect } from 'chai';

import { EnumeratedDescriptor } from '../../lib/messages/ContractDescriptor';
import { SingleContractInfo } from '../../lib/messages/ContractInfo';
import { EnumEventDescriptorV0 } from '../../lib/messages/EventDescriptor';
import { OracleAnnouncement } from '../../lib/messages/OracleAnnouncement';
import { OracleEvent } from '../../lib/messages/OracleEvent';
import { SingleOracleInfo } from '../../lib/messages/OracleInfo';
import {
  DisjointOrderNegotiationFields,
  OrderNegotiationFields,
  SingleOrderNegotiationFields,
} from '../../lib/messages/OrderNegotiationFields';
import { OrderOffer } from '../../lib/messages/OrderOffer';

describe('OrderNegotiationFields', () => {
  describe('SingleOrderNegotiationFields', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new SingleOrderNegotiationFields();

        expect(instance.serialize().toString('hex')).to.equal(
          '00', // discriminator (0 for Single)
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        const buf = Buffer.from(
          "00" // discriminator (0 for Single)
          , "hex"
        ); // prettier-ignore

        const instance = OrderNegotiationFields.deserialize(buf);

        expect(instance).to.be.instanceof(SingleOrderNegotiationFields);
        expect(instance.variant).to.equal('Single');
        expect(instance.discriminator).to.equal(0);
      });
    });

    describe('fromJSON', () => {
      it('creates from JSON', () => {
        const json = {
          variant: 'Single',
        };

        const instance = OrderNegotiationFields.fromJSON(json);

        expect(instance).to.be.instanceof(SingleOrderNegotiationFields);
        expect(instance.variant).to.equal('Single');
      });
    });

    describe('toJSON', () => {
      it('converts to JSON', () => {
        const instance = new SingleOrderNegotiationFields();
        const json = instance.toJSON();

        expect(json.variant).to.equal('Single');
      });
    });
  });

  describe('DisjointOrderNegotiationFields', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new DisjointOrderNegotiationFields();

        // Create OrderOffer programmatically for simplified format
        const orderOffer = new OrderOffer();

        // Set required properties (simplified OrderOffer)
        orderOffer.contractFlags = Buffer.from('00', 'hex');
        orderOffer.chainHash = Buffer.from(
          '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
          'hex',
        );
        orderOffer.temporaryContractId = Buffer.from(
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

        orderOffer.contractInfo = contractInfo;
        orderOffer.offerCollateralSatoshis = BigInt(100000000);
        orderOffer.feeRatePerVb = BigInt(1);
        orderOffer.cetLocktime = 100;
        orderOffer.refundLocktime = 200;

        instance.orderOffer = orderOffer;

        // Test that it serializes without errors (simplified format)
        const serialized = instance.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        // Create a test instance and serialize it first for round-trip testing
        const originalInstance = new DisjointOrderNegotiationFields();

        // Create OrderOffer programmatically for simplified format
        const orderOffer = new OrderOffer();

        // Set required properties (simplified OrderOffer)
        orderOffer.contractFlags = Buffer.from('00', 'hex');
        orderOffer.chainHash = Buffer.from(
          '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
          'hex',
        );
        orderOffer.temporaryContractId = Buffer.from(
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

        orderOffer.contractInfo = contractInfo;
        orderOffer.offerCollateralSatoshis = BigInt(100000000);
        orderOffer.feeRatePerVb = BigInt(1);
        orderOffer.cetLocktime = 100;
        orderOffer.refundLocktime = 200;

        originalInstance.orderOffer = orderOffer;

        // Serialize and then deserialize to ensure round-trip consistency
        const serialized = originalInstance.serialize();
        const instance = OrderNegotiationFields.deserialize(serialized);

        expect(instance).to.be.instanceof(DisjointOrderNegotiationFields);
        expect(instance.variant).to.equal('Disjoint');
        expect(instance.discriminator).to.equal(1);

        const disjointInstance = instance as DisjointOrderNegotiationFields;
        expect(disjointInstance.orderOffer).to.be.instanceof(OrderOffer);

        // Test the simplified OrderOffer properties
        const deserializedOffer = disjointInstance.orderOffer;
        expect(deserializedOffer.chainHash).to.deep.equal(orderOffer.chainHash);
        expect(deserializedOffer.temporaryContractId).to.deep.equal(
          orderOffer.temporaryContractId,
        );
        expect(deserializedOffer.offerCollateralSatoshis).to.equal(
          orderOffer.offerCollateralSatoshis,
        );
        expect(deserializedOffer.feeRatePerVb).to.equal(
          orderOffer.feeRatePerVb,
        );
        expect(deserializedOffer.cetLocktime).to.equal(orderOffer.cetLocktime);
        expect(deserializedOffer.refundLocktime).to.equal(
          orderOffer.refundLocktime,
        );
      });
    });

    describe('fromJSON', () => {
      it('throws error when orderOffer is missing', () => {
        const json = {
          variant: 'Disjoint',
          // Missing orderOffer field
        };

        expect(() => OrderNegotiationFields.fromJSON(json)).to.throw(
          'DisjointOrderNegotiationFields requires orderOffer field',
        );
      });
    });

    describe('toJSON', () => {
      it('converts to JSON', () => {
        const instance = new DisjointOrderNegotiationFields();

        // Create a fully configured OrderOffer for testing
        const orderOffer = new OrderOffer();
        orderOffer.contractFlags = Buffer.from('00', 'hex');
        orderOffer.chainHash = Buffer.from(
          '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
          'hex',
        );
        orderOffer.temporaryContractId = Buffer.from(
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

        orderOffer.contractInfo = contractInfo;
        orderOffer.offerCollateralSatoshis = BigInt(100000000);
        orderOffer.feeRatePerVb = BigInt(1);
        orderOffer.cetLocktime = 100;
        orderOffer.refundLocktime = 200;

        instance.orderOffer = orderOffer;
        const json = instance.toJSON();

        expect(json.variant).to.equal('Disjoint');
        expect(json.orderOffer).to.be.an('object');
      });
    });
  });
});
