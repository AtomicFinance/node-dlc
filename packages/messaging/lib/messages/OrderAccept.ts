import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import {
  IOrderNegotiationFieldsV0JSON,
  IOrderNegotiationFieldsV1JSON,
  OrderNegotiationFields,
} from './OrderNegotiationFields';

/**
 * OrderAccept contains information about a node and indicates its
 * acceptance of the new order offer. This is the second step towards
 * order negotiation.
 */
export class OrderAccept implements IDlcMessage {
  public static type = MessageType.OrderAccept;

  /**
   * Creates an OrderAccept from JSON data
   * @param json JSON object representing an order accept
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): OrderAccept {
    const instance = new OrderAccept();

    instance.tempOrderId = Buffer.from(
      json.tempOrderId || json.temp_order_id,
      'hex',
    );

    // Handle OrderNegotiationFields - optional field
    if (json.negotiationFields || json.negotiation_fields) {
      instance.negotiationFields =
        json.negotiationFields || json.negotiation_fields;
    }

    return instance;
  }

  /**
   * Deserializes an order_accept message
   * @param buf
   */
  public static deserialize(buf: Buffer): OrderAccept {
    const instance = new OrderAccept();
    const reader = new BufferReader(buf);

    const type = reader.readUInt16BE(); // read type

    // Validate type matches expected OrderAccept type
    if (type !== MessageType.OrderAccept) {
      throw new Error(
        `Invalid message type. Expected ${MessageType.OrderAccept}, got ${type}`,
      );
    }

    instance.tempOrderId = reader.readBytes(32);

    // Check if negotiation_fields is present
    const hasNegotiationFields = reader.readUInt8();
    if (hasNegotiationFields === 0x01) {
      // Read the remaining bytes as negotiationFields (not TLV format)
      const remainingLength = buf.length - reader.position;
      const remainingBytes = reader.readBytes(remainingLength);
      instance.negotiationFields = OrderNegotiationFields.deserialize(
        remainingBytes,
      );
    }

    return instance;
  }

  /**
   * The type for order_accept message. order_accept = 62772
   */
  public type = OrderAccept.type;

  public tempOrderId: Buffer;

  public negotiationFields?: OrderNegotiationFields;

  /**
   * Converts order_accept to JSON
   */
  public toJSON(): IOrderAcceptJSON {
    return {
      type: this.type,
      tempOrderId: this.tempOrderId.toString('hex'),
      negotiationFields: this.negotiationFields?.toJSON(),
    };
  }

  /**
   * Serializes the order_accept message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBytes(this.tempOrderId);

    // negotiation_fields is optional
    if (this.negotiationFields) {
      writer.writeUInt8(0x01); // present
      writer.writeBytes(this.negotiationFields.serialize());
    } else {
      writer.writeUInt8(0x00); // absent
    }

    return writer.toBuffer();
  }
}

export interface IOrderAcceptJSON {
  type: number;
  tempOrderId: string;
  negotiationFields?: // Now optional
  IOrderNegotiationFieldsV0JSON | IOrderNegotiationFieldsV1JSON;
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
      const accept = OrderAccept.deserialize(acceptBuf);
      container.addAccept(accept);
    }
    return container;
  }
}
