import { PayoutFunctionV0 } from '@node-dlc/messaging';
import BN from 'bignumber.js';

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
  const f_2 = new BN(-Number(contractSize));

  const payoutCurve = new HyperbolaPayoutCurve(a, b, c, d, f_1, f_2);

  const maxOutcome = BigInt(
    new BN(oracleBase).pow(oracleDigits).minus(1).toString(10),
  );

  return {
    maxOutcome,
    totalCollateral: contractSize,
    payoutCurve,
  };
};

const buildPayoutFunction = (
  strikePrice: bigint,
  contractSize: bigint,
  totalCollateral: bigint,
  oracleBase: number,
  oracleDigits: number,
): { payoutFunction: PayoutFunctionV0; totalCollateral: bigint } => {
  const { maxOutcome, payoutCurve } = buildCurve(
    strikePrice,
    contractSize,
    oracleBase,
    oracleDigits,
  );

  const payoutFunction = new PayoutFunctionV0();

  payoutFunction.payoutFunctionPieces.push({
    endPoint: {
      eventOutcome: maxOutcome,
      outcomePayout: BigInt(0),
      extraPrecision: 0,
    },
    payoutCurvePiece: payoutCurve.toPayoutCurvePiece(),
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

export const LongPut = { buildCurve, buildPayoutFunction };
