import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class PayoutFunction {
  public static deserialize(buf: Buffer): PayoutFunctionV0 | PayoutFunctionV1 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.ContractDescriptorV0:
        return PayoutFunctionV0.deserialize(buf);
      case MessageType.ContractDescriptorV1:
        return PayoutFunctionV1.deserialize(buf);
      default:
        throw new Error(
          `Payout function TLV type must be ContractDescriptorV0 or ContractDescriptorV1`,
        );
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract serialize(): Buffer;
}

/**
 * PayoutFunction V0
 */
export class PayoutFunctionV0 extends PayoutFunction implements IDlcMessage {
  public static type = MessageType.PayoutFunctionV0;

  /**
   * Deserializes an payout_function_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): PayoutFunctionV0 {
    const instance = new PayoutFunctionV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize(); // need to fix this
    reader.readUInt16BE(); // num_pts

    while (!reader.eof) {
      const isEndpoint = reader.readUInt8() === 1;
      const eventOutcome = reader.readBigSize();
      const outcomePayout = reader.readBigSize();
      const extraPrecision = reader.readUInt16BE();

      instance.points.push({
        isEndpoint,
        eventOutcome,
        outcomePayout,
        extraPrecision,
      });
    }

    return instance;
  }

  /**
   * The type for payout_function_v0 message. payout_function_v0 = 42790
   */
  public type = PayoutFunctionV0.type;

  public length: bigint;

  public points: IPoint[];

  /**
   * Serializes the payout_function_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);
    writer.writeBigSize(this.length);
    writer.writeUInt16BE(this.points.length);

    for (const point of this.points) {
      writer.writeUInt8(point.isEndpoint ? 1 : 0);
      writer.writeBigSize(point.eventOutcome);
      writer.writeBigSize(point.outcomePayout);
      writer.writeUInt16BE(point.extraPrecision);
    }

    return writer.toBuffer();
  }
}

/**
 * PayoutFunction V1
 */
export class PayoutFunctionV1 extends PayoutFunction implements IDlcMessage {
  public static type = MessageType.PayoutFunctionV1;

  /**
   * Deserializes an payout_function_v1 message
   * @param buf
   */
  public static deserialize(buf: Buffer): PayoutFunctionV1 {
    const instance = new PayoutFunctionV1();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize(); // need to fix this
    instance.usePositivePiece = reader.readUInt8() === 1;
    instance.translateOutcomeSign = reader.readUInt8() === 1;
    instance.translateOutcome = reader.readBigSize();
    instance.translateOutcomeExtraPrecision = reader.readUInt16BE();
    instance.translatePayoutSign = reader.readUInt8() === 1;
    instance.translatePayout = reader.readBigSize();
    instance.translatePayoutExtraPrecision = reader.readUInt16BE();
    instance.aSign = reader.readUInt8() === 1;
    instance.a = reader.readBigSize();
    instance.aExtraPrecision = reader.readUInt16BE();
    instance.bSign = reader.readUInt8() === 1;
    instance.b = reader.readBigSize();
    instance.bExtraPrecision = reader.readUInt16BE();
    instance.cSign = reader.readUInt8() === 1;
    instance.c = reader.readBigSize();
    instance.cExtraPrecision = reader.readUInt16BE();
    instance.dSign = reader.readUInt8() === 1;
    instance.d = reader.readBigSize();
    instance.dExtraPrecision = reader.readUInt16BE();

    return instance;
  }

  /**
   * The type for payout_function_v1 message. payout_function_v1 = 42792
   */
  public type = PayoutFunctionV1.type;

  public length: bigint;

  public usePositivePiece: boolean;

  public translateOutcomeSign: boolean;

  public translateOutcome: bigint;

  public translateOutcomeExtraPrecision: number;

  public translatePayoutSign: boolean;

  public translatePayout: bigint;

  public translatePayoutExtraPrecision: number;

  public aSign: boolean;

  public a: bigint;

  public aExtraPrecision: number;

  public bSign: boolean;

  public b: bigint;

  public bExtraPrecision: number;

  public cSign: boolean;

  public c: bigint;

  public cExtraPrecision: number;

  public dSign: boolean;

  public d: bigint;

  public dExtraPrecision: number;

  /**
   * Serializes the enum_event_descriptor_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);
    writer.writeBigSize(this.length);
    writer.writeUInt8(this.usePositivePiece ? 1 : 0);
    writer.writeUInt8(this.translateOutcomeSign ? 1 : 0);
    writer.writeBigSize(this.translateOutcome);
    writer.writeUInt16BE(this.translateOutcomeExtraPrecision);
    writer.writeUInt8(this.translatePayoutSign ? 1 : 0);
    writer.writeBigSize(this.translatePayout);
    writer.writeUInt16BE(this.translatePayoutExtraPrecision);
    writer.writeUInt8(this.aSign ? 1 : 0);
    writer.writeBigSize(this.a);
    writer.writeUInt16BE(this.aExtraPrecision);
    writer.writeUInt8(this.bSign ? 1 : 0);
    writer.writeBigSize(this.b);
    writer.writeUInt16BE(this.bExtraPrecision);
    writer.writeUInt8(this.cSign ? 1 : 0);
    writer.writeBigSize(this.c);
    writer.writeUInt16BE(this.cExtraPrecision);
    writer.writeUInt8(this.dSign ? 1 : 0);
    writer.writeBigSize(this.d);
    writer.writeUInt16BE(this.dExtraPrecision);

    return writer.toBuffer();
  }
}

interface IPoint {
  isEndpoint: boolean;
  eventOutcome: bigint;
  outcomePayout: bigint;
  extraPrecision: number;
}
