import {
  MessageType,
  PayoutFunctionV0,
  PolynomialPayoutCurvePiece,
  RoundingIntervalsV0,
} from '@node-dlc/messaging';
import BigNumber from 'bignumber.js';

import { fromPrecision, getPrecision } from '../utils/Precision';
import { CETPayout, mergePayouts, splitIntoRanges } from './CETCalculator';

interface DlcPoint {
  outcome: BigNumber;
  payout: BigNumber;
}

export class PolynomialPayoutCurve {
  private readonly points: DlcPoint[];
  private readonly slope: BigNumber;
  private readonly left: DlcPoint;
  private readonly right: DlcPoint;

  constructor(points: DlcPoint[]) {
    if (points.length !== 2) throw new Error('Must have two points');
    this.points = points;
    this.left = points[0];
    this.right = points[points.length - 1];

    // m = (y2 - y1) / (x2 - x1)
    this.slope = this.right.payout
      .minus(this.left.payout)
      .dividedBy(this.right.outcome.minus(this.left.outcome));
  }

  /**
   * Get the payout for a given outcome
   * @param outcome The outcome to get the payout for
   * @returns The payout for the outcome
   */
  getPayout(outcome: bigint): BigNumber {
    const { left, slope } = this;

    const x = new BigNumber(Number(outcome));

    // y = mx + b
    const payout = slope.times(x.minus(left.outcome)).plus(left.payout);

    return payout;
  }

  /**
   * Get the outcome for a given payout
   * @param payout The payout to get the outcome for
   * @returns The outcome for the payout
   */
  getOutcomeForPayout(payout: BigNumber): bigint {
    const { left, slope } = this;
    const y = new BigNumber(Number(payout));

    // Find the x value for the given y
    // slope = (y2 - y1) / (x2 - x1)
    // x1 = (y2 - y1) / slope + x2
    const outcome = y
      .minus(left.payout)
      .dividedBy(slope)
      .plus(left.outcome)
      .integerValue();
    return BigInt(outcome.toString());
  }

  /**
   * Serializes PolynomialPayoutCurve to a PolynomialPayoutCurvePiece (for transport)
   * @returns A PolynomialPayoutCurvePiece
   */
  toPayoutCurvePiece(): PolynomialPayoutCurvePiece {
    const { points } = this;

    const piece = new PolynomialPayoutCurvePiece();

    piece.points = points.map((point) => {
      const eventOutcome = BigInt(point.outcome.toString());
      const outcomePayout = BigInt(point.payout.toString());
      const extraPrecision = getPrecision(point.payout);
      return { eventOutcome, outcomePayout, extraPrecision };
    });

    return piece;
  }

  /**
   * Determine if the payout curve is equal to another
   * @param curve A PolynomialPayoutCurve
   * @returns True if the curves are the same
   */
  equals(curve: PolynomialPayoutCurve): boolean {
    if (this.points.length !== curve.points.length) return false;

    return this.points.every((point, i) => {
      const otherPoint = curve.points[i];
      return (
        point.outcome.eq(otherPoint.outcome) &&
        point.payout.eq(otherPoint.payout)
      );
    });
  }

  /**
   * Creates a PolynomialPayoutCurve from a PolynomialPayoutCurvePiece
   * @param piece
   * @returns A PolynomialPayoutCurve
   */
  static fromPayoutCurvePiece(
    piece: PolynomialPayoutCurvePiece,
  ): PolynomialPayoutCurve {
    const points = piece.points.map((point) => {
      const outcome = new BigNumber(point.eventOutcome.toString());
      const payout = new BigNumber(point.outcomePayout.toString()).plus(
        fromPrecision(point.extraPrecision),
      );
      return { outcome, payout };
    });
    return new PolynomialPayoutCurve(points);
  }

  /**
   * Computes all CETs for a given payout curve
   * @param payoutFunction The payout function
   * @param totalCollateral The total collateral
   * @param roundingIntervals The rounding intervals
   * @returns A list of CETs
   */
  static computePayouts(
    payoutFunction: PayoutFunctionV0,
    totalCollateral: bigint,
    roundingIntervals: RoundingIntervalsV0,
  ): CETPayout[] {
    if (payoutFunction.pieces.length !== 3)
      throw new Error('Must have at least three pieces');

    if (
      payoutFunction.pieces[0].payoutCurvePiece.type !==
        MessageType.PolynomialPayoutCurvePiece ||
      payoutFunction.pieces[1].payoutCurvePiece.type !==
        MessageType.PolynomialPayoutCurvePiece ||
      payoutFunction.pieces[2].payoutCurvePiece.type !==
        MessageType.PolynomialPayoutCurvePiece
    )
      throw new Error('Payout curve piece must be a polynomial');

    const { payoutCurvePiece } = payoutFunction.pieces[1];

    const _payoutCurvePiece = payoutCurvePiece as PolynomialPayoutCurvePiece;

    const curve = this.fromPayoutCurvePiece(_payoutCurvePiece);

    const CETS: CETPayout[] = [];

    CETS.push(
      // Max loss curve
      {
        payout: payoutFunction.pieces[0].endpointPayout,
        indexFrom: payoutFunction.endpoint0,
        indexTo: payoutFunction.pieces[0].endpoint,
      },

      // payout curve
      ...splitIntoRanges(
        payoutFunction.pieces[0].endpoint,
        payoutFunction.pieces[1].endpoint,
        payoutFunction.pieces[0].endpointPayout,
        payoutFunction.pieces[1].endpointPayout,
        totalCollateral,
        curve,
        roundingIntervals.intervals,
      ),

      // max gain curve
      {
        payout: payoutFunction.pieces[2].endpointPayout,
        indexFrom: payoutFunction.pieces[1].endpoint,
        indexTo: payoutFunction.pieces[2].endpoint,
      },
    );

    return mergePayouts(CETS);
  }
}
