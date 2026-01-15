import {
  HyperbolaPayoutCurvePiece,
  MessageType,
  PayoutCurvePieceType,
  PayoutFunctionV0,
  RoundingIntervals,
} from '@node-dlc/messaging';
import BigNumber from 'bignumber.js';

import { CETPayout } from '..';
import { splitIntoRanges } from './CETCalculator';
import PayoutCurve from './PayoutCurve';

export class HyperbolaPayoutCurve implements PayoutCurve {
  constructor(
    private a: BigNumber,
    private b: BigNumber,
    private c: BigNumber,
    private d: BigNumber,
    private translateOutcome: BigNumber,
    private translatePayout: BigNumber,
    private positive: boolean = true, // TODO: support negative pieces
  ) {}

  getPayout(_x: bigint): BigNumber {
    const { a, b, c, d, translateOutcome, translatePayout } = this;
    const x = new BigNumber(Number(_x));

    const payout = c
      .times(
        x
          .minus(translateOutcome)
          .plus(
            x
              .minus(translateOutcome)
              .exponentiatedBy(2)
              .minus(a.times(b).times(4))
              .squareRoot(),
          )
          .div(a.times(2)),
      )
      .plus(
        a
          .times(d)
          .times(2)
          .div(
            x
              .minus(translateOutcome)
              .plus(
                x
                  .minus(translateOutcome)
                  .exponentiatedBy(2)
                  .minus(a.times(b).times(4))
                  .squareRoot(),
              ),
          ),
      )
      .plus(translatePayout);

    return payout;
  }

  getOutcomeForPayout(payout: BigNumber): bigint {
    const { a, b, c, d, translateOutcome, translatePayout } = this;

    // Inverse function
    // y=(-ad^{2}-bf_{2}^{2}+2bf_{2}x-bx^{2}+df_{1}f_{2}-df_{1}x)/(d(f_{2}-x))
    if (c.eq(0)) {
      const denominator = d.times(translatePayout.minus(payout));

      if (denominator.eq(0)) {
        return BigInt(-1);
      }

      const outcome = a
        .negated()
        .times(d.exponentiatedBy(2))
        .minus(b.times(translatePayout.exponentiatedBy(2)))
        .plus(b.times(translatePayout).times(payout).times(2))
        .minus(b.times(payout.exponentiatedBy(2)))
        .plus(d.times(translateOutcome).times(translatePayout))
        .minus(d.times(translateOutcome).times(payout))
        .dividedBy(denominator)
        .integerValue();

      if (outcome.isFinite()) return BigInt(outcome.toString());
      return BigInt(-1);
    } else {
      // y=\left((\sqrt{((adf_{2}-adx+bcf_{2}-bcx-2c\cdot d\cdot f_{1})^{2}-4cd(a^{2}d^{2}-2abcd+abf_{2}^{2}-2abf_{2}x+abx^{2}-adf_{1}f_{2}+adf_{1}x+b^{2}c^{2}-bcf_{1}f_{2}+bcf_{1}x+c\cdot d\cdot f_{1}^{2}))}-adf_{2}+adx-bcf_{2}+bcx+2c\cdot d\cdot f_{1})\right)/(2cd)
      throw new Error('Not supported');
    }
  }

  toPayoutCurvePiece(): HyperbolaPayoutCurvePiece {
    const { a, b, c, d, translateOutcome, translatePayout, positive } = this;

    // Use the constructor with string values to avoid F64 dependency issues
    const piece = new HyperbolaPayoutCurvePiece(
      positive,
      translateOutcome.toString(),
      translatePayout.toString(),
      a.toString(),
      b.toString(),
      c.toString(),
      d.toString(),
    );

    return piece;
  }

  equals(curve: HyperbolaPayoutCurve): boolean {
    return (
      this.a.eq(curve.a) &&
      this.b.eq(curve.b) &&
      this.c.eq(curve.c) &&
      this.d.eq(curve.d) &&
      this.translateOutcome.eq(curve.translateOutcome) &&
      this.translatePayout.eq(curve.translatePayout) &&
      this.positive === curve.positive
    );
  }

  static fromPayoutCurvePiece(
    piece: HyperbolaPayoutCurvePiece,
  ): HyperbolaPayoutCurve {
    // Convert F64 values to BigNumber using toDecimal().toString() to preserve precision
    const a = new BigNumber(piece.a.toDecimal().toString());
    const b = new BigNumber(piece.b.toDecimal().toString());
    const c = new BigNumber(piece.c.toDecimal().toString());
    const d = new BigNumber(piece.d.toDecimal().toString());
    const translateOutcome = new BigNumber(
      piece.translateOutcome.toDecimal().toString(),
    );
    const translatePayout = new BigNumber(
      piece.translatePayout.toDecimal().toString(),
    );

    return new HyperbolaPayoutCurve(
      a,
      b,
      c,
      d,
      translateOutcome,
      translatePayout,
      piece.usePositivePiece,
    );
  }

  static computePayouts(
    payoutFunction: PayoutFunctionV0,
    totalCollateral: bigint,
    roundingIntervals: RoundingIntervals,
  ): CETPayout[] {
    if (payoutFunction.payoutFunctionPieces.length !== 1)
      throw new Error('Must have at least one piece');
    const { endPoint, payoutCurvePiece } =
      payoutFunction.payoutFunctionPieces[0];

    if (
      payoutCurvePiece.payoutCurvePieceType !==
        PayoutCurvePieceType.Hyperbola &&
      payoutCurvePiece.type !== MessageType.HyperbolaPayoutCurvePiece &&
      payoutCurvePiece.type !== MessageType.OldHyperbolaPayoutCurvePiece
    )
      throw new Error('Payout curve piece must be a hyperbola');

    const _payoutCurvePiece = payoutCurvePiece as HyperbolaPayoutCurvePiece;
    const curve = this.fromPayoutCurvePiece(_payoutCurvePiece);

    // For the new PayoutFunction structure, get the starting point from the hyperbola piece's leftEndPoint
    // This matches the rust-dlc implementation where get_first_outcome() returns left_end_point.event_outcome
    const initialEventOutcome =
      _payoutCurvePiece.leftEndPoint?.eventOutcome || BigInt(0);
    const initialOutcomePayout =
      _payoutCurvePiece.leftEndPoint?.outcomePayout || BigInt(0);
    return splitIntoRanges(
      initialEventOutcome,
      endPoint.eventOutcome,
      initialOutcomePayout,
      endPoint.outcomePayout,
      totalCollateral,
      curve,
      roundingIntervals.intervals,
    );
  }
}
