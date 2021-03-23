import {
  PayoutFunctionV0,
  RoundingIntervalsV0,
  HyperbolaPayoutCurvePiece,
} from '@node-dlc/messaging';
import BN from 'bignumber.js';
import { toBigInt } from '../../utils/BigIntUtils';
import { CETPayout, splitIntoRanges } from '../CETCalculator';
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
  payoutFunction.endpoint0 = 0n;
  payoutFunction.endpointPayout0 = 0n;
  payoutFunction.extraPrecision0 = 0;

  payoutFunction.pieces.push({
    payoutCurvePiece: payoutCurve.toPayoutCurvePiece(),
    endpoint: maxOutcome,
    endpointPayout: 0n,
    extraPrecision: 0,
  });

  return {
    payoutFunction,
    totalCollateral,
  };
};

const computePayouts = (
  payoutFunction: PayoutFunctionV0,
  totalCollateral: bigint,
  roundingIntervals: RoundingIntervalsV0,
): CETPayout[] => {
  if (payoutFunction.pieces.length !== 1)
    throw new Error('Must have at least one piece');
  const {
    endpoint,
    endpointPayout,
    payoutCurvePiece,
  } = payoutFunction.pieces[0];

  if (!(payoutCurvePiece instanceof HyperbolaPayoutCurvePiece))
    throw new Error('Payout curve piece must be a hyperbola');

  const curve = HyperbolaPayoutCurve.fromPayoutCurvePiece(payoutCurvePiece);

  return splitIntoRanges(
    payoutFunction.endpoint0,
    endpoint,
    payoutFunction.endpointPayout0,
    endpointPayout,
    totalCollateral,
    curve,
    roundingIntervals.intervals,
  );
};

export const CoveredCall = { buildCurve, buildPayoutFunction, computePayouts };
