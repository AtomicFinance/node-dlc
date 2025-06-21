import { expect } from 'chai';

import { EnumeratedDescriptor } from '../../lib/messages/ContractDescriptor';
import { SingleContractInfo } from '../../lib/messages/ContractInfo';
import { EnumEventDescriptorV0 } from '../../lib/messages/EventDescriptor';
import { OracleAnnouncement } from '../../lib/messages/OracleAnnouncement';
import { OracleEvent } from '../../lib/messages/OracleEvent';
import { SingleOracleInfo } from '../../lib/messages/OracleInfoV0';
import {
  OrderNegotiationFields,
  OrderNegotiationFieldsV0,
  OrderNegotiationFieldsV1,
} from '../../lib/messages/OrderNegotiationFields';
import { OrderOffer } from '../../lib/messages/OrderOffer';
import { MessageType } from '../../lib/MessageType';

describe('OrderNegotiationFields', () => {
  describe('OrderNegotiationFieldsV0', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new OrderNegotiationFieldsV0();

        instance.length = BigInt(0);

        expect(instance.serialize().toString('hex')).to.equal(
          'fdff36' + // type order_negotiation_fields_v0
            '00', // length
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        const buf = Buffer.from(
          "fdff36" + // type order_negotiation_fields_v0
          "00" // length
          , "hex"
        ); // prettier-ignore

        const unknownInstance = OrderNegotiationFields.deserialize(buf);

        if (unknownInstance.type === MessageType.OrderNegotiationFieldsV0) {
          const instance = unknownInstance as OrderNegotiationFieldsV0;

          expect(Number(instance.length)).to.equal(0);
        }
      });
    });
  });

  describe('OrderNegotiationFieldsV1', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new OrderNegotiationFieldsV1();

        // Create OrderOfferV0 programmatically for new dlcspecs PR #163 format
        const orderOffer = new OrderOffer();

        // Set all required properties following DlcOffer.spec.ts pattern
        orderOffer.contractFlags = Buffer.from('00', 'hex');
        orderOffer.chainHash = Buffer.from(
          '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
          'hex',
        );
        orderOffer.temporaryContractId = Buffer.from(
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          'hex',
        );
        orderOffer.fundingPubkey = Buffer.from(
          '0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3',
          'hex',
        );
        orderOffer.payoutSpk = Buffer.from(
          '00142bbdec425007dc360523b0294d2c64d2213af498',
          'hex',
        );
        orderOffer.payoutSerialId = BigInt(11555292);
        orderOffer.changeSpk = Buffer.from(
          '0014afa16f949f3055f38bd3a73312bed00b61558884',
          'hex',
        );
        orderOffer.changeSerialId = BigInt(2008045);
        orderOffer.fundOutputSerialId = BigInt(5411962);

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
        announcement.oraclePubkey = Buffer.alloc(32);

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
        instance.length = BigInt(orderOffer.serialize().length);

        // Test that it serializes without errors (new dlcspecs PR #163 format)
        const serialized = instance.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        // Create a test instance and serialize it first for round-trip testing
        const originalInstance = new OrderNegotiationFieldsV1();

        // Create OrderOfferV0 programmatically for new dlcspecs PR #163 format
        const orderOffer = new OrderOffer();

        // Set all required properties following DlcOffer.spec.ts pattern
        orderOffer.contractFlags = Buffer.from('00', 'hex');
        orderOffer.chainHash = Buffer.from(
          '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
          'hex',
        );
        orderOffer.temporaryContractId = Buffer.from(
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          'hex',
        );
        orderOffer.fundingPubkey = Buffer.from(
          '0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3',
          'hex',
        );
        orderOffer.payoutSpk = Buffer.from(
          '00142bbdec425007dc360523b0294d2c64d2213af498',
          'hex',
        );
        orderOffer.payoutSerialId = BigInt(11555292);
        orderOffer.changeSpk = Buffer.from(
          '0014afa16f949f3055f38bd3a73312bed00b61558884',
          'hex',
        );
        orderOffer.changeSerialId = BigInt(2008045);
        orderOffer.fundOutputSerialId = BigInt(5411962);

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
        announcement.oraclePubkey = Buffer.alloc(32);

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
        originalInstance.length = BigInt(orderOffer.serialize().length);

        // Serialize and then deserialize to ensure round-trip consistency
        const serialized = originalInstance.serialize();
        const unknownInstance = OrderNegotiationFields.deserialize(serialized);

        if (unknownInstance.type === MessageType.OrderNegotiationFieldsV1) {
          const instance = unknownInstance as OrderNegotiationFieldsV1;

          expect(Number(instance.length)).to.equal(
            Number(originalInstance.length),
          );
          expect(instance.orderOffer).to.be.instanceof(OrderOffer);

          // Type cast to access OrderOfferV0 properties
          const deserializedOffer = instance.orderOffer as OrderOffer;
          expect(deserializedOffer.chainHash).to.deep.equal(
            orderOffer.chainHash,
          );
          expect(deserializedOffer.offerCollateralSatoshis).to.equal(
            orderOffer.offerCollateralSatoshis,
          );
          expect(deserializedOffer.feeRatePerVb).to.equal(
            orderOffer.feeRatePerVb,
          );
          expect(deserializedOffer.cetLocktime).to.equal(
            orderOffer.cetLocktime,
          );
          expect(deserializedOffer.refundLocktime).to.equal(
            orderOffer.refundLocktime,
          );
        }
      });
    });
  });
});
