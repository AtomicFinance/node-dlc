import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class EventDescriptor {
  public static deserialize(
    buf: Buffer,
  ): EnumEventDescriptorV0 | DigitDecompositionEventDescriptorV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.EnumEventDescriptorV0:
        return EnumEventDescriptorV0.deserialize(buf);
      case MessageType.DigitDecompositionEventDescriptorV0:
        return DigitDecompositionEventDescriptorV0.deserialize(buf);
      default:
        throw new Error(
          `Payout function TLV type must be EnumEventDescriptorV0 or DigitDecompositionEventDescriptorV0`,
        );
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract toJSON():
    | IEnumEventDescriptorV0JSON
    | IDigitDecompositionEventDescriptorV0JSON;

  public abstract serialize(): Buffer;
}

/**
 * EnumEventDescriptor V0 is a simple enumeration of outcomes
 */
export class EnumEventDescriptorV0
  extends EventDescriptor
  implements IDlcMessage {
  public static type = MessageType.EnumEventDescriptorV0;

  /**
   * Deserializes an enum_event_descriptor_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): EnumEventDescriptorV0 {
    const instance = new EnumEventDescriptorV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize(); // need to fix this
    reader.readUInt16BE(); // num_outcomes

    while (!reader.eof) {
      const outcomeLen = reader.readBigSize();
      const outcomeBuf = reader.readBytes(Number(outcomeLen));
      instance.outcomes.push(outcomeBuf.toString());
    }

    return instance;
  }

  /**
   * The type for enum_event_descriptor_v0 message. enum_event_descriptor_v0 = 55302
   */
  public type = EnumEventDescriptorV0.type;

  public length: bigint;

  public outcomes: string[] = [];

  /**
   * Converts enum_event_descriptor_v0 to JSON
   */
  public toJSON(): IEnumEventDescriptorV0JSON {
    return {
      enumEvent: {
        outcomes: this.outcomes,
      },
    };
  }

  /**
   * Serializes the enum_event_descriptor_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.outcomes.length);

    for (const outcome of this.outcomes) {
      dataWriter.writeBigSize(outcome.length);
      dataWriter.writeBytes(Buffer.from(outcome));
    }

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

/**
 * DigitDecompositionEventDescriptorV0 V0 is a simple enumeration of outcomes
 */
export class DigitDecompositionEventDescriptorV0
  extends EventDescriptor
  implements IDlcMessage {
  public static type = MessageType.DigitDecompositionEventDescriptorV0;

  /**
   * Deserializes an digit_decomposition_event_descriptor_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): DigitDecompositionEventDescriptorV0 {
    const instance = new DigitDecompositionEventDescriptorV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize(); // need to fix this

    /**
     * NOTE: BASE IS INCORRECT FORMAT FOR DLC SPEC (SHOULD BE BIGSIZE)
     * Will be fixed in oracle_announcement_v1
     * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Oracle.md#version-0-digit_decomposition_event_descriptor
     */
    instance.base = reader.readUInt16BE();
    instance.isSigned = reader.readUInt8() === 1;
    const unitLen = reader.readBigSize();
    const unitBuf = reader.readBytes(Number(unitLen));
    instance.unit = unitBuf.toString();
    instance.precision = reader.readUInt32BE();
    instance.nbDigits = reader.readUInt16BE();

    return instance;
  }

  /**
   * The type for digit_decomposition_event_descriptor_v0 message. digit_decomposition_event_descriptor_v0 = 55302
   */
  public type = DigitDecompositionEventDescriptorV0.type;

  public length: bigint;

  public base: number; // Switch to bigint in oracle_announcement_v1

  public isSigned: boolean;

  public unit: string;

  public precision: number;

  public nbDigits: number;

  /**
   * Validates correctness of all fields in the message
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Oracle.md
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    if (this.base <= 0) {
      throw new Error('base must be greater than 0');
    }

    // TODO: support isSigned according to specifications
    if (this.isSigned) {
      throw new Error('node-dlc does not support isSigned');
    }
  }

  /**
   * Converts digit_decomposition_event_descriptor_v0 to JSON
   */
  public toJSON(): IDigitDecompositionEventDescriptorV0JSON {
    return {
      digitDecompositionEvent: {
        base: this.base,
        isSigned: this.isSigned,
        unit: this.unit,
        precision: this.precision,
        nbDigits: this.nbDigits,
      },
    };
  }

  /**
   * Serializes the digit_decomposition_event_descriptor_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.base); // Switch to BigSize in oracle_announcement_v1
    dataWriter.writeUInt8(this.isSigned ? 1 : 0);
    dataWriter.writeBigSize(this.unit.length);
    dataWriter.writeBytes(Buffer.from(this.unit));
    dataWriter.writeUInt32BE(this.precision);
    dataWriter.writeUInt16BE(this.nbDigits);

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IEnumEventDescriptorV0JSON {
  enumEvent: {
    outcomes: string[];
  };
}

export interface IDigitDecompositionEventDescriptorV0JSON {
  digitDecompositionEvent: {
    base: number;
    isSigned: boolean;
    unit: string;
    precision: number;
    nbDigits: number;
  };
}
