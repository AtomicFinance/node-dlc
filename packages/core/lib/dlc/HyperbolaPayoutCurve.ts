import { PayoutFunctionV1 } from '@node-dlc/messaging';
import BigNumber from 'bignumber.js';

export class HyperbolaPayoutCurve {
  constructor(
    private a: BigNumber,
    private b: BigNumber,
    private c: BigNumber,
    private d: BigNumber,
    private f_1: BigNumber,
    private f_2: BigNumber,
    private positive: boolean = true,
  ) {}

  getPayout(_x: bigint): BigNumber {
    const { a, b, c, d, f_1, f_2 } = this;
    const x = new BigNumber(Number(_x));

    const payout = c
      .times(
        x
          .minus(f_1)
          .plus(
            x
              .minus(f_1)
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
              .minus(f_1)
              .plus(
                x
                  .minus(f_1)
                  .exponentiatedBy(2)
                  .minus(a.times(b).times(4))
                  .squareRoot(),
              ),
          ),
      )
      .plus(f_2);

    return payout;
  }

  getOutcomeForPayout(payout: BigNumber): bigint {
    const { a, b, c, d, f_1, f_2 } = this;

    // Inverse function
    // y=(-ad^{2}-bf_{2}^{2}+2bf_{2}x-bx^{2}+df_{1}f_{2}-df_{1}x)/(d(f_{2}-x))
    if (c.eq(0)) {
      const outcome = a
        .negated()
        .times(d.exponentiatedBy(2))
        .minus(b.times(f_2.exponentiatedBy(2)))
        .plus(b.times(f_2).times(payout).times(2))
        .minus(b.times(payout.exponentiatedBy(2)))
        .plus(d.times(f_1).times(f_2))
        .minus(d.times(f_1).times(payout))
        .dividedBy(d.times(f_2.minus(payout)))
        .integerValue();

      if (outcome.isFinite()) return BigInt(outcome.toString());
      return -1n;
    } else {
      // y=\left((\sqrt{((adf_{2}-adx+bcf_{2}-bcx-2c\cdot d\cdot f_{1})^{2}-4cd(a^{2}d^{2}-2abcd+abf_{2}^{2}-2abf_{2}x+abx^{2}-adf_{1}f_{2}+adf_{1}x+b^{2}c^{2}-bcf_{1}f_{2}+bcf_{1}x+c\cdot d\cdot f_{1}^{2}))}-adf_{2}+adx-bcf_{2}+bcx+2c\cdot d\cdot f_{1})\right)/(2cd)
      throw new Error('Not supported');
    }
  }

  toPayoutFunction(): PayoutFunctionV1 {
    const { a, b, c, d, f_1, f_2, positive } = this;

    const pf = new PayoutFunctionV1();
    pf.usePositivePiece = positive;
    pf.translateOutcomeSign = f_1.isPositive();
    pf.translateOutcome = BigInt(f_1.abs().toString());
    pf.translateOutcomeExtraPrecision = f_1
      .decimalPlaces(16)
      .abs()
      .modulo(1)
      .shiftedBy(16)
      .toNumber();
    pf.translatePayoutSign = false;
    pf.translatePayout = BigInt(f_2.abs().toString());
    pf.translatePayoutExtraPrecision = f_2
      .decimalPlaces(16)
      .abs()
      .modulo(1)
      .shiftedBy(16)
      .toNumber();
    pf.aSign = a.isPositive();
    pf.a = BigInt(a.abs().toString());
    pf.aExtraPrecision = a
      .decimalPlaces(16)
      .abs()
      .modulo(1)
      .shiftedBy(16)
      .toNumber();
    pf.bSign = a.isPositive();
    pf.b = BigInt(b.abs().toString());
    pf.bExtraPrecision = b
      .decimalPlaces(16)
      .abs()
      .modulo(1)
      .shiftedBy(16)
      .toNumber();
    0;
    pf.cSign = c.isPositive();
    pf.c = BigInt(c.abs().toString());
    pf.cExtraPrecision = c
      .decimalPlaces(16)
      .abs()
      .modulo(1)
      .shiftedBy(16)
      .toNumber();
    0;
    pf.dSign = d.isPositive();
    pf.d = BigInt(d.integerValue().toString());
    pf.dExtraPrecision = d
      .decimalPlaces(16)
      .abs()
      .modulo(1)
      .shiftedBy(16)
      .toNumber();

    return pf;
  }

  static fromPayoutFunction(pf: PayoutFunctionV1): HyperbolaPayoutCurve {
    const a = new BigNumber(pf.a.toString())
      .times(pf.aSign ? 1 : -1)
      .plus(new BigNumber(pf.aExtraPrecision).shiftedBy(-16));

    const b = new BigNumber(pf.b.toString())
      .times(pf.bSign ? 1 : -1)
      .plus(new BigNumber(pf.bExtraPrecision).shiftedBy(-16));

    const c = new BigNumber(pf.c.toString())
      .times(pf.cSign ? 1 : -1)
      .plus(new BigNumber(pf.cExtraPrecision).shiftedBy(-16));

    const d = new BigNumber(pf.d.toString())
      .times(pf.dSign ? 1 : -1)
      .plus(new BigNumber(pf.dExtraPrecision).shiftedBy(-16));

    const f_1 = new BigNumber(pf.translateOutcome.toString())
      .times(pf.translateOutcomeSign ? 1 : -1)
      .plus(new BigNumber(pf.translateOutcomeExtraPrecision).shiftedBy(-16));

    const f_2 = new BigNumber(pf.translatePayout.toString())
      .times(pf.translatePayoutSign ? 1 : -1)
      .plus(new BigNumber(pf.translatePayoutExtraPrecision).shiftedBy(-16));

    return new HyperbolaPayoutCurve(a, b, c, d, f_1, f_2, pf.usePositivePiece);
  }
}
