// import { expect } from 'chai';

// import { HyperbolaPayoutCurvePiece } from '../../lib/messages/PayoutCurvePiece';
// import { PayoutFunctionV0 } from '../../lib/messages/PayoutFunction';

// describe('PayoutFunctionV0', () => {
//   describe('serialize', () => {
//     it('serializes', () => {
//       const instance = new PayoutFunctionV0();

//       instance.endpoint0 = BigInt(50000);
//       instance.endpointPayout0 = BigInt(100000);
//       instance.extraPrecision0 = 0;

//       // Create PayoutCurvePiece programmatically instead of using legacy hex data
//       const payoutCurvePiece = new HyperbolaPayoutCurvePiece();
//       payoutCurvePiece.usePositivePiece = true;
//       payoutCurvePiece.translateOutcomeSign = true;
//       payoutCurvePiece.translateOutcome = BigInt(5000);
//       payoutCurvePiece.translateOutcomeExtraPrecision = 0;
//       payoutCurvePiece.translatePayoutSign = true;
//       payoutCurvePiece.translatePayout = BigInt(1);
//       payoutCurvePiece.translatePayoutExtraPrecision = 0;
//       payoutCurvePiece.aSign = false;
//       payoutCurvePiece.a = BigInt(1);
//       payoutCurvePiece.aExtraPrecision = 0;
//       payoutCurvePiece.bSign = false;
//       payoutCurvePiece.b = BigInt(1);
//       payoutCurvePiece.bExtraPrecision = 0;
//       payoutCurvePiece.cSign = false;
//       payoutCurvePiece.c = BigInt(1);
//       payoutCurvePiece.cExtraPrecision = 0;
//       payoutCurvePiece.dSign = true;
//       payoutCurvePiece.d = BigInt(312000000);
//       payoutCurvePiece.dExtraPrecision = 0;

//       instance.pieces = [
//         {
//           payoutCurvePiece,
//           endpoint: BigInt(999999),
//           endpointPayout: BigInt(0),
//           extraPrecision: 0,
//         },
//       ];

//       // Test that it serializes without errors (new dlcspecs PR #163 format)
//       const serialized = instance.serialize();
//       expect(serialized).to.be.instanceof(Buffer);
//       expect(serialized.length).to.be.greaterThan(0);
//     });
//   });

//   describe('deserialize', () => {
//     it('deserializes', () => {
//       // Create a test instance and serialize it first for round-trip testing
//       const originalInstance = new PayoutFunctionV0();
//       originalInstance.endpoint0 = BigInt(50000);
//       originalInstance.endpointPayout0 = BigInt(100000);
//       originalInstance.extraPrecision0 = 0;

//       // Create PayoutCurvePiece programmatically
//       const payoutCurvePiece = new HyperbolaPayoutCurvePiece();
//       payoutCurvePiece.usePositivePiece = true;
//       payoutCurvePiece.translateOutcomeSign = true;
//       payoutCurvePiece.translateOutcome = BigInt(5000);
//       payoutCurvePiece.translateOutcomeExtraPrecision = 0;
//       payoutCurvePiece.translatePayoutSign = true;
//       payoutCurvePiece.translatePayout = BigInt(1);
//       payoutCurvePiece.translatePayoutExtraPrecision = 0;
//       payoutCurvePiece.aSign = false;
//       payoutCurvePiece.a = BigInt(1);
//       payoutCurvePiece.aExtraPrecision = 0;
//       payoutCurvePiece.bSign = false;
//       payoutCurvePiece.b = BigInt(1);
//       payoutCurvePiece.bExtraPrecision = 0;
//       payoutCurvePiece.cSign = false;
//       payoutCurvePiece.c = BigInt(1);
//       payoutCurvePiece.cExtraPrecision = 0;
//       payoutCurvePiece.dSign = true;
//       payoutCurvePiece.d = BigInt(312000000);
//       payoutCurvePiece.dExtraPrecision = 0;

//       originalInstance.pieces = [
//         {
//           payoutCurvePiece,
//           endpoint: BigInt(999999),
//           endpointPayout: BigInt(0),
//           extraPrecision: 0,
//         },
//       ];

//       // Serialize and then deserialize to ensure round-trip consistency
//       const serialized = originalInstance.serialize();
//       const instance = PayoutFunctionV0.deserialize(serialized);

//       expect(instance.endpoint0).to.equal(BigInt(50000));
//       expect(instance.endpointPayout0).to.equal(BigInt(100000));
//       expect(instance.extraPrecision0).to.equal(0);

//       expect(instance.pieces.length).to.equal(1);
//       expect(instance.pieces[0].payoutCurvePiece).to.be.instanceof(
//         HyperbolaPayoutCurvePiece,
//       );
//       expect(instance.pieces[0].endpoint).to.equal(BigInt(999999));
//       expect(instance.pieces[0].endpointPayout).to.equal(BigInt(0));
//       expect(instance.pieces[0].extraPrecision).to.equal(0);
//     });
//   });
// });
