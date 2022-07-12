import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { IOrderOfferJSON, OrderOffer } from './OrderOffer';

/**
 * OrderNegotiationFields V1 contains preferences of the acceptor of a order
 * offer which are taken into account during DLC construction.
 */
export class OrderNegotiationFields implements IDlcMessage {
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
   * Converts order_negotiation_fields_v1 to JSON
   */
  public toJSON(): IOrderNegotiationFieldsV1JSON {
    return {
      type: this.type,
      orderOffer: this.orderOffer.toJSON(),
    };
  }

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

export interface IOrderNegotiationFieldsV0JSON {
  type: number;
}

export interface IOrderNegotiationFieldsV1JSON {
  type: number;
  orderOffer: IOrderOfferJSON;
}
