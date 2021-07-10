import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { crc32c } from '@node-lightning/checksum';

import { MessageType } from '../MessageType';

const MAX_DATA_LEN = 190;

export abstract class IrcMessage {
  public static deserialize(buf: Buffer): IrcMessageV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.IrcMessageV0:
        return IrcMessageV0.deserialize(buf);
      default:
        throw new Error(`Irc message type must be IrcMessageV0`);
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}

/**
 * IrcMessage contains information for Irc message packet.
 */
export class IrcMessageV0 extends IrcMessage {
  public static type = MessageType.IrcMessageV0;

  public static fromBuffer(buf: Buffer, pubkey: Buffer): IrcMessageV0[] {
    const instances: IrcMessageV0[] = [];

    const checksum = crc32c(buf);

    const sequenceLength = Math.ceil(buf.length / MAX_DATA_LEN);

    const reader = new BufferReader(buf);
    const bufLen = buf.length;

    const currentTime = Math.floor(new Date().getTime() / 1000);

    for (let i = 0; i < sequenceLength; i++) {
      const sequenceNumber = i;
      const instance = new IrcMessageV0();

      instance.sequenceLength = BigInt(sequenceLength);
      instance.sequenceNumber = BigInt(sequenceNumber);
      instance.checksum = checksum;
      instance.pubkey = pubkey;
      instance.timestamp = currentTime;
      instance.data = reader.readBytes(
        Math.min(MAX_DATA_LEN, bufLen - reader.position),
      );

      instances.push(instance);
    }

    return instances;
  }

  public static fromString(str: string, pubkey: Buffer): IrcMessageV0[] {
    const buf = Buffer.from(str);

    return IrcMessageV0.fromBuffer(buf, pubkey);
  }

  /**
   * Deserializes an irc message
   * @param buf
   */
  public static deserialize(buf: Buffer): IrcMessageV0 {
    const instance = new IrcMessageV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type

    instance.length = reader.readBigSize();

    instance.sequenceLength = reader.readBigSize();
    instance.sequenceNumber = reader.readBigSize();

    instance.checksum = reader.readUInt32BE();

    instance.signature = reader.readBytes(64);
    instance.pubkey = reader.readBytes(33);
    instance.timestamp = reader.readUInt32BE();

    const dataLen = reader.readUInt16BE();
    instance.data = reader.readBytes(dataLen);

    return instance;
  }

  public type = IrcMessageV0.type;

  public length: bigint;

  public sequenceLength: bigint;

  public sequenceNumber: bigint;

  public checksum: number;

  public signature: Buffer;

  public pubkey: Buffer;

  public timestamp: number;

  public data: Buffer;

  public serializeWithoutSig(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.sequenceLength);
    writer.writeBigSize(this.sequenceNumber);
    writer.writeUInt64BE(this.checksum);
    writer.writeBytes(this.pubkey);
    writer.writeUInt32BE(this.timestamp);
    writer.writeUInt16BE(this.data.length);
    writer.writeBytes(this.data);

    return writer.toBuffer();
  }

  /**
   * Serializes the irc_message_v0
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.sequenceLength);
    dataWriter.writeBigSize(this.sequenceNumber);
    dataWriter.writeUInt32BE(this.checksum);
    dataWriter.writeBytes(this.signature);
    dataWriter.writeBytes(this.pubkey);
    dataWriter.writeUInt32BE(this.timestamp);
    dataWriter.writeUInt16BE(this.data.length);
    dataWriter.writeBytes(this.data);

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export class IrcMessageWithoutSig {
  constructor(
    readonly sequenceLength: bigint,
    readonly sequenceNumber: bigint,
    readonly checksum: number,
    readonly signature: Buffer,
    readonly pubkey: Buffer,
    readonly data: Buffer,
  ) {}
}
