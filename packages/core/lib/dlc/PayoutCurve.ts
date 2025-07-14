import BigNumber from 'bignumber.js';

export default interface PayoutCurve {
  getPayout(x: bigint): BigNumber;
  getOutcomeForPayout(y: BigNumber): bigint;
}
