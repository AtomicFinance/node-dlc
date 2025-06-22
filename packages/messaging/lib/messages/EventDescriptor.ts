import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class EventDescriptor {
  public static deserialize(
    buf: Buffer,
  ): EnumEventDescriptor | DigitDecompositionEventDescriptorV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.EnumEventDescriptorV0:
        return EnumEventDescriptor.deserialize(buf);
      case MessageType.DigitDecompositionEventDescriptorV0:
        return DigitDecompositionEventDescriptorV0.deserialize(buf);
      default:
        throw new Error(
          `Payout function TLV type must be EnumEventDescriptorV0 or DigitDecompositionEventDescriptorV0`,
        );
    }
  }

  /**
   * Creates an EventDescriptor from JSON data
   * @param json JSON object representing event descriptor
   */
  public static fromJSON(json: any): EventDescriptor {
    if (!json) {
      throw new Error('eventDescriptor is required');
    }

    // Check if it's an enum event or digit decomposition event
    if (json.enumEvent || json.enum_event) {
      return EnumEventDescriptor.fromJSON(json.enumEvent || json.enum_event);
    } else if (json.digitDecompositionEvent || json.digit_decomposition_event) {
      return DigitDecompositionEventDescriptorV0.fromJSON(
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
    | IDigitDecompositionEventDescriptorV0JSON;

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
    const numOutcomes = reader.readUInt16BE(); // num_outcomes

    for (let i = 0; i < numOutcomes; i++) {
      const outcomeLen = reader.readBigSize();
      const outcome = reader.readBytes(Number(outcomeLen)).toString();

      instance.outcomes.push(outcome);
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
 * DigitDecompositionEventDescriptorV0 V0 is a simple enumeration of outcomes
 */
export class DigitDecompositionEventDescriptorV0
  extends EventDescriptor
  implements IDlcMessage {
  public static type = MessageType.DigitDecompositionEventDescriptorV0;

  /**
   * Creates a DigitDecompositionEventDescriptorV0 from JSON data
   * @param json JSON object representing digit decomposition event descriptor
   */
  public static fromJSON(json: any): DigitDecompositionEventDescriptorV0 {
    const instance = new DigitDecompositionEventDescriptorV0();
    instance.base = json.base || 10;
    instance.isSigned = json.isSigned || json.is_signed || false;
    instance.unit = json.unit || '';
    instance.precision = json.precision || 0;
    instance.nbDigits = json.nbDigits || json.nb_digits || 0;
    return instance;
  }

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
   * Converts digit_decomposition_event_descriptor_v0 to JSON (canonical rust-dlc format)
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
    } as any;
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

export interface IEnumEventDescriptorJSON {
  enumEvent: {
    outcomes: string[];
  };
}

export interface IDigitDecompositionEventDescriptorV0JSON {
  type: number;
  base: number;
  isSigned: boolean;
  unit: string;
  precision: number;
  nbDigits: number;
}

// Legacy interface
export type IEnumEventDescriptorV0JSON = IEnumEventDescriptorJSON;
