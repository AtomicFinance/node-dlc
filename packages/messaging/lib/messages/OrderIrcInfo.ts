import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import assert from 'assert';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class OrderIrcInfo {
  public static deserialize(reader: Buffer | BufferReader): OrderIrcInfo {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const tempReader = new BufferReader(reader.peakBytes());

    const type = Number(tempReader.readUInt16BE());

    switch (type) {
      case MessageType.OrderIrcInfoV0:
        return OrderIrcInfoV0.deserialize(reader);
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
   * @param reader
   */
  public static deserialize(reader: Buffer | BufferReader): OrderIrcInfoV0 {
    const instance = new OrderIrcInfoV0();
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const type = Number(reader.readBigSize());
    assert(type === this.type, `Expected OrderIrcInfoV0, got type ${type}`);

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

  public nick: string;

  public pubKey: Buffer;

  /**
   * Converts order_metadata_v0 to JSON
   */
  public toJSON(): IOrderIrcInfoJSON {
    return {
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
    writer.writeBigSize(this.nick.length);
    writer.writeBytes(Buffer.from(this.nick));
    writer.writeBytes(this.pubKey);

    return writer.toBuffer();
  }
}

export interface IOrderIrcInfoJSON {
  nick: string;
  pubKey: string;
}
