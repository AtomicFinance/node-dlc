import { PayoutFunction } from '@node-dlc/messaging';
import BN from 'bignumber.js';

import { PolynomialPayoutCurve } from '../PolynomialPayoutCurve';

const buildPayoutFunction = (
  minPayout: bigint,
  maxPayout: bigint,
  startOutcome: bigint,
  endOutcome: bigint,
  oracleBase: number,
  oracleDigits: number,
): { payoutFunction: PayoutFunction } => {
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

  const payoutFunction = new PayoutFunction();

  // Defensive fix: ensure payoutFunctionPieces is initialized as an array
  if (!payoutFunction.payoutFunctionPieces) {
    payoutFunction.payoutFunctionPieces = [];
  }

  payoutFunction.payoutFunctionPieces.push({
    endPoint: {
      eventOutcome: startOutcome,
      outcomePayout: minPayout,
      extraPrecision: 0,
    },
    payoutCurvePiece: payoutCurveMaxLoss.toPayoutCurvePiece(),
  });

  payoutFunction.payoutFunctionPieces.push({
    endPoint: {
      eventOutcome: endOutcome,
      outcomePayout: maxPayout,
      extraPrecision: 0,
    },
    payoutCurvePiece: payoutCurve.toPayoutCurvePiece(),
  });

  payoutFunction.payoutFunctionPieces.push({
    endPoint: {
      eventOutcome: maxOutcome,
      outcomePayout: maxPayout,
      extraPrecision: 0,
    },
    payoutCurvePiece: payoutCurveMaxGain.toPayoutCurvePiece(),
  });

  payoutFunction.lastEndpoint = {
    eventOutcome: maxOutcome,
    outcomePayout: maxPayout,
    extraPrecision: 0,
  };

  return {
    payoutFunction,
  };
};

export const LinearPayout = { buildPayoutFunction };
