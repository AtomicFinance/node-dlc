import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { OrderOffer } from './OrderOffer';

export abstract class OrderNegotiationFields {
  public static deserialize(
    buf: Buffer,
  ): OrderNegotiationFieldsV0 | OrderNegotiationFieldsV1 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.OrderNegotiationFieldsV0:
        return OrderNegotiationFieldsV0.deserialize(buf);
      case MessageType.OrderNegotiationFieldsV1:
        return OrderNegotiationFieldsV1.deserialize(buf);
      default:
        throw new Error(
          `Order Negotiation Fields TLV type must be OrderNegotiationFieldsV0 or OrderNegotiationFieldsV1`,
        );
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract serialize(): Buffer;
}

/**
 * OrderNegotiationFields V0 contains preferences of the accepter of a order
 * offer which are taken into account during DLC construction.
 */
export class OrderNegotiationFieldsV0 implements IDlcMessage {
  public static type = MessageType.OrderNegotiationFieldsV0;

  /**
   * Deserializes an order_negotiation_fields_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OrderNegotiationFieldsV0 {
    const instance = new OrderNegotiationFieldsV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    return instance;
  }

  /**
   * The type for order_negotiation_fields_v0 message. order_negotiation_fields_v0 = 65334
   */
  public type = OrderNegotiationFieldsV0.type;

  public length: bigint;

  /**
   * Serializes the order_negotiation_fields_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);
    writer.writeBigSize(0);

    return writer.toBuffer();
  }
}

/**
 * OrderNegotiationFields V1 contains preferences of the acceptor of a order
 * offer which are taken into account during DLC construction.
 */
export class OrderNegotiationFieldsV1 implements IDlcMessage {
  public static type = MessageType.OrderNegotiationFieldsV1;

  /**
   * Deserializes an order_negotiation_fields_v1 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OrderNegotiationFieldsV1 {
    const instance = new OrderNegotiationFieldsV1();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    const newBuf = reader.readBytes();
    instance.orderOffer = OrderOffer.deserialize(newBuf);

    return instance;
  }

  /**
   * The type for order_negotiation_fields_v1 message. order_negotiation_fields_v1 = 65336
   */
  public type = OrderNegotiationFieldsV1.type;

  public length: bigint;

  public orderOffer: OrderOffer;

  /**
   * Serializes the order_negotiation_fields_v1 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBytes(this.orderOffer.serialize());

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}
