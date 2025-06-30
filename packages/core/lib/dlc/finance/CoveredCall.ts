import { PayoutFunction } from '@node-dlc/messaging';
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
): { payoutFunction: PayoutFunction; totalCollateral: bigint } => {
  const { maxOutcome, totalCollateral, payoutCurve } = buildCurve(
    strikePrice,
    contractSize,
    oracleBase,
    oracleDigits,
  );

  const payoutFunction = new PayoutFunction();

  // Defensive fix: ensure payoutFunctionPieces is initialized as an array
  if (!payoutFunction.payoutFunctionPieces) {
    payoutFunction.payoutFunctionPieces = [];
  }

  const curvePiece = payoutCurve.toPayoutCurvePiece();

  // Set the left and right endpoints for the hyperbola piece (matching rust-dlc structure)
  curvePiece.leftEndPoint = {
    eventOutcome: BigInt(0),
    outcomePayout: totalCollateral,
    extraPrecision: 0,
  };
  curvePiece.rightEndPoint = {
    eventOutcome: maxOutcome,
    outcomePayout: BigInt(0),
    extraPrecision: 0,
  };

  payoutFunction.payoutFunctionPieces.push({
    endPoint: {
      eventOutcome: maxOutcome,
      outcomePayout: BigInt(0),
      extraPrecision: 0,
    },
    payoutCurvePiece: curvePiece,
  });

  payoutFunction.lastEndpoint = {
    eventOutcome: maxOutcome,
    outcomePayout: BigInt(0),
    extraPrecision: 0,
  };

  return {
    payoutFunction,
    totalCollateral,
  };
};

export const CoveredCall = { buildCurve, buildPayoutFunction };
