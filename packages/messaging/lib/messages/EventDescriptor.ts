import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class EventDescriptor {
  public static deserialize(
    buf: Buffer,
  ): EnumEventDescriptor | DigitDecompositionEventDescriptor {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.EnumEventDescriptor:
        return EnumEventDescriptor.deserialize(buf);
      case MessageType.DigitDecompositionEventDescriptor:
        return DigitDecompositionEventDescriptor.deserialize(buf);
      default:
        throw new Error(
          `Payout function TLV type must be EnumEventDescriptorV0 or DigitDecompositionEventDescriptor`,
        );
    }
  }

  /**
   * Creates an EventDescriptor from JSON data
   * @param json JSON object representing event descriptor
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): EventDescriptor {
    if (!json) {
      throw new Error('eventDescriptor is required');
    }

    // Check if it's an enum event or digit decomposition event
    if (json.enumEvent || json.enum_event) {
      return EnumEventDescriptor.fromJSON(json.enumEvent || json.enum_event);
    } else if (json.digitDecompositionEvent || json.digit_decomposition_event) {
      return DigitDecompositionEventDescriptor.fromJSON(
        json.digitDecompositionEvent || json.digit_decomposition_event,
      );
    } else {
      throw new Error(
        'eventDescriptor must have either enumEvent or digitDecompositionEvent',
      );
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract toJSON():
    | IEnumEventDescriptorJSON
    | IDigitDecompositionEventDescriptorJSON;

  public abstract serialize(): Buffer;
}

/**
 * EnumEventDescriptor message contains the event outcomes for enumerated events.
 * Simplified class name (removed V0 suffix).
 */
export class EnumEventDescriptor
  extends EventDescriptor
  implements IDlcMessage {
  public static type = MessageType.EnumEventDescriptorV0;

  /**
   * Creates an EnumEventDescriptor from JSON data
   * @param json JSON object representing an enum event descriptor
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): EnumEventDescriptor {
    const instance = new EnumEventDescriptor();
    instance.outcomes = json.outcomes || [];
    return instance;
  }

  /**
   * Deserializes an enum_event_descriptor_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): EnumEventDescriptor {
    const instance = new EnumEventDescriptor();
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
  public type = EnumEventDescriptor.type;

  public length = BigInt(0); // Required by EventDescriptor parent class

  public outcomes: string[] = [];

  /**
   * Converts enum_event_descriptor to JSON
   */
  public toJSON(): IEnumEventDescriptorJSON {
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

// Legacy support - keep V0 alias for backward compatibility
export const EnumEventDescriptorV0 = EnumEventDescriptor;
export type EnumEventDescriptorV0 = EnumEventDescriptor;

/**
 * DigitDecompositionEventDescriptor is a simple enumeration of outcomes.
 * Simplified class name (removed V0 suffix).
 */
export class DigitDecompositionEventDescriptor
  extends EventDescriptor
  implements IDlcMessage {
  public static type = MessageType.DigitDecompositionEventDescriptor;

  /**
   * Creates a DigitDecompositionEventDescriptor from JSON data
   * @param json JSON object representing digit decomposition event descriptor
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): DigitDecompositionEventDescriptor {
    const instance = new DigitDecompositionEventDescriptor();
    instance.base = json.base || 10;
    instance.isSigned = json.isSigned || json.is_signed || false;
    instance.unit = json.unit || '';
    instance.precision = json.precision || 0;
    instance.nbDigits = json.nbDigits || json.nb_digits || 0;
    return instance;
  }

  /**
   * Deserializes an digit_decomposition_event_descriptor message
   * @param buf
   */
  public static deserialize(buf: Buffer): DigitDecompositionEventDescriptor {
    const instance = new DigitDecompositionEventDescriptor();
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
   * The type for digit_decomposition_event_descriptor message. digit_decomposition_event_descriptor = 55306
   */
  public type = DigitDecompositionEventDescriptor.type;

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
   * Converts digit_decomposition_event_descriptor to JSON (canonical rust-dlc format)
   */
  public toJSON(): IDigitDecompositionEventDescriptorJSON {
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
   * Serializes the digit_decomposition_event_descriptor message into a Buffer
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

// Legacy support - keep V0 alias for backward compatibility
export const DigitDecompositionEventDescriptorV0 = DigitDecompositionEventDescriptor;
export type DigitDecompositionEventDescriptorV0 = DigitDecompositionEventDescriptor;

export interface IEnumEventDescriptorJSON {
  enumEvent: {
    outcomes: string[];
  };
}

// Rust-dlc enum variant format for DigitDecompositionEventDescriptor
export interface IDigitDecompositionEventDescriptorJSON {
  digitDecompositionEvent: {
    base: number;
    isSigned: boolean;
    unit: string;
    precision: number;
    nbDigits: number;
  };
}

// Legacy interface
export type IEnumEventDescriptorV0JSON = IEnumEventDescriptorJSON;

// Legacy interface
export type IDigitDecompositionEventDescriptorV0JSON = IDigitDecompositionEventDescriptorJSON;
