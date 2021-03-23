import BN from 'bignumber.js';
import { HyperbolaPayoutCurve } from '../HyperbolaPayoutCurve';

const buildCurve = (
  strikePrice: bigint,
  contractSize: bigint,
  oracleBase: number,
  oracleDigits: number,
): HyperbolaPayoutCurve => {
  const a = new BN(1);
  const b = new BN(0);
  const c = new BN(0);
  const d = new BN((strikePrice * contractSize).toString());

  const f_1 = new BN(0);
  const _f_2 = new BN(0);

  const _tempHyperbolaPayoutCurve = new HyperbolaPayoutCurve(
    a,
    b,
    c,
    d,
    f_1,
    _f_2,
  );

  const maxOutcome = BigInt(
    new BN(oracleBase).pow(oracleDigits).minus(1).toString(10),
  );
  const maxOutcomePayout = _tempHyperbolaPayoutCurve
    .getPayout(maxOutcome)
    .integerValue();

  return new HyperbolaPayoutCurve(a, b, c, d, f_1, maxOutcomePayout.negated());
};

export default { buildCurve };
