import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * RoundingIntervals defines rounding intervals for numeric outcome contracts.
 * Updated to match dlcspecs format (no longer uses TLV).
 */
export class RoundingIntervalsV0 implements IDlcMessage {
  public static type = MessageType.RoundingIntervalsV0;

  /**
   * Deserializes a rounding_intervals message
   * @param buf
   */
  public static deserialize(buf: Buffer): RoundingIntervalsV0 {
    const instance = new RoundingIntervalsV0();
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
  public type = RoundingIntervalsV0.type;

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
  public toJSON(): IRoundingIntervalsV0JSON {
    return {
      type: this.type,
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

export interface IRoundingIntervalsV0JSON {
  type: number;
  intervals: IIntervalJSON[];
}
