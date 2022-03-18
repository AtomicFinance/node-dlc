import BigNumber from 'bignumber.js';

export default interface PayoutCurve {
  getPayout(x: BigInt): BigNumber;
  getOutcomeForPayout(y: BigNumber): BigInt;
}
