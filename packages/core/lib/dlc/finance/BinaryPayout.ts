import { PayoutFunctionV0 } from '@node-dlc/messaging';
import BN from 'bignumber.js';

import { PolynomialPayoutCurve } from '../PolynomialPayoutCurve';

const buildPayoutFunction = (
  belowXPayout: bigint,
  aboveOrEqualXPayout: bigint,
  thresholdOutcome: bigint,
  oracleBase: number,
  oracleDigits: number,
): { payoutFunction: PayoutFunctionV0 } => {
  // Max outcome limited by the oracle
  const maxOutcome = BigInt(
    new BN(oracleBase).pow(oracleDigits).minus(1).toString(10),
  );

  // payout for outcomes below x
  const payoutCurveBelowX = new PolynomialPayoutCurve([
    { outcome: new BN(0), payout: new BN(Number(belowXPayout)) },
    {
      outcome: new BN(Number(thresholdOutcome) - 1),
      payout: new BN(Number(belowXPayout)),
    },
  ]);

  // payout line
  const payoutCurve = new PolynomialPayoutCurve([
    {
      outcome: new BN(Number(thresholdOutcome) - 1),
      payout: new BN(Number(belowXPayout)),
    },
    {
      outcome: new BN(Number(thresholdOutcome)),
      payout: new BN(Number(aboveOrEqualXPayout)),
    },
  ]);

  // payout for outcomes above or equal to x
  const payoutCurveAboveOrEqualX = new PolynomialPayoutCurve([
    {
      outcome: new BN(Number(thresholdOutcome)),
      payout: new BN(Number(aboveOrEqualXPayout)),
    },
    {
      outcome: new BN(Number(maxOutcome)),
      payout: new BN(Number(aboveOrEqualXPayout)),
    },
  ]);

  const payoutFunction = new PayoutFunctionV0();
  payoutFunction.endpoint0 = BigInt(0);
  payoutFunction.endpointPayout0 = belowXPayout;
  payoutFunction.extraPrecision0 = 0;

  payoutFunction.pieces.push({
    payoutCurvePiece: payoutCurveBelowX.toPayoutCurvePiece(),
    endpoint: thresholdOutcome - BigInt(1),
    endpointPayout: belowXPayout,
    extraPrecision: 0,
  });

  payoutFunction.pieces.push({
    payoutCurvePiece: payoutCurve.toPayoutCurvePiece(),
    endpoint: thresholdOutcome,
    endpointPayout: aboveOrEqualXPayout,
    extraPrecision: 0,
  });

  payoutFunction.pieces.push({
    payoutCurvePiece: payoutCurveAboveOrEqualX.toPayoutCurvePiece(),
    endpoint: maxOutcome,
    endpointPayout: aboveOrEqualXPayout,
    extraPrecision: 0,
  });

  return {
    payoutFunction,
  };
};

export const BinaryPayout = { buildPayoutFunction };
