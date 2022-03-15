import {
  HyperbolaPayoutCurvePiece,
  MessageType,
  PayoutFunctionV0,
  RoundingIntervalsV0,
} from '@node-dlc/messaging';
import BigNumber from 'bignumber.js';

import { CETPayout } from '..';
import { fromPrecision, getPrecision } from '../utils/Precision';
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
      const outcome = a
        .negated()
        .times(d.exponentiatedBy(2))
        .minus(b.times(translatePayout.exponentiatedBy(2)))
        .plus(b.times(translatePayout).times(payout).times(2))
        .minus(b.times(payout.exponentiatedBy(2)))
        .plus(d.times(translateOutcome).times(translatePayout))
        .minus(d.times(translateOutcome).times(payout))
        .dividedBy(d.times(translatePayout.minus(payout)))
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

    const piece = new HyperbolaPayoutCurvePiece();
    piece.usePositivePiece = positive;

    piece.translateOutcomeSign = translateOutcome.isPositive();
    piece.translateOutcome = BigInt(translateOutcome.abs().toString());
    piece.translateOutcomeExtraPrecision = getPrecision(translateOutcome);

    piece.translatePayoutSign = translatePayout.isPositive();
    piece.translatePayout = BigInt(translatePayout.abs().toString());
    piece.translatePayoutExtraPrecision = getPrecision(translatePayout);

    piece.aSign = a.isPositive();
    piece.a = BigInt(a.abs().toString());
    piece.aExtraPrecision = getPrecision(a);

    piece.bSign = b.isPositive();
    piece.b = BigInt(b.abs().toString());
    piece.bExtraPrecision = getPrecision(b);

    piece.cSign = c.isPositive();
    piece.c = BigInt(c.abs().toString());
    piece.cExtraPrecision = getPrecision(c);

    piece.dSign = d.isPositive();
    piece.d = BigInt(d.integerValue().toString());
    piece.dExtraPrecision = getPrecision(d);

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
    const a = new BigNumber(piece.a.toString())
      .times(piece.aSign ? 1 : -1)
      .plus(fromPrecision(piece.aExtraPrecision));

    const b = new BigNumber(piece.b.toString())
      .times(piece.bSign ? 1 : -1)
      .plus(fromPrecision(piece.bExtraPrecision));

    const c = new BigNumber(piece.c.toString())
      .times(piece.cSign ? 1 : -1)
      .plus(fromPrecision(piece.cExtraPrecision));

    const d = new BigNumber(piece.d.toString())
      .times(piece.dSign ? 1 : -1)
      .plus(fromPrecision(piece.dExtraPrecision));

    const translateOutcome = new BigNumber(piece.translateOutcome.toString())
      .times(piece.translateOutcomeSign ? 1 : -1)
      .plus(fromPrecision(piece.translateOutcomeExtraPrecision));

    const translatePayout = new BigNumber(piece.translatePayout.toString())
      .times(piece.translatePayoutSign ? 1 : -1)
      .plus(fromPrecision(piece.translatePayoutExtraPrecision));

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
    roundingIntervals: RoundingIntervalsV0,
  ): CETPayout[] {
    if (payoutFunction.pieces.length !== 1)
      throw new Error('Must have at least one piece');
    const {
      endpoint,
      endpointPayout,
      payoutCurvePiece,
    } = payoutFunction.pieces[0];

    if (
      payoutCurvePiece.type !== MessageType.HyperbolaPayoutCurvePiece &&
      payoutCurvePiece.type !== MessageType.OldHyperbolaPayoutCurvePiece
    )
      throw new Error('Payout curve piece must be a hyperbola');

    const _payoutCurvePiece = payoutCurvePiece as HyperbolaPayoutCurvePiece;

    const curve = this.fromPayoutCurvePiece(_payoutCurvePiece);

    return splitIntoRanges(
      payoutFunction.endpoint0,
      endpoint,
      payoutFunction.endpointPayout0,
      endpointPayout,
      totalCollateral,
      curve,
      roundingIntervals.intervals,
    );
  }
}
