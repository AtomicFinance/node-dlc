import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class OrderIrcInfo {
  public static deserialize(buf: Buffer): OrderIrcInfo {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.OrderIrcInfoV0:
        return OrderIrcInfoV0.deserialize(buf);
      default:
        throw new Error(`Order irc info TLV type must be OrderIrcInfoV0`);
    }
  }

  public abstract type: number;

  public abstract toJSON(): IOrderIrcInfoJSON;

  public abstract serialize(): Buffer;
}

/**
 * OrderMetadata message contains information about a node and indicates its
 * desire to enter into a new contract. This is the first step toward
 * order negotiation.
 */
export class OrderIrcInfoV0 extends OrderIrcInfo implements IDlcMessage {
  public static type = MessageType.OrderIrcInfoV0;

  /**
   * Deserializes an offer_dlc_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OrderIrcInfoV0 {
    const instance = new OrderIrcInfoV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    const nickLength = reader.readBigSize();
    const nickBuf = reader.readBytes(Number(nickLength));
    instance.nick = nickBuf.toString();

    instance.pubKey = reader.readBytes(33);

    return instance;
  }

  /**
   * The type for order_metadata_v0 message. order_metadata_v0 = 62774
   */
  public type = OrderIrcInfoV0.type;

  public length: bigint;

  public nick: string;

  public pubKey: Buffer;

  /**
   * Converts order_metadata_v0 to JSON
   */
  public toJSON(): IOrderIrcInfoJSON {
    return {
      type: this.type,
      nick: this.nick,
      pubKey: this.pubKey.toString('hex'),
    };
  }

  /**
   * Serializes the oracle_event message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.nick.length);
    dataWriter.writeBytes(Buffer.from(this.nick));
    dataWriter.writeBytes(this.pubKey);

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IOrderIrcInfoJSON {
  type: number;
  nick: string;
  pubKey: string;
}
