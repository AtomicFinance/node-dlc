import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import { RoundingIntervals } from './RoundingIntervals';
import { IRoundingIntervalsJSON } from './RoundingIntervals';

export enum NegotiationFieldsType {
  Single = 0,
  Disjoint = 1,
}

export abstract class NegotiationFields {
  public static deserialize(
    buf: Buffer,
  ): NegotiationFieldsV1 | NegotiationFieldsV2 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.NegotiationFieldsV1:
        return NegotiationFieldsV1.deserialize(buf);
      case MessageType.NegotiationFieldsV2:
        return NegotiationFieldsV2.deserialize(buf);
      default:
        throw new Error(
          `Negotiation fields TLV type must be NegotiationFieldsV0, NegotiationFieldsV1 or NegotiationFieldsV2`,
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
  public static deserialize(buf: Buffer): SingleNegotiationFields {
    const instance = new SingleNegotiationFields();
    const reader = new BufferReader(buf);

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
export class NegotiationFieldsV2
  extends NegotiationFields
  implements IDlcMessage {
  public static type = MessageType.NegotiationFieldsV2;

  /**
   * Deserializes an negotiation_fields_v1 message
   * @param buf
   */
  public static deserialize(buf: Buffer): NegotiationFieldsV2 {
    const instance = new NegotiationFieldsV2();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    reader.readBigSize(); // num_disjoint_events

    while (!reader.eof) {
      instance.negotiationFieldsList.push(
        NegotiationFields.deserialize(getTlv(reader)),
      );
    }

    return instance;
  }

  /**
   * The type for negotiation_fields_v2 message. negotiation_fields_v2 = 55346
   */
  public type = NegotiationFieldsV2.type;

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
