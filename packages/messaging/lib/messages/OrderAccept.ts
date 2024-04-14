import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import {
  IOrderNegotiationFieldsV0JSON,
  IOrderNegotiationFieldsV1JSON,
  OrderNegotiationFields,
} from './OrderNegotiationFields';

export abstract class OrderAccept {
  public static deserialize(buf: Buffer): OrderAccept {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.OrderAcceptV0:
        return OrderAcceptV0.deserialize(buf);
      default:
        throw new Error(`Order accept TLV type must be OrderAcceptV0`);
    }
  }

  public abstract type: number;

  public abstract toJSON(): IOrderAcceptV0JSON;

  public abstract serialize(): Buffer;
}

/**
 * OrderAccept contains information about a node and indicates its
 * acceptance of the new order offer. This is the second step towards
 * order negotiation.
 */
export class OrderAcceptV0 extends OrderAccept implements IDlcMessage {
  public static type = MessageType.OrderAcceptV0;

  /**
   * Deserializes an order_accept_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OrderAcceptV0 {
    const instance = new OrderAcceptV0();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type
    instance.tempOrderId = reader.readBytes(32);
    instance.negotiationFields = OrderNegotiationFields.deserialize(
      getTlv(reader),
    );

    return instance;
  }

  /**
   * The type for order_accept_v0 message. order_accept_v0 = 62772
   */
  public type = OrderAcceptV0.type;

  public tempOrderId: Buffer;

  public negotiationFields: OrderNegotiationFields;

  /**
   * Converts order_negotiation_fields_v0 to JSON
   */
  public toJSON(): IOrderAcceptV0JSON {
    return {
      type: this.type,
      tempOrderId: this.tempOrderId.toString('hex'),
      negotiationFields: this.negotiationFields.toJSON(),
    };
  }

  /**
   * Serializes the order_accept_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBytes(this.tempOrderId);
    writer.writeBytes(this.negotiationFields.serialize());

    return writer.toBuffer();
  }
}

export interface IOrderAcceptV0JSON {
  type: number;
  tempOrderId: string;
  negotiationFields:
    | IOrderNegotiationFieldsV0JSON
    | IOrderNegotiationFieldsV1JSON;
}

export class OrderAcceptContainer {
  private accepts: OrderAccept[] = [];

  /**
   * Adds an OrderAccept to the container.
   * @param accept The OrderAccept to add.
   */
  public addAccept(accept: OrderAccept): void {
    this.accepts.push(accept);
  }

  /**
   * Returns all OrderAccepts in the container.
   * @returns An array of OrderAccept instances.
   */
  public getAccepts(): OrderAccept[] {
    return this.accepts;
  }

  /**
   * Serializes all OrderAccepts in the container to a Buffer.
   * @returns A Buffer containing the serialized OrderAccepts.
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    // Write the number of accepts in the container first.
    writer.writeBigSize(this.accepts.length);
    // Serialize each accept and write it.
    this.accepts.forEach((accept) => {
      const serializedAccept = accept.serialize();
      writer.writeBigSize(serializedAccept.length);
      writer.writeBytes(serializedAccept);
    });
    return writer.toBuffer();
  }

  /**
   * Deserializes a Buffer into an OrderAcceptContainer with OrderAccepts.
   * @param buf The Buffer to deserialize.
   * @returns An OrderAcceptContainer instance.
   */
  public static deserialize(buf: Buffer): OrderAcceptContainer {
    const reader = new BufferReader(buf);
    const container = new OrderAcceptContainer();
    const acceptsCount = reader.readBigSize();
    for (let i = 0; i < acceptsCount; i++) {
      const acceptLength = reader.readBigSize();
      const acceptBuf = reader.readBytes(Number(acceptLength));
      const accept = OrderAccept.deserialize(acceptBuf); // Adjust based on actual implementation.
      container.addAccept(accept);
    }
    return container;
  }
}
