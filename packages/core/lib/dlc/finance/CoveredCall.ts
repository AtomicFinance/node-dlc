import { PayoutFunctionV0 } from '@node-dlc/messaging';
import BN from 'bignumber.js';

import { toBigInt } from '../../utils/BigIntUtils';
import { HyperbolaPayoutCurve } from '../HyperbolaPayoutCurve';

const buildCurve = (
  strikePrice: bigint,
  contractSize: bigint,
  oracleBase: number,
  oracleDigits: number,
): {
  maxOutcome: bigint;
  totalCollateral: bigint;
  payoutCurve: HyperbolaPayoutCurve;
} => {
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

  return {
    maxOutcome,
    totalCollateral: contractSize - toBigInt(maxOutcomePayout),
    payoutCurve: new HyperbolaPayoutCurve(
      a,
      b,
      c,
      d,
      f_1,
      maxOutcomePayout.negated(),
    ),
  };
};

const buildPayoutFunction = (
  strikePrice: bigint,
  contractSize: bigint,
  oracleBase: number,
  oracleDigits: number,
): { payoutFunction: PayoutFunctionV0; totalCollateral: bigint } => {
  const { maxOutcome, totalCollateral, payoutCurve } = buildCurve(
    strikePrice,
    contractSize,
    oracleBase,
    oracleDigits,
  );

  const payoutFunction = new PayoutFunctionV0();
  payoutFunction.endpoint0 = BigInt(0);
  payoutFunction.endpointPayout0 = totalCollateral;
  payoutFunction.extraPrecision0 = 0;

  payoutFunction.pieces.push({
    payoutCurvePiece: payoutCurve.toPayoutCurvePiece(),
    endpoint: maxOutcome,
    endpointPayout: BigInt(0),
    extraPrecision: 0,
  });

  return {
    payoutFunction,
    totalCollateral,
  };
};

export const CoveredCall = { buildCurve, buildPayoutFunction };
