import {
  MessageType,
  PayoutFunctionV0,
  PolynomialPayoutCurvePiece,
  RoundingIntervals,
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
    roundingIntervals: RoundingIntervals,
  ): CETPayout[] {
    if (payoutFunction.payoutFunctionPieces.length < 1)
      throw new Error('Must have at least one piece');

    payoutFunction.payoutFunctionPieces.forEach((piece) => {
      if (
        piece.payoutCurvePiece.type !== MessageType.PolynomialPayoutCurvePiece
      )
        throw new Error('Payout curve piece must be a polynomial');
    });

    const CETS: CETPayout[] = [];

    // 1. Add the first piece to the list
    const { payoutCurvePiece } = payoutFunction.payoutFunctionPieces[0];

    const curve = this.fromPayoutCurvePiece(
      payoutCurvePiece as PolynomialPayoutCurvePiece,
    );

    // For the first piece, start from 0 and go to the first endpoint
    const firstPiece = payoutFunction.payoutFunctionPieces[0];

    // Only add ranges if there's actually a range to cover
    if (firstPiece.endPoint.eventOutcome > 0) {
      CETS.push(
        ...splitIntoRanges(
          BigInt(0), // Start from 0
          firstPiece.endPoint.eventOutcome,
          firstPiece.endPoint.outcomePayout, // Start payout (assuming same as end for first piece)
          firstPiece.endPoint.outcomePayout,
          totalCollateral,
          curve,
          roundingIntervals.intervals,
        ),
      );
    }

    // 2. If there are subsequent pieces, add them to the list
    for (let i = 1; i < payoutFunction.payoutFunctionPieces.length; i++) {
      const { payoutCurvePiece } = payoutFunction.payoutFunctionPieces[i];

      const curve = this.fromPayoutCurvePiece(
        payoutCurvePiece as PolynomialPayoutCurvePiece,
      );

      CETS.push(
        ...splitIntoRanges(
          payoutFunction.payoutFunctionPieces[i - 1].endPoint.eventOutcome,
          payoutFunction.payoutFunctionPieces[i].endPoint.eventOutcome,
          payoutFunction.payoutFunctionPieces[i - 1].endPoint.outcomePayout,
          payoutFunction.payoutFunctionPieces[i].endPoint.outcomePayout,
          totalCollateral,
          curve,
          roundingIntervals.intervals,
        ),
      );
    }

    return mergePayouts(CETS);
  }
}
