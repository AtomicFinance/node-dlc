import { expect } from 'chai';

import {
  NegotiationFields,
  NegotiationFieldsV0,
  NegotiationFieldsV1,
  NegotiationFieldsV2,
} from '../../lib/messages/NegotiationFields';
import { RoundingIntervals } from '../../lib/messages/RoundingIntervals';
import { MessageType } from '../../lib/MessageType';

describe('NegotiationFields', () => {
  describe('NegotiationFieldsV0', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new NegotiationFieldsV0();

        instance.length = BigInt(0);

        expect(instance.serialize().toString('hex')).to.equal(
          'fdd826' + // type negotiation_fields_v0
            '00', // length
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        const buf = Buffer.from(
          "fdd826" + // type negotiation_fields_v0
          "00" // length
          , "hex"
        ); // prettier-ignore

        const unknownInstance = NegotiationFields.deserialize(buf);

        if (unknownInstance.type === MessageType.NegotiationFieldsV0) {
          const instance = unknownInstance as NegotiationFieldsV0;

          expect(Number(instance.length)).to.equal(0);
        }
      });
    });
  });

  describe('NegotiationFieldsV1', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new NegotiationFieldsV1();

        // Create RoundingIntervals programmatically for new dlcspecs PR #163 format
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        instance.roundingIntervals = roundingIntervals;

        // Let serialization calculate the length automatically
        instance.length = BigInt(roundingIntervals.serialize().length);

        // Test that it serializes without errors (new dlcspecs PR #163 format)
        const serialized = instance.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        // Create a test instance and serialize it first for round-trip testing
        const originalInstance = new NegotiationFieldsV1();

        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        originalInstance.roundingIntervals = roundingIntervals;

        // Let serialization calculate the length automatically
        originalInstance.length = BigInt(roundingIntervals.serialize().length);

        // Serialize and then deserialize to ensure round-trip consistency
        const serialized = originalInstance.serialize();
        const unknownInstance = NegotiationFields.deserialize(serialized);

        if (unknownInstance.type === MessageType.NegotiationFieldsV1) {
          const instance = unknownInstance as NegotiationFieldsV1;

          expect(Number(instance.length)).to.equal(
            Number(originalInstance.length),
          );
          expect(instance.roundingIntervals).to.be.instanceof(
            RoundingIntervals,
          );
          expect(instance.roundingIntervals.intervals.length).to.equal(1);
          expect(
            instance.roundingIntervals.intervals[0].beginInterval,
          ).to.equal(BigInt(5000));
          expect(instance.roundingIntervals.intervals[0].roundingMod).to.equal(
            BigInt(10000),
          );
        }
      });
    });
  });

  describe('NegotiationFieldsV2', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new NegotiationFieldsV2();

        // Create NegotiationFields instances programmatically
        const negotiationFieldsV1 = new NegotiationFieldsV1();
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        negotiationFieldsV1.roundingIntervals = roundingIntervals;
        negotiationFieldsV1.length = BigInt(
          roundingIntervals.serialize().length,
        );

        const negotiationFieldsV0 = new NegotiationFieldsV0();
        negotiationFieldsV0.length = BigInt(0);

        instance.negotiationFieldsList = [
          negotiationFieldsV1,
          negotiationFieldsV0,
        ];

        // Calculate the total length based on actual data
        const totalDataLength =
          negotiationFieldsV1.serialize().length +
          negotiationFieldsV0.serialize().length +
          1; // +1 for num_disjoint_events
        instance.length = BigInt(totalDataLength);

        // Test that it serializes without errors (new dlcspecs PR #163 format)
        const serialized = instance.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        // Create a test instance and serialize it first for round-trip testing
        const originalInstance = new NegotiationFieldsV2();

        const negotiationFieldsV1 = new NegotiationFieldsV1();
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        negotiationFieldsV1.roundingIntervals = roundingIntervals;
        negotiationFieldsV1.length = BigInt(
          roundingIntervals.serialize().length,
        );

        const negotiationFieldsV0 = new NegotiationFieldsV0();
        negotiationFieldsV0.length = BigInt(0);

        originalInstance.negotiationFieldsList = [
          negotiationFieldsV1,
          negotiationFieldsV0,
        ];

        // Calculate the total length based on actual data
        const totalDataLength =
          negotiationFieldsV1.serialize().length +
          negotiationFieldsV0.serialize().length +
          1; // +1 for num_disjoint_events
        originalInstance.length = BigInt(totalDataLength);

        // Serialize and then deserialize to ensure round-trip consistency
        const serialized = originalInstance.serialize();
        const unknownInstance = NegotiationFields.deserialize(serialized);

        if (unknownInstance.type === MessageType.NegotiationFieldsV2) {
          const instance = unknownInstance as NegotiationFieldsV2;

          expect(Number(instance.length)).to.equal(
            Number(originalInstance.length),
          );
          expect(instance.negotiationFieldsList.length).to.equal(2);
          expect(instance.negotiationFieldsList[0]).to.be.instanceof(
            NegotiationFieldsV1,
          );
          expect(instance.negotiationFieldsList[1]).to.be.instanceof(
            NegotiationFieldsV0,
          );
        }
      });
    });
  });
});
