// import { expect } from 'chai';

// import {
//   HyperbolaPayoutCurvePiece,
//   PayoutCurvePiece,
//   PolynomialPayoutCurvePiece,
// } from '../../lib/messages/PayoutCurvePiece';

// describe('PayoutCurvePiece', () => {
//   describe('PolynomialPayoutCurvePiece', () => {
//     it('serializes', () => {
//       const instance = new PolynomialPayoutCurvePiece();

//       instance.points = [
//         {
//           eventOutcome: BigInt(0),
//           outcomePayout: BigInt(0),
//           extraPrecision: 0,
//         },
//         {
//           eventOutcome: BigInt(1),
//           outcomePayout: BigInt(1),
//           extraPrecision: 0,
//         },
//       ];

//       // Test that it serializes without errors (new dlcspecs PR #163 format)
//       const serialized = instance.serialize();
//       expect(serialized).to.be.instanceof(Buffer);
//       expect(serialized.length).to.be.greaterThan(0);
//     });

//     it('deserializes', () => {
//       // Create a test instance and serialize it first for round-trip testing
//       const originalInstance = new PolynomialPayoutCurvePiece();
//       originalInstance.points = [
//         {
//           eventOutcome: BigInt(0),
//           outcomePayout: BigInt(0),
//           extraPrecision: 0,
//         },
//         {
//           eventOutcome: BigInt(1),
//           outcomePayout: BigInt(1),
//           extraPrecision: 0,
//         },
//       ];

//       // Serialize and then deserialize to ensure round-trip consistency
//       const serialized = originalInstance.serialize();
//       const instance = PayoutCurvePiece.deserialize(
//         serialized,
//       ) as PolynomialPayoutCurvePiece;

//       expect(instance).to.be.instanceof(PolynomialPayoutCurvePiece);
//       expect(instance.points.length).to.equal(2);
//       expect(instance.points[0].eventOutcome).to.equal(BigInt(0));
//       expect(instance.points[0].outcomePayout).to.equal(BigInt(0));
//       expect(instance.points[0].extraPrecision).to.equal(0);

//       expect(instance.points[1].eventOutcome).to.equal(BigInt(1));
//       expect(instance.points[1].outcomePayout).to.equal(BigInt(1));
//       expect(instance.points[1].extraPrecision).to.equal(0);
//     });
//   });

//   describe('HyperbolaPayoutCurvePiece', () => {
//     it('serializes', () => {
//       const instance = new HyperbolaPayoutCurvePiece();

//       instance.usePositivePiece = true;
//       instance.translateOutcomeSign = true;
//       instance.translateOutcome = BigInt(0);
//       instance.translateOutcomeExtraPrecision = 0;
//       instance.translatePayoutSign = true;
//       instance.translatePayout = BigInt(0);
//       instance.translatePayoutExtraPrecision = 0;
//       instance.a = BigInt(1);
//       instance.aExtraPrecision = 0;
//       instance.aSign = false;
//       instance.b = BigInt(1);
//       instance.bExtraPrecision = 0;
//       instance.bSign = false;
//       instance.c = BigInt(1);
//       instance.cExtraPrecision = 0;
//       instance.cSign = false;
//       instance.d = BigInt(1);
//       instance.dExtraPrecision = 0;
//       instance.dSign = false;

//       // Test that it serializes without errors (new dlcspecs PR #163 format)
//       const serialized = instance.serialize();
//       expect(serialized).to.be.instanceof(Buffer);
//       expect(serialized.length).to.be.greaterThan(0);
//     });

//     it('deserializes', () => {
//       // Create a test instance and serialize it first for round-trip testing
//       const originalInstance = new HyperbolaPayoutCurvePiece();
//       originalInstance.usePositivePiece = true;
//       originalInstance.translateOutcomeSign = true;
//       originalInstance.translateOutcome = BigInt(0);
//       originalInstance.translateOutcomeExtraPrecision = 0;
//       originalInstance.translatePayoutSign = true;
//       originalInstance.translatePayout = BigInt(0);
//       originalInstance.translatePayoutExtraPrecision = 0;
//       originalInstance.a = BigInt(1);
//       originalInstance.aExtraPrecision = 0;
//       originalInstance.aSign = false;
//       originalInstance.b = BigInt(1);
//       originalInstance.bExtraPrecision = 0;
//       originalInstance.bSign = false;
//       originalInstance.c = BigInt(1);
//       originalInstance.cExtraPrecision = 0;
//       originalInstance.cSign = false;
//       originalInstance.d = BigInt(1);
//       originalInstance.dExtraPrecision = 0;
//       originalInstance.dSign = false;

//       // Serialize and then deserialize to ensure round-trip consistency
//       const serialized = originalInstance.serialize();
//       const instance = PayoutCurvePiece.deserialize(
//         serialized,
//       ) as HyperbolaPayoutCurvePiece;

//       expect(instance).to.be.instanceof(HyperbolaPayoutCurvePiece);
//       expect(instance.usePositivePiece).to.equal(true);
//       expect(instance.translateOutcomeSign).to.equal(true);
//       expect(instance.translateOutcome).to.equal(BigInt(0));
//       expect(instance.translateOutcomeExtraPrecision).to.equal(0);
//       expect(instance.translatePayoutSign).to.equal(true);
//       expect(instance.translatePayout).to.equal(BigInt(0));
//       expect(instance.translatePayoutExtraPrecision).to.equal(0);
//       expect(instance.a).to.equal(BigInt(1));
//       expect(instance.aExtraPrecision).to.equal(0);
//       expect(instance.aSign).to.equal(false);
//       expect(instance.b).to.equal(BigInt(1));
//       expect(instance.bExtraPrecision).to.equal(0);
//       expect(instance.bSign).to.equal(false);
//       expect(instance.c).to.equal(BigInt(1));
//       expect(instance.cExtraPrecision).to.equal(0);
//       expect(instance.cSign).to.equal(false);
//       expect(instance.d).to.equal(BigInt(1));
//       expect(instance.dExtraPrecision).to.equal(0);
//       expect(instance.dSign).to.equal(false);
//     });
//   });
// });
