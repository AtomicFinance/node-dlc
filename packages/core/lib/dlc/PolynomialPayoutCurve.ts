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
    const { left, right, slope } = this;
    const y = new BigNumber(Number(payout));

    // Handle flat line case (slope = 0)
    if (slope.isZero()) {
      // For a flat line, any outcome on the line is valid, return the left outcome
      return BigInt(left.outcome.toString());
    }

    // Handle infinite slope (vertical line) - shouldn't happen in practice
    if (!slope.isFinite()) {
      throw new Error(
        'Invalid slope: cannot have vertical line in payout curve',
      );
    }

    // Find the x value for the given y
    // slope = (y2 - y1) / (x2 - x1)
    // Rearranging: x = (y - y1) / slope + x1
    const outcome = y
      .minus(left.payout)
      .dividedBy(slope)
      .plus(left.outcome)
      .integerValue();

    // Validate that the result is finite
    if (!outcome.isFinite()) {
      throw new Error(
        `Invalid outcome calculation: result is not finite. Payout: ${payout}, Left: {${left.outcome}, ${left.payout}}, Right: {${right.outcome}, ${right.payout}}, Slope: ${slope}`,
      );
    }

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

    // Process pieces sequentially, but use the curve to determine the correct fromPayout
    let previousOutcome = BigInt(0);

    for (let i = 0; i < payoutFunction.payoutFunctionPieces.length; i++) {
      const piece = payoutFunction.payoutFunctionPieces[i];
      const { payoutCurvePiece } = piece;

      const curve = this.fromPayoutCurvePiece(
        payoutCurvePiece as PolynomialPayoutCurvePiece,
      );

      const fromOutcome = previousOutcome;
      const toOutcome = piece.endPoint.eventOutcome;
      const toPayout = piece.endPoint.outcomePayout;

      // Calculate the fromPayout using the curve for this piece
      const fromPayout = BigInt(
        curve.getPayout(fromOutcome).integerValue().toString(),
      );

      // Only add ranges where to > from
      if (toOutcome > fromOutcome) {
        CETS.push(
          ...splitIntoRanges(
            fromOutcome,
            toOutcome,
            fromPayout,
            toPayout,
            totalCollateral,
            curve,
            roundingIntervals.intervals,
          ),
        );
      }

      // Update for next iteration
      previousOutcome = toOutcome;
    }

    return mergePayouts(CETS);
  }
}
