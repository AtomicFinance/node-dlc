import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * RoundingIntervals V0
 */
export class RoundingIntervalsV0 implements IDlcMessage {
  public static type = MessageType.RoundingIntervalsV0;

  /**
   * Deserializes an rounding_intervals_v0 tlv
   * @param buf
   */
  public static deserialize(buf: Buffer): RoundingIntervalsV0 {
    const instance = new RoundingIntervalsV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    reader.readUInt16BE(); // num_rounding_intervals

    while (!reader.eof) {
      const beginInterval = reader.readBigSize();
      const roundingMod = reader.readBigSize();

      instance.intervals.push({ beginInterval, roundingMod });
    }

    return instance;
  }

  /**
   * The type for rounding_intervals_v0 tlv. rounding_intervals_v0 = 42788
   */
  public type = RoundingIntervalsV0.type;

  public length: bigint;

  public intervals: IInterval[] = [];

  /**
   * Converts rounding_intervals_v0 to JSON
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
   * Serializes the rounding_intervals_v0 tlv into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.intervals.length);

    for (const interval of this.intervals) {
      dataWriter.writeBigSize(interval.beginInterval);
      dataWriter.writeBigSize(interval.roundingMod);
    }

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

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
