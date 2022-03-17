import { PayoutFunctionV0 } from '@node-dlc/messaging';
import BN from 'bignumber.js';

import { PolynomialPayoutCurve } from '../PolynomialPayoutCurve';

const buildPayoutFunction = (
  minPayout: bigint,
  maxPayout: bigint,
  startOutcome: bigint,
  endOutcome: bigint,
  oracleBase: number,
  oracleDigits: number,
): { payoutFunction: PayoutFunctionV0 } => {
  // Max outcome limited by the oracle
  const maxOutcome = BigInt(
    new BN(oracleBase).pow(oracleDigits).minus(1).toString(10),
  );

  // max loss line
  const payoutCurveMaxLoss = new PolynomialPayoutCurve([
    { outcome: new BN(0), payout: new BN(Number(minPayout)) },
    {
      outcome: new BN(Number(startOutcome)),
      payout: new BN(Number(minPayout)),
    },
  ]);

  // payout line
  const payoutCurve = new PolynomialPayoutCurve([
    {
      outcome: new BN(Number(startOutcome)),
      payout: new BN(Number(minPayout)),
    },
    {
      outcome: new BN(Number(endOutcome)),
      payout: new BN(Number(maxPayout)),
    },
  ]);

  // max gain line
  const payoutCurveMaxGain = new PolynomialPayoutCurve([
    { outcome: new BN(Number(endOutcome)), payout: new BN(Number(maxPayout)) },
    {
      outcome: new BN(Number(maxOutcome)),
      payout: new BN(Number(maxPayout)),
    },
  ]);

  const payoutFunction = new PayoutFunctionV0();
  payoutFunction.endpoint0 = BigInt(0);
  payoutFunction.endpointPayout0 = minPayout;
  payoutFunction.extraPrecision0 = 0;

  payoutFunction.pieces.push({
    payoutCurvePiece: payoutCurveMaxLoss.toPayoutCurvePiece(),
    endpoint: startOutcome,
    endpointPayout: minPayout,
    extraPrecision: 0,
  });

  payoutFunction.pieces.push({
    payoutCurvePiece: payoutCurve.toPayoutCurvePiece(),
    endpoint: endOutcome,
    endpointPayout: maxPayout,
    extraPrecision: 0,
  });

  payoutFunction.pieces.push({
    payoutCurvePiece: payoutCurveMaxGain.toPayoutCurvePiece(),
    endpoint: maxOutcome,
    endpointPayout: maxPayout,
    extraPrecision: 0,
  });

  return {
    payoutFunction,
  };
};

export const LinearPayout = { buildPayoutFunction };
