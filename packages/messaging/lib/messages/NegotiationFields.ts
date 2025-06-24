import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { RoundingIntervals } from './RoundingIntervals';
import { IRoundingIntervalsJSON } from './RoundingIntervals';

/**
 * Negotiation fields for DLC contract negotiation.
 * Follows the Rust enum pattern with Single and Disjoint variants.
 */
export abstract class NegotiationFields {
  public static deserialize(buf: Buffer): NegotiationFields {
    const reader = new BufferReader(buf);
    const discriminator = Number(reader.readBigSize());

    switch (discriminator) {
      case 0:
        return SingleNegotiationFields.deserialize(buf);
      case 1:
        return DisjointNegotiationFields.deserialize(buf);
      default:
        throw new Error(
          `Invalid NegotiationFields discriminator: ${discriminator}. Must be 0 (Single) or 1 (Disjoint)`,
        );
    }
  }

  /**
   * Creates a NegotiationFields from JSON data
   * @param json JSON object representing negotiation fields
   */
  public static fromJSON(json: any): NegotiationFields {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON input for NegotiationFields');
    }

    const variant = json.variant;

    switch (variant) {
      case 'Single':
        return SingleNegotiationFields.fromJSON(json);
      case 'Disjoint':
        return DisjointNegotiationFields.fromJSON(json);
      default:
        throw new Error(
          `Unknown negotiation fields variant: ${variant}. Must be 'Single' or 'Disjoint'`,
        );
    }
  }

  public abstract variant: 'Single' | 'Disjoint';
  public abstract discriminator: number;
  public abstract serialize(): Buffer;
  public abstract toJSON(): INegotiationFieldsJSON;
}

/**
 * Negotiation fields for contract based on a single event.
 */
export class SingleNegotiationFields extends NegotiationFields {
  /**
   * Creates a SingleNegotiationFields from JSON data
   * @param json JSON object representing single negotiation fields
   */
  public static fromJSON(json: any): SingleNegotiationFields {
    const instance = new SingleNegotiationFields();

    if (json.variant !== 'Single') {
      throw new Error(
        `Invalid variant for SingleNegotiationFields: expected 'Single', got ${json.variant}`,
      );
    }

    if (!json.roundingIntervals) {
      throw new Error(
        'SingleNegotiationFields requires roundingIntervals field',
      );
    }

    instance.roundingIntervals = RoundingIntervals.fromJSON(
      json.roundingIntervals,
    );

    return instance;
  }

  /**
   * Deserializes single negotiation fields
   * @param buf
   */
  public static deserialize(buf: Buffer): SingleNegotiationFields {
    const instance = new SingleNegotiationFields();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read discriminator (0)

    // Read remaining bytes as raw RoundingIntervals data
    const remainingBytes = reader.readBytes();
    instance.roundingIntervals = RoundingIntervals.deserialize(remainingBytes);

    return instance;
  }

  public variant: 'Single' = 'Single';
  public discriminator = 0;
  public roundingIntervals: RoundingIntervals;

  /**
   * Converts single negotiation fields to JSON
   */
  public toJSON(): ISingleNegotiationFieldsJSON {
    return {
      variant: this.variant,
      roundingIntervals: this.roundingIntervals.toJSON(),
    };
  }

  /**
   * Serializes the single negotiation fields into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.discriminator);
    writer.writeBytes(this.roundingIntervals.serialize());

    return writer.toBuffer();
  }
}

/**
 * Negotiation fields for contract based on multiple events.
 */
export class DisjointNegotiationFields extends NegotiationFields {
  /**
   * Creates a DisjointNegotiationFields from JSON data
   * @param json JSON object representing disjoint negotiation fields
   */
  public static fromJSON(json: any): DisjointNegotiationFields {
    const instance = new DisjointNegotiationFields();

    if (json.variant !== 'Disjoint') {
      throw new Error(
        `Invalid variant for DisjointNegotiationFields: expected 'Disjoint', got ${json.variant}`,
      );
    }

    if (!json.negotiationFields || !Array.isArray(json.negotiationFields)) {
      throw new Error(
        'DisjointNegotiationFields requires negotiationFields array',
      );
    }

    instance.negotiationFields = json.negotiationFields.map((fieldJson: any) =>
      NegotiationFields.fromJSON(fieldJson),
    );

    return instance;
  }

  /**
   * Deserializes disjoint negotiation fields
   * @param buf
   */
  public static deserialize(buf: Buffer): DisjointNegotiationFields {
    const instance = new DisjointNegotiationFields();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read discriminator (1)
    const numFields = Number(reader.readBigSize());

    for (let i = 0; i < numFields; i++) {
      // For simplicity, let's read the nested field by looking ahead
      // to determine its length based on its discriminator
      const startPos = reader.position;
      const discriminator = Number(reader.readBigSize());

      if (discriminator === 0) {
        // Single field: discriminator + RoundingIntervals data
        // RoundingIntervals has its own length, so we need to parse it
        const roundingIntervals = RoundingIntervals.deserialize(
          reader.readBytes(),
        );

        // Reset and read the complete field
        reader.position = startPos;
        const fieldLength = 1 + roundingIntervals.serialize().length; // discriminator + data length
        const fieldData = reader.readBytes(fieldLength);

        instance.negotiationFields.push(
          NegotiationFields.deserialize(fieldData),
        );
      } else if (discriminator === 1) {
        throw new Error('Nested disjoint fields not yet supported');
      } else {
        throw new Error(`Unknown discriminator: ${discriminator}`);
      }
    }

    return instance;
  }

  public variant: 'Disjoint' = 'Disjoint';
  public discriminator = 1;
  public negotiationFields: NegotiationFields[] = [];

  /**
   * Converts disjoint negotiation fields to JSON
   */
  public toJSON(): IDisjointNegotiationFieldsJSON {
    return {
      variant: this.variant,
      negotiationFields: this.negotiationFields.map((field) => field.toJSON()),
    };
  }

  /**
   * Serializes the disjoint negotiation fields into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.discriminator);
    writer.writeBigSize(this.negotiationFields.length);

    for (const negotiationField of this.negotiationFields) {
      writer.writeBytes(negotiationField.serialize());
    }

    return writer.toBuffer();
  }
}

export type INegotiationFieldsJSON =
  | ISingleNegotiationFieldsJSON
  | IDisjointNegotiationFieldsJSON;

export interface ISingleNegotiationFieldsJSON {
  variant: 'Single';
  roundingIntervals: IRoundingIntervalsJSON;
}

export interface IDisjointNegotiationFieldsJSON {
  variant: 'Disjoint';
  negotiationFields: INegotiationFieldsJSON[];
}

// Legacy exports for backward compatibility - map to new structure
export const NegotiationFieldsV0 = SingleNegotiationFields; // V0 was empty, now maps to Single
export const NegotiationFieldsV1 = SingleNegotiationFields; // V1 had rounding intervals
export const NegotiationFieldsV2 = DisjointNegotiationFields; // V2 had list of fields

export type INegotiationFieldsV0JSON = ISingleNegotiationFieldsJSON;
export type INegotiationFieldsV1JSON = ISingleNegotiationFieldsJSON;
export type INegotiationFieldsV2JSON = IDisjointNegotiationFieldsJSON;
