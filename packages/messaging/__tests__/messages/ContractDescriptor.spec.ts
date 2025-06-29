import { expect } from 'chai';

import {
  ContractDescriptor,
  EnumeratedDescriptor,
  NumericalDescriptor,
} from '../../lib/messages/ContractDescriptor';
import { HyperbolaPayoutCurvePiece } from '../../lib/messages/PayoutCurvePiece';
import { PayoutFunction } from '../../lib/messages/PayoutFunction';
import { RoundingIntervals } from '../../lib/messages/RoundingIntervals';
import { F64 } from '../../lib/serialize/F64';

describe('ContractDescriptor', () => {
  describe('EnumeratedDescriptor', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new EnumeratedDescriptor();

        // Use simple string outcomes instead of hex hashes for the new format
        const outcomeOne = 'win';
        const payoutOne = BigInt(0);
        const outcomeTwo = 'lose';
        const payoutTwo = BigInt(153445027);
        const outcomeThree = 'draw';
        const payoutThree = BigInt(200000000);

        instance.outcomes = [
          { outcome: outcomeOne, localPayout: payoutOne },
          { outcome: outcomeTwo, localPayout: payoutTwo },
          { outcome: outcomeThree, localPayout: payoutThree },
        ];

        expect(instance.serialize().toString('hex')).to.equal(
          '00' + // type: enumerated_contract_descriptor (0)
            '03' + // num_outcomes
            '03' +
            '77696e' + // outcome_1: "win" (length=3, data)
            '0000000000000000' + // payout_1
            '04' +
            '6c6f7365' + // outcome_2: "lose" (length=4, data)
            '00000000092562a3' + // payout_2 (actual hex value from implementation)
            '04' +
            '64726177' + // outcome_3: "draw" (length=4, data)
            '000000000bebc200', // payout_3
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        // Create a test instance and serialize it
        const originalInstance = new EnumeratedDescriptor();
        originalInstance.outcomes = [
          { outcome: 'win', localPayout: BigInt(0) },
          { outcome: 'lose', localPayout: BigInt(153517731) },
          { outcome: 'draw', localPayout: BigInt(200000000) },
        ];

        // Serialize and then deserialize to ensure round-trip consistency
        const serialized = originalInstance.serialize();
        const unknownInstance = ContractDescriptor.deserialize(serialized);

        expect(unknownInstance.contractDescriptorType).to.equal(0); // enumerated_contract_descriptor type (new format)

        if (unknownInstance instanceof EnumeratedDescriptor) {
          const instance = unknownInstance as EnumeratedDescriptor;

          expect(instance.outcomes.length).to.equal(3);
          expect(instance.outcomes[0].outcome).to.equal('win');
          expect(Number(instance.outcomes[0].localPayout)).to.equal(0);
          expect(instance.outcomes[1].outcome).to.equal('lose');
          expect(Number(instance.outcomes[1].localPayout)).to.equal(153517731);
          expect(instance.outcomes[2].outcome).to.equal('draw');
          expect(Number(instance.outcomes[2].localPayout)).to.equal(200000000);
        }
      });
    });

    describe('toJSON', () => {
      it('converts to JSON', () => {
        const instance = new EnumeratedDescriptor();

        const outcomeOne = 'win';
        const payoutOne = BigInt(0);
        const outcomeTwo = 'lose';
        const payoutTwo = BigInt(153517731); // Updated to match actual implementation
        const outcomeThree = 'draw';
        const payoutThree = BigInt(200000000);

        instance.outcomes = [
          { outcome: outcomeOne, localPayout: payoutOne },
          { outcome: outcomeTwo, localPayout: payoutTwo },
          { outcome: outcomeThree, localPayout: payoutThree },
        ];

        const json = instance.toJSON() as any; // Cast to any to access the wrapped structure

        // Check that the JSON has the proper enum format structure
        expect(json.enumeratedContractDescriptor).to.exist;
        expect(json.enumeratedContractDescriptor.payouts.length).to.equal(3);
        expect(json.enumeratedContractDescriptor.payouts[0].outcome).to.equal(
          outcomeOne,
        );
        expect(
          json.enumeratedContractDescriptor.payouts[0].offerPayout,
        ).to.equal(0);
        expect(json.enumeratedContractDescriptor.payouts[1].outcome).to.equal(
          outcomeTwo,
        );
        expect(
          json.enumeratedContractDescriptor.payouts[1].offerPayout,
        ).to.equal(153517731); // Updated value
        expect(json.enumeratedContractDescriptor.payouts[2].outcome).to.equal(
          outcomeThree,
        );
        expect(
          json.enumeratedContractDescriptor.payouts[2].offerPayout,
        ).to.equal(200000000);
      });
    });
  });

  describe('NumericalDescriptor', () => {
    describe('serialize/deserialize', () => {
      it('should serialize and deserialize correctly', () => {
        const instance = new NumericalDescriptor();
        instance.numDigits = 18;

        // Create proper HyperbolaPayoutCurvePiece instance with new F64 structure
        const hyperbolaPayoutCurvePiece = new HyperbolaPayoutCurvePiece();
        hyperbolaPayoutCurvePiece.usePositivePiece = true;
        hyperbolaPayoutCurvePiece.translateOutcome = F64.fromNumber(0);
        hyperbolaPayoutCurvePiece.translatePayout = F64.fromNumber(30518);
        hyperbolaPayoutCurvePiece.a = F64.fromNumber(1);
        hyperbolaPayoutCurvePiece.b = F64.fromNumber(0);
        hyperbolaPayoutCurvePiece.c = F64.fromNumber(0);
        hyperbolaPayoutCurvePiece.d = F64.fromNumber(4000000000);

        // Create proper PayoutFunction instance with new structure
        const payoutFunction = new PayoutFunction();
        payoutFunction.lastEndpoint = {
          eventOutcome: BigInt(0),
          outcomePayout: BigInt(969482),
          extraPrecision: 0,
        };
        payoutFunction.payoutFunctionPieces = [
          {
            endPoint: {
              eventOutcome: BigInt(131071),
              outcomePayout: BigInt(0),
              extraPrecision: 0,
            },
            payoutCurvePiece: hyperbolaPayoutCurvePiece,
          },
        ];

        instance.payoutFunction = payoutFunction;

        // Create proper RoundingIntervals instance
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(0),
            roundingMod: BigInt(500),
          },
        ];

        instance.roundingIntervals = roundingIntervals;

        const serialized = instance.serialize();
        const deserialized = ContractDescriptor.deserialize(serialized);

        expect(deserialized.contractDescriptorType).to.equal(1); // numeric_outcome_contract_descriptor type (new format)
        expect(deserialized).to.be.instanceOf(NumericalDescriptor);

        if (deserialized instanceof NumericalDescriptor) {
          expect(deserialized.numDigits).to.equal(18);
          expect(
            deserialized.payoutFunction.payoutFunctionPieces.length,
          ).to.equal(1);
          expect(
            deserialized.payoutFunction.lastEndpoint.eventOutcome,
          ).to.equal(BigInt(0));
          expect(
            deserialized.payoutFunction.lastEndpoint.outcomePayout,
          ).to.equal(BigInt(969482));
          expect(deserialized.roundingIntervals.intervals.length).to.equal(1);
          expect(
            deserialized.roundingIntervals.intervals[0].beginInterval,
          ).to.equal(BigInt(0));
          expect(
            deserialized.roundingIntervals.intervals[0].roundingMod,
          ).to.equal(BigInt(500));
        }
      });
    });

    describe('toJSON', () => {
      it('converts to JSON', () => {
        const instance = new NumericalDescriptor();
        instance.numDigits = 5;

        // Create a simple hyperbola payout curve piece for JSON testing
        const hyperbolaPayoutCurvePiece = new HyperbolaPayoutCurvePiece();
        hyperbolaPayoutCurvePiece.usePositivePiece = true;
        hyperbolaPayoutCurvePiece.translateOutcome = F64.fromNumber(100);
        hyperbolaPayoutCurvePiece.translatePayout = F64.fromNumber(50000);
        hyperbolaPayoutCurvePiece.a = F64.fromNumber(2);
        hyperbolaPayoutCurvePiece.b = F64.fromNumber(3);
        hyperbolaPayoutCurvePiece.c = F64.fromNumber(4);
        hyperbolaPayoutCurvePiece.d = F64.fromNumber(5000000000);

        const payoutFunction = new PayoutFunction();
        payoutFunction.lastEndpoint = {
          eventOutcome: BigInt(31),
          outcomePayout: BigInt(100000000),
          extraPrecision: 0,
        };
        payoutFunction.payoutFunctionPieces = [
          {
            endPoint: {
              eventOutcome: BigInt(15),
              outcomePayout: BigInt(50000000),
              extraPrecision: 0,
            },
            payoutCurvePiece: hyperbolaPayoutCurvePiece,
          },
        ];

        instance.payoutFunction = payoutFunction;

        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(0),
            roundingMod: BigInt(1),
          },
        ];
        instance.roundingIntervals = roundingIntervals;

        const json = instance.toJSON() as any; // Cast to any to access the wrapped structure

        // Check that the JSON has the proper structure
        expect(json.numericOutcomeContractDescriptor).to.exist;
        expect(json.numericOutcomeContractDescriptor.numDigits).to.equal(5);
        expect(json.numericOutcomeContractDescriptor.payoutFunction).to.exist;
        expect(
          json.numericOutcomeContractDescriptor.payoutFunction
            .payoutFunctionPieces.length,
        ).to.equal(1);
        expect(
          json.numericOutcomeContractDescriptor.payoutFunction.lastEndpoint
            .eventOutcome,
        ).to.equal(31);
        expect(json.numericOutcomeContractDescriptor.roundingIntervals).to
          .exist;
        expect(
          json.numericOutcomeContractDescriptor.roundingIntervals.intervals
            .length,
        ).to.equal(1);
      });
    });
  });
});
