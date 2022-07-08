import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import { IRoundingIntervalsJSON, RoundingIntervals } from './RoundingIntervals';

export enum NegotiationFieldsType {
  Single = 0,
  Disjoint = 1,
}

export abstract class NegotiationFields {
  public static deserialize(
    reader: Buffer | BufferReader,
  ): SingleNegotiationFields | DisjointNegotiationFields {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const tempReader = new BufferReader(reader.peakBytes());
    const type = Number(tempReader.readBigSize());

    switch (type) {
      case NegotiationFieldsType.Single:
        return SingleNegotiationFields.deserialize(reader);
      case NegotiationFieldsType.Disjoint:
        return DisjointNegotiationFields.deserialize(reader);
      default:
        throw new Error(
          `Negotiation fields TLV type must be SingleNegotiationFields or DisjointNegotiationFields`,
        );
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract toJSON(): INegotiationFieldsV1JSON | INegotiationFieldsV2JSON;

  public abstract serialize(): Buffer;
}

/**
 * NegotiationFields V1 contains preferences of the acceptor of a DLC
 * which are taken into account during DLC construction.
 */
export class SingleNegotiationFields
  extends NegotiationFields
  implements IDlcMessage {
  public static type = NegotiationFieldsType.Single;

  /**
   * Deserializes an negotiation_fields_v1 message
   * @param buf
   */
  public static deserialize(
    reader: Buffer | BufferReader,
  ): SingleNegotiationFields {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new SingleNegotiationFields();

    reader.readBigSize(); // read type
    instance.roundingIntervals = RoundingIntervals.deserialize(getTlv(reader));

    return instance;
  }

  /**
   * The type for negotiation_fields_v1 message. negotiation_fields_v1 = 55336
   */
  public type = SingleNegotiationFields.type;

  public length: bigint;

  public roundingIntervals: RoundingIntervals;

  /**
   * Converts negotiation_fields_v1 to JSON
   */
  public toJSON(): INegotiationFieldsV1JSON {
    return {
      type: this.type,
      roundingIntervals: this.roundingIntervals.toJSON(),
    };
  }

  /**
   * Serializes the negotiation_fields_v1 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBytes(this.roundingIntervals.serialize());

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

/**
 * NegotiationFields V2 contains preferences of the acceptor of a DLC
 * which are taken into account during DLC construction.
 */
export class DisjointNegotiationFields
  extends NegotiationFields
  implements IDlcMessage {
  public static type = NegotiationFieldsType.Disjoint;

  /**
   * Deserializes an negotiation_fields_v1 message
   * @param buf
   */
  public static deserialize(
    reader: Buffer | BufferReader,
  ): DisjointNegotiationFields {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new DisjointNegotiationFields();

    reader.readBigSize(); // read type
    const numDisjointEvents = reader.readBigSize(); // num_disjoint_events

    for (let i = 0; i < numDisjointEvents; i++) {
      instance.negotiationFieldsList.push(
        NegotiationFields.deserialize(reader),
      );
    }

    return instance;
  }

  /**
   * The type for negotiation_fields_v2 message. negotiation_fields_v2 = 55346
   */
  public type = DisjointNegotiationFields.type;

  public length: bigint;

  public negotiationFieldsList: NegotiationFields[] = [];

  /**
   * Converts negotiation_fields_v2 to JSON
   */
  public toJSON(): INegotiationFieldsV2JSON {
    return {
      type: this.type,
      negotiationFieldsList: this.negotiationFieldsList.map((field) =>
        field.toJSON(),
      ),
    };
  }

  /**
   * Serializes the negotiation_fields_v2 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.negotiationFieldsList.length);

    for (const negotiationFields of this.negotiationFieldsList) {
      dataWriter.writeBytes(negotiationFields.serialize());
    }

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());
    return writer.toBuffer();
  }
}

// TODO: fix JSON here

export interface INegotiationFieldsV0JSON {
  type: number;
}

export interface INegotiationFieldsV1JSON {
  type: number;
  roundingIntervals: IRoundingIntervalsJSON;
}

export interface INegotiationFieldsV2JSON {
  type: number;
  negotiationFieldsList:
    | INegotiationFieldsV0JSON[]
    | INegotiationFieldsV1JSON[]
    | INegotiationFieldsV2JSON[];
}
