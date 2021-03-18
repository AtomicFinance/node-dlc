import { IInterval } from '@node-dlc/messaging';
import BigNumber from 'bignumber.js';

type Interval = {
  firstOutcome: BigNumber;
  nextFirstOutcome: BigNumber;
  roundingMod: bigint;
};

class RoundingIntervals {
  constructor(private intervalStarts: IInterval) {}

  round(outcome: BigNumber, computedPayout: bigint): bigint {}
}
