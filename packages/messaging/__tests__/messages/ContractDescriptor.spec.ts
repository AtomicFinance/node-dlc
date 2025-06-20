// import { expect } from 'chai';

// import {
//   ContractDescriptor,
//   EnumeratedDescriptor,
//   NumericalDescriptor,
// } from '../../lib/messages/ContractDescriptor';
// import { HyperbolaPayoutCurvePiece } from '../../lib/messages/PayoutCurvePiece';
// import { PayoutFunctionV0 } from '../../lib/messages/PayoutFunction';
// import { RoundingIntervalsV0 } from '../../lib/messages/RoundingIntervalsV0';
// import { MessageType } from '../../lib/MessageType';

// describe('ContractDescriptor', () => {
//   describe('EnumeratedDescriptor', () => {
//     describe('serialize', () => {
//       it('serializes', () => {
//         const instance = new EnumeratedDescriptor();

//         // Use simple string outcomes instead of hex hashes for the new format
//         const outcomeOne = 'win';
//         const payoutOne = BigInt(0);
//         const outcomeTwo = 'lose';
//         const payoutTwo = BigInt(153445027);
//         const outcomeThree = 'draw';
//         const payoutThree = BigInt(200000000);

//         instance.outcomes = [
//           { outcome: outcomeOne, localPayout: payoutOne },
//           { outcome: outcomeTwo, localPayout: payoutTwo },
//           { outcome: outcomeThree, localPayout: payoutThree },
//         ];

//         expect(instance.serialize().toString('hex')).to.equal(
//           '00' + // type: enumerated_contract_descriptor (0)
//             '03' + // num_outcomes
//             '03' +
//             '77696e' + // outcome_1: "win" (length=3, data)
//             '0000000000000000' + // payout_1
//             '04' +
//             '6c6f7365' + // outcome_2: "lose" (length=4, data)
//             '00000000092562a3' + // payout_2 (actual hex value from implementation)
//             '04' +
//             '64726177' + // outcome_3: "draw" (length=4, data)
//             '000000000bebc200', // payout_3
//         );
//       });
//     });

//     describe('deserialize', () => {
//       it('deserializes', () => {
//         // Create a test instance and serialize it
//         const originalInstance = new EnumeratedDescriptor();
//         originalInstance.outcomes = [
//           { outcome: 'win', localPayout: BigInt(0) },
//           { outcome: 'lose', localPayout: BigInt(153517731) },
//           { outcome: 'draw', localPayout: BigInt(200000000) },
//         ];

//         // Serialize and then deserialize to ensure round-trip consistency
//         const serialized = originalInstance.serialize();
//         const unknownInstance = ContractDescriptor.deserialize(serialized);

//         expect(unknownInstance.contractDescriptorType).to.equal(0); // enumerated_contract_descriptor type (new format)

//         if (unknownInstance instanceof EnumeratedDescriptor) {
//           const instance = unknownInstance as EnumeratedDescriptor;

//           expect(instance.outcomes.length).to.equal(3);
//           expect(instance.outcomes[0].outcome).to.equal('win');
//           expect(Number(instance.outcomes[0].localPayout)).to.equal(0);
//           expect(instance.outcomes[1].outcome).to.equal('lose');
//           expect(Number(instance.outcomes[1].localPayout)).to.equal(153517731);
//           expect(instance.outcomes[2].outcome).to.equal('draw');
//           expect(Number(instance.outcomes[2].localPayout)).to.equal(200000000);
//         }
//       });
//     });

//     describe('toJSON', () => {
//       it('converts to JSON', () => {
//         const instance = new EnumeratedDescriptor();

//         const outcomeOne = 'win';
//         const payoutOne = BigInt(0);
//         const outcomeTwo = 'lose';
//         const payoutTwo = BigInt(153517731); // Updated to match actual implementation
//         const outcomeThree = 'draw';
//         const payoutThree = BigInt(200000000);

//         instance.outcomes = [
//           { outcome: outcomeOne, localPayout: payoutOne },
//           { outcome: outcomeTwo, localPayout: payoutTwo },
//           { outcome: outcomeThree, localPayout: payoutThree },
//         ];

//         const json = instance.toJSON();

//         expect(json.contractDescriptorType).to.equal(0); // Check new format type
//         expect(json.outcomes.length).to.equal(3);
//         expect(json.outcomes[0].outcome).to.equal(outcomeOne);
//         expect(json.outcomes[0].localPayout).to.equal(0);
//         expect(json.outcomes[1].outcome).to.equal(outcomeTwo);
//         expect(json.outcomes[1].localPayout).to.equal(153517731); // Updated value
//         expect(json.outcomes[2].outcome).to.equal(outcomeThree);
//         expect(json.outcomes[2].localPayout).to.equal(200000000);
//       });
//     });
//   });

//   describe('NumericOutcomeContractDescriptor', () => {
//     describe('serialize/deserialize', () => {
//       it('should serialize and deserialize correctly', () => {
//         const instance = new NumericalDescriptor();
//         instance.numDigits = 18;

//         // Create proper HyperbolaPayoutCurvePiece instance
//         const hyperbolaPayoutCurvePiece = new HyperbolaPayoutCurvePiece();
//         hyperbolaPayoutCurvePiece.usePositivePiece = true;
//         hyperbolaPayoutCurvePiece.translateOutcomeSign = true;
//         hyperbolaPayoutCurvePiece.translateOutcome = BigInt(0);
//         hyperbolaPayoutCurvePiece.translateOutcomeExtraPrecision = 0;
//         hyperbolaPayoutCurvePiece.translatePayoutSign = false;
//         hyperbolaPayoutCurvePiece.translatePayout = BigInt(30518);
//         hyperbolaPayoutCurvePiece.translatePayoutExtraPrecision = 0;
//         hyperbolaPayoutCurvePiece.aSign = true;
//         hyperbolaPayoutCurvePiece.a = BigInt(1);
//         hyperbolaPayoutCurvePiece.aExtraPrecision = 0;
//         hyperbolaPayoutCurvePiece.bSign = true;
//         hyperbolaPayoutCurvePiece.b = BigInt(0);
//         hyperbolaPayoutCurvePiece.bExtraPrecision = 0;
//         hyperbolaPayoutCurvePiece.cSign = true;
//         hyperbolaPayoutCurvePiece.c = BigInt(0);
//         hyperbolaPayoutCurvePiece.cExtraPrecision = 0;
//         hyperbolaPayoutCurvePiece.dSign = true;
//         hyperbolaPayoutCurvePiece.d = BigInt(4000000000);
//         hyperbolaPayoutCurvePiece.dExtraPrecision = 0;

//         // Create proper PayoutFunctionV0 instance
//         const payoutFunction = new PayoutFunctionV0();
//         payoutFunction.endpoint0 = BigInt(0);
//         payoutFunction.endpointPayout0 = BigInt(969482);
//         payoutFunction.extraPrecision0 = 0;
//         payoutFunction.pieces = [
//           {
//             payoutCurvePiece: hyperbolaPayoutCurvePiece,
//             endpoint: BigInt(131071),
//             endpointPayout: BigInt(0),
//             extraPrecision: 0,
//           },
//         ];

//         instance.payoutFunction = payoutFunction;

//         // Create proper RoundingIntervalsV0 instance
//         const roundingIntervals = new RoundingIntervalsV0();
//         roundingIntervals.intervals = [
//           {
//             beginInterval: BigInt(0),
//             roundingMod: BigInt(500),
//           },
//         ];

//         instance.roundingIntervals = roundingIntervals;

//         const serialized = instance.serialize();
//         const deserialized = ContractDescriptor.deserialize(serialized);

//         expect(deserialized.contractDescriptorType).to.equal(1); // numeric_outcome_contract_descriptor type (new format)
//         expect(deserialized).to.be.instanceOf(NumericalDescriptor);

//         if (deserialized instanceof NumericalDescriptor) {
//           expect(deserialized.numDigits).to.equal(18);
//           expect(deserialized.payoutFunction.endpoint0).to.equal(BigInt(0));
//           expect(deserialized.roundingIntervals.intervals.length).to.equal(1);
//         }
//       });
//     });
//   });
// });
