import { MessageType, PolynomialPayoutCurvePiece } from '@node-dlc/messaging';
import BigNumber from 'bignumber.js';
import { expect } from 'chai';

import { PolynomialPayoutCurve } from '../../lib/dlc/PolynomialPayoutCurve';
import { fromPrecision } from '../../lib/utils/Precision';

describe('PolynomialPayoutCurve', () => {
  const points = [
    {
      outcome: new BigNumber(1),
      payout: new BigNumber(1),
    },
    {
      outcome: new BigNumber(2),
      payout: new BigNumber(2),
    },
  ];

  describe('#constructor', () => {
    it('should create a PolynomialPayoutCurve', () => {
      const curve = new PolynomialPayoutCurve(points);
      expect(curve).to.be.instanceOf(PolynomialPayoutCurve);
    });
  });

  describe('#getPayoutForOutcome', () => {
    it('should get the payout for an outcome', () => {
      const curve = new PolynomialPayoutCurve(points);
      const payout = curve.getPayoutForOutcome(BigInt(1));
      expect(payout).to.deep.equal(new BigNumber(1));
    });

    it('should get the payout for an outcome', () => {
      const curve = new PolynomialPayoutCurve(points);
      const payout = curve.getPayoutForOutcome(BigInt(2));
      expect(payout).to.deep.equal(new BigNumber(2));
    });
  });

  describe('#getOutcomeForPayout', () => {
    it('should get the outcome for a payout', () => {
      const curve = new PolynomialPayoutCurve(points);
      const outcome = curve.getOutcomeForPayout(new BigNumber(1));
      console.log(outcome);
      expect(outcome).to.deep.equal(BigInt(1));
    });

    it('should get the outcome for a payout', () => {
      const curve = new PolynomialPayoutCurve(points);
      const outcome = curve.getOutcomeForPayout(new BigNumber(2));
      expect(outcome).to.deep.equal(BigInt(2));
    });
  });

  describe('#toPayoutCurvePiece', () => {
    it('should serialize to a PolynomialPayoutCurvePiece', () => {
      const curve = new PolynomialPayoutCurve(points);
      const piece = curve.toPayoutCurvePiece();
      expect(piece).to.deep.equal({
        type: MessageType.PolynomialPayoutCurvePiece,
        points: [
          {
            eventOutcome: BigInt(1),
            outcomePayout: BigInt(1),
            extraPrecision: 0,
          },
          {
            eventOutcome: BigInt(2),
            outcomePayout: BigInt(2),
            extraPrecision: 0,
          },
        ],
      });
    });
  });

  describe('#fromPayoutCurvePiece', () => {
    const points = [
      {
        eventOutcome: BigInt(1),
        outcomePayout: BigInt(1),
        extraPrecision: 0,
      },
      {
        eventOutcome: BigInt(2),
        outcomePayout: BigInt(2),
        extraPrecision: 0,
      },
    ];

    it('should deserialize from a PolynomialPayoutCurvePiece', () => {
      const piece = new PolynomialPayoutCurvePiece();
      piece.points = points;
      const curve = PolynomialPayoutCurve.fromPayoutCurvePiece(piece);
      expect(curve).to.be.instanceOf(PolynomialPayoutCurve);
      expect(curve['points']).to.deep.eq(
        points.map((p) => ({
          outcome: new BigNumber(p.eventOutcome.toString()),
          payout: new BigNumber(p.outcomePayout.toString()).plus(
            fromPrecision(p.extraPrecision),
          ),
        })),
      );
    });
  });

  describe('#equals', () => {
    it('should return true if the curves are equal', () => {
      const curve1 = new PolynomialPayoutCurve(points);
      const curve2 = new PolynomialPayoutCurve(points);
      expect(curve1.equals(curve2)).to.be.true;
    });

    it('should return false if the curves are not equal', () => {
      const curve1 = new PolynomialPayoutCurve(points);
      const curve2 = new PolynomialPayoutCurve([
        {
          outcome: new BigNumber(1),
          payout: new BigNumber(1),
        },
      ]);
      expect(curve1.equals(curve2)).to.be.false;
    });
  });

  describe('#computePayouts', () => {
    // TODO: add tests
  });
});
