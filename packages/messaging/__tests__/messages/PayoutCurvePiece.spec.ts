import BigNumber from 'bignumber.js';
import { expect } from 'chai';

import {
  HyperbolaPayoutCurvePiece,
  PolynomialPayoutCurvePiece,
} from '../../lib/messages/PayoutCurvePiece';

describe('PayoutCurvePiece', () => {
  describe('PolynomialPayoutCurvePiece', () => {
    it('serializes', () => {
      const instance = new PolynomialPayoutCurvePiece();

      instance.points = [
        {
          eventOutcome: BigInt(0),
          outcomePayout: BigInt(0),
          extraPrecision: 0,
        },
        {
          eventOutcome: BigInt(1),
          outcomePayout: BigInt(1),
          extraPrecision: 0,
        },
      ];

      expect(instance.serialize().toString("hex")).to.equal(
        '00' + // type
        '02' + // num_points
        '0000000000000000' + // event_outcome[0]
        '0000000000000000' + // outcome_payout[0]
        '0000' + // extra_precision[0]
        '0000000000000001' + // event_outcome[1]
        '0000000000000001' + // outcome_payout[1]
        '0000'// extra_precision[1]
      ); // prettier-ignore
    });

    it('deserializes', () => {
      const buf =  Buffer.from(
        '00' + // type
        '02' + // num_points
        '0000000000000000' + // event_outcome[0]
        '0000000000000000' + // outcome_payout[0]
        '0000' + // extra_precision[0]
        '0000000000000001' + // event_outcome[1]
        '0000000000000001' + // outcome_payout[1]
        '0000'// extra_precision[1]
      , 'hex'); // prettier-ignore

      const instance = PolynomialPayoutCurvePiece.deserialize(buf);

      expect(instance.points[0].eventOutcome).to.equal(BigInt(0));
      expect(instance.points[0].outcomePayout).to.equal(BigInt(0));
      expect(instance.points[0].extraPrecision).to.equal(0);

      expect(instance.points[1].eventOutcome).to.equal(BigInt(1));
      expect(instance.points[1].outcomePayout).to.equal(BigInt(1));
      expect(instance.points[1].extraPrecision).to.equal(0);
    });
  });
  describe('HyperbolaPayoutCurvePiece', () => {
    const piece =
      '0101010000000000000000000001000000000000000000000100000000000000010000010000000000000001000001000000000000000100000100000000000000010000';

    it('serializes', () => {
      const instance = new HyperbolaPayoutCurvePiece();

      instance.usePositivePiece = true;
      instance.translateOutcome = new BigNumber(0);
      instance.translatePayout = new BigNumber(0);
      instance.a = new BigNumber(1);
      instance.b = new BigNumber(1);
      instance.c = new BigNumber(1);
      instance.d = new BigNumber(1);

      expect(instance.serialize().toString('hex')).to.equal(piece);
    });

    it('deserializes', () => {
      const buf = Buffer.from(piece, 'hex');
      const instance = HyperbolaPayoutCurvePiece.deserialize(buf);

      expect(instance.usePositivePiece).to.equal(true);
      expect(instance.translateOutcome.toNumber()).to.equal(0);
      expect(instance.translatePayout.toNumber()).to.equal(0);
      expect(instance.a.toNumber()).to.equal(1);
      expect(instance.b.toNumber()).to.equal(1);
      expect(instance.c.toNumber()).to.equal(1);
      expect(instance.d.toNumber()).to.equal(1);
    });
  });
});
