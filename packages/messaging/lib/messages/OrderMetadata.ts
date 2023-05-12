import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class OrderMetadata {
  public static deserialize(buf: Buffer): OrderMetadata {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.OrderMetadataV0:
        return OrderMetadataV0.deserialize(buf);
      default:
        throw new Error(`Order metadata TLV type must be OrderMetadataV0`);
    }
  }

  public abstract type: number;

  public abstract toJSON(): IOrderMetadataJSON;

  public abstract serialize(): Buffer;
}

/**
 * OrderMetadata message contains information about a node and indicates its
 * desire to enter into a new contract. This is the first step toward
 * order negotiation.
 */
export class OrderMetadataV0 extends OrderMetadata implements IDlcMessage {
  public static type = MessageType.OrderMetadataV0;

  /**
   * Deserializes an offer_dlc_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OrderMetadataV0 {
    const instance = new OrderMetadataV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type

    const offerIdLength = reader.readBigSize();
    const offerIdBuf = reader.readBytes(Number(offerIdLength));
    instance.offerId = offerIdBuf.toString();

    if (!reader.eof) {
      instance.createdAt = reader.readUInt32BE();
      instance.goodTill = reader.readUInt32BE();
    }

    return instance;
  }

  /**
   * The type for order_metadata_v0 message. order_metadata_v0 = 62774
   */
  public type = OrderMetadataV0.type;

  /**
   * offerId is a unique identifier for an offer
   * It can be used for updating liquidity for a particular category
   * For example, how much liquidity is remaining for a particular strategy
   * which a market maker is providing liquidity for
   */
  public offerId: string;

  /**
   * Timestamp for order creation
   */
  public createdAt = 0;

  /**
   * Amount of time order is good untill
   */
  public goodTill = 0;

  /**
   * Converts order_metadata_v0 to JSON
   */
  public toJSON(): IOrderMetadataJSON {
    return {
      offerId: this.offerId,
      createdAt: this.createdAt,
      goodTill: this.goodTill,
    };
  }

  /**
   * Serializes the oracle_event message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);
    writer.writeBigSize(this.offerId.length);
    writer.writeBytes(Buffer.from(this.offerId));
    writer.writeUInt32BE(this.createdAt);
    writer.writeUInt32BE(this.goodTill);

    return writer.toBuffer();
  }
}

export interface IOrderMetadataJSON {
  offerId: string;
  createdAt: number;
  goodTill: number;
}
