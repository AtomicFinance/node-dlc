import { PayoutFunctionV1 } from '@node-dlc/messaging';
import BigNumber from 'bignumber.js';

const getPrecision = (num: BigNumber): number =>
  num.decimalPlaces(16).abs().modulo(1).shiftedBy(16).toNumber();

const fromPrecision = (precision: number): BigNumber =>
  new BigNumber(precision).shiftedBy(-16);

export class HyperbolaPayoutCurve {
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
      return -1n;
    } else {
      // y=\left((\sqrt{((adf_{2}-adx+bcf_{2}-bcx-2c\cdot d\cdot f_{1})^{2}-4cd(a^{2}d^{2}-2abcd+abf_{2}^{2}-2abf_{2}x+abx^{2}-adf_{1}f_{2}+adf_{1}x+b^{2}c^{2}-bcf_{1}f_{2}+bcf_{1}x+c\cdot d\cdot f_{1}^{2}))}-adf_{2}+adx-bcf_{2}+bcx+2c\cdot d\cdot f_{1})\right)/(2cd)
      throw new Error('Not supported');
    }
  }

  toPayoutFunction(): PayoutFunctionV1 {
    const { a, b, c, d, translateOutcome, translatePayout, positive } = this;

    const pf = new PayoutFunctionV1();
    pf.usePositivePiece = positive;

    pf.translateOutcomeSign = translateOutcome.isPositive();
    pf.translateOutcome = BigInt(translateOutcome.abs().toString());
    pf.translateOutcomeExtraPrecision = getPrecision(translateOutcome);

    pf.translatePayoutSign = false;
    pf.translatePayout = BigInt(translatePayout.abs().toString());
    pf.translatePayoutExtraPrecision = getPrecision(translatePayout);

    pf.aSign = a.isPositive();
    pf.a = BigInt(a.abs().toString());
    pf.aExtraPrecision = getPrecision(a);

    pf.bSign = a.isPositive();
    pf.b = BigInt(b.abs().toString());
    pf.bExtraPrecision = getPrecision(b);

    pf.cSign = c.isPositive();
    pf.c = BigInt(c.abs().toString());
    pf.cExtraPrecision = getPrecision(c);

    pf.dSign = d.isPositive();
    pf.d = BigInt(d.integerValue().toString());
    pf.dExtraPrecision = getPrecision(d);

    return pf;
  }

  static fromPayoutFunction(pf: PayoutFunctionV1): HyperbolaPayoutCurve {
    const a = new BigNumber(pf.a.toString())
      .times(pf.aSign ? 1 : -1)
      .plus(fromPrecision(pf.aExtraPrecision));

    const b = new BigNumber(pf.b.toString())
      .times(pf.bSign ? 1 : -1)
      .plus(fromPrecision(pf.bExtraPrecision));

    const c = new BigNumber(pf.c.toString())
      .times(pf.cSign ? 1 : -1)
      .plus(fromPrecision(pf.cExtraPrecision));

    const d = new BigNumber(pf.d.toString())
      .times(pf.dSign ? 1 : -1)
      .plus(fromPrecision(pf.dExtraPrecision));

    const translateOutcome = new BigNumber(pf.translateOutcome.toString())
      .times(pf.translateOutcomeSign ? 1 : -1)
      .plus(fromPrecision(pf.translateOutcomeExtraPrecision));

    const translatePayout = new BigNumber(pf.translatePayout.toString())
      .times(pf.translatePayoutSign ? 1 : -1)
      .plus(fromPrecision(pf.translatePayoutExtraPrecision));

    return new HyperbolaPayoutCurve(
      a,
      b,
      c,
      d,
      translateOutcome,
      translatePayout,
      pf.usePositivePiece,
    );
  }
}
