// long call, set f2 = 1, d = contractSize * strike
// find max yvalue at max_x. set as total collateral.

// short call, a = 1, d = contractSize * strike
// set f2 to be - yvalue at max_x
// set total collateral to be contractSize negative yvalue at max_x

import BigNumber from 'bignumber.js';

class HyperbolaPayoutCurve {
  constructor(
    private a: BigNumber,
    private b: BigNumber,
    private c: BigNumber,
    private d: BigNumber,
    private f_1: BigNumber,
    private f_2: BigNumber,
    private positive: boolean,
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

    // inverse fn
    // y=(-ad^{2}-bf_{2}^{2}+2bf_{2}x-bx^{2}+df_{1}f_{2}-df_{1}x)/(d(f_{2}-x))

    if (c.eq(0)) {
      return BigInt(
        a
          .negated()
          .times(d.exponentiatedBy(2))
          .minus(b.times(f_2.exponentiatedBy(2)))
          .plus(b.times(f_2).times(payout).times(2))
          .minus(b.times(payout.exponentiatedBy(2)))
          .plus(d.times(f_1).times(f_2))
          .minus(d.times(f_1).times(payout))
          .dividedBy(d.times(f_2.minus(payout)))
          .integerValue(BigNumber.ROUND_CEIL)
          .toString(),
      );
    } else {
      // y=\left((\sqrt{((adf_{2}-adx+bcf_{2}-bcx-2c\cdot d\cdot f_{1})^{2}-4cd(a^{2}d^{2}-2abcd+abf_{2}^{2}-2abf_{2}x+abx^{2}-adf_{1}f_{2}+adf_{1}x+b^{2}c^{2}-bcf_{1}f_{2}+bcf_{1}x+c\cdot d\cdot f_{1}^{2}))}-adf_{2}+adx-bcf_{2}+bcx+2c\cdot d\cdot f_{1})\right)/(2cd)
      throw new Error('Not supported');
    }
  }
}

const hyperbola = new HyperbolaPayoutCurve(
  new BigNumber(-0.3), // a
  new BigNumber(0), // b
  new BigNumber(0), // c
  new BigNumber(50), // d
  new BigNumber(3.5), // f_1
  new BigNumber(1.8), // f_2
  true,
);

console.log(hyperbola.getPayout(6n).toNumber());

// console.log(hyperbola.getOutcomeForPayout(payout).toNumber());

export default HyperbolaPayoutCurve;
