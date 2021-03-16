import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * RoundingIntervals V0
 */
export class RoundingIntervalsV0 implements IDlcMessage {
  public static type = MessageType.RoundingIntervalsV0;

  /**
   * Deserializes an enum_event_descriptor_v0 message
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
   * The type for enum_event_descriptor_v0 message. enum_event_descriptor_v0 = 55302
   */
  public type = RoundingIntervalsV0.type;

  public length: bigint;

  public intervals: IInterval[] = [];

  /**
   * Serializes the enum_event_descriptor_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);
    writer.writeBigSize(this.length);
    writer.writeUInt16BE(this.intervals.length);

    for (const interval of this.intervals) {
      writer.writeBigSize(interval.beginInterval);
      writer.writeBigSize(interval.roundingMod);
    }

    return writer.toBuffer();
  }
}

interface IInterval {
  beginInterval: bigint;
  roundingMod: bigint;
}
