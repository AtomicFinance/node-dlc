import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { toBigInt } from '../util';
import { IDlcMessage } from './DlcMessage';

/**
 * RoundingIntervals defines rounding intervals for numeric outcome contracts.
 * Updated to match dlcspecs format (no longer uses TLV).
 */
export class RoundingIntervals implements IDlcMessage {
  public static type = MessageType.RoundingIntervals;

  /**
   * Creates a RoundingIntervals from JSON data
   * @param json JSON object representing rounding intervals
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): RoundingIntervals {
    const instance = new RoundingIntervals();

    const intervals = json.intervals || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instance.intervals = intervals.map((interval: any) => ({
      beginInterval: toBigInt(
        interval.beginInterval || interval.begin_interval,
      ),
      roundingMod: toBigInt(interval.roundingMod || interval.rounding_mod),
    }));

    return instance;
  }

  /**
   * Deserializes a rounding_intervals message
   * @param buf
   */
  public static deserialize(buf: Buffer): RoundingIntervals {
    const instance = new RoundingIntervals();
    const reader = new BufferReader(buf);

    const numRoundingIntervals = Number(reader.readBigSize());

    for (let i = 0; i < numRoundingIntervals; i++) {
      const beginInterval = reader.readUInt64BE();
      const roundingMod = reader.readUInt64BE();

      instance.intervals.push({ beginInterval, roundingMod });
    }

    return instance;
  }

  /**
   * The type for rounding_intervals message. rounding_intervals = 42788
   */
  public type = RoundingIntervals.type;

  public intervals: IInterval[] = [];

  /**
   * Validates correctness of all fields in the message
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/NumericOutcome.md#requirements
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    // 1. Intervals must be non-negative
    for (const interval of this.intervals) {
      if (interval.beginInterval < 0) {
        throw new Error('beginInterval must be non-negative');
      }
    }

    // 2. Intervals must be strictly increasing
    for (let i = 1; i < this.intervals.length; ++i) {
      if (
        this.intervals[i - 1].beginInterval >= this.intervals[i].beginInterval
      ) {
        throw new Error(`Intervals must be strictly increasing`);
      }
    }
  }

  /**
   * Converts rounding_intervals to JSON
   */
  public toJSON(): IRoundingIntervalsJSON {
    return {
      intervals: this.intervals.map((interval) => {
        return {
          beginInterval: Number(interval.beginInterval),
          roundingMod: Number(interval.roundingMod),
        };
      }),
    };
  }

  /**
   * Serializes the rounding_intervals message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.intervals.length);

    for (const interval of this.intervals) {
      writer.writeUInt64BE(interval.beginInterval);
      writer.writeUInt64BE(interval.roundingMod);
    }

    return writer.toBuffer();
  }
}

interface IInterval {
  beginInterval: bigint;
  roundingMod: bigint;
}

interface IIntervalJSON {
  beginInterval: number;
  roundingMod: number;
}

export interface IRoundingIntervalsJSON {
  type?: number; // Optional for rust-dlc compatibility
  intervals: IIntervalJSON[];
}
