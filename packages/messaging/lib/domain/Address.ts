import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';

export class Address {
  public static type = MessageType.NodeAnnouncementAddress;

  public static deserialize(buf: Buffer) {
    const reader = new BufferReader(buf);
    reader.readBigSize(); // read off type
    reader.readBigSize(); // read size

    const hostLen = reader.readBigSize();
    const hostBuf = reader.readBytes(Number(hostLen));
    const host = hostBuf.toString();
    const port = reader.readUInt16BE();

    const instance = new Address(host, port);

    return instance;
  }

  public type = Address.type;

  /**
   * String notation representation of the host
   */
  public host: string;

  /**
   * Port number
   */
  public port: number;

  /**
   * Base class representing a network address
   */
  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }

  public toString() {
    return `${this.host}:${this.port}`;
  }

  /**
   * Serializes the dlc_transactions_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.host.length);
    dataWriter.writeBytes(Buffer.from(this.host));
    dataWriter.writeUInt16BE(this.port);

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}
