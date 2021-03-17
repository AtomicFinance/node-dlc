import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import { RoundingIntervalsV0 } from './RoundingIntervalsV0';

export abstract class NegotiationFields {
  public static deserialize(
    buf: Buffer,
  ): NegotiationFieldsV0 | NegotiationFieldsV1 | NegotiationFieldsV2 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.NegotiationFieldsV0:
        return NegotiationFieldsV0.deserialize(buf);
      case MessageType.NegotiationFieldsV1:
        return NegotiationFieldsV1.deserialize(buf);
      case MessageType.NegotiationFieldsV2:
        return NegotiationFieldsV2.deserialize(buf);
      default:
        throw new Error(
          `Payout function TLV type must be NegotiationFieldsV0, NegotiationFieldsV1 or NegotiationFieldsV2`,
        );
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract serialize(): Buffer;
}

/**
 * NegotiationFields V0 contains preferences of the accepter of a DLC
 * which are taken into account during DLC construction.
 */
export class NegotiationFieldsV0 implements IDlcMessage {
  public static type = MessageType.NegotiationFieldsV0;

  /**
   * Deserializes an negotiation_fields_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): NegotiationFieldsV0 {
    const instance = new NegotiationFieldsV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    return instance;
  }

  /**
   * The type for negotiation_fields_v0 message. negotiation_fields_v0 = 55334
   */
  public type = NegotiationFieldsV0.type;

  public length: bigint;

  /**
   * Serializes the negotiation_fields_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);
    writer.writeBigSize(0);

    return writer.toBuffer();
  }
}

/**
 * NegotiationFields V1 contains preferences of the acceptor of a DLC
 * which are taken into account during DLC construction.
 */
export class NegotiationFieldsV1 implements IDlcMessage {
  public static type = MessageType.NegotiationFieldsV1;

  /**
   * Deserializes an negotiation_fields_v1 message
   * @param buf
   */
  public static deserialize(buf: Buffer): NegotiationFieldsV1 {
    const instance = new NegotiationFieldsV1();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    instance.roundingIntervals = RoundingIntervalsV0.deserialize(
      getTlv(reader),
    );

    return instance;
  }

  /**
   * The type for negotiation_fields_v1 message. negotiation_fields_v1 = 55336
   */
  public type = NegotiationFieldsV1.type;

  public length: bigint;

  public roundingIntervals: RoundingIntervalsV0;

  /**
   * Serializes the negotiation_fields_v1 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBytes(this.roundingIntervals.serialize());

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

/**
 * NegotiationFields V2 contains preferences of the acceptor of a DLC
 * which are taken into account during DLC construction.
 */
export class NegotiationFieldsV2 implements IDlcMessage {
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
