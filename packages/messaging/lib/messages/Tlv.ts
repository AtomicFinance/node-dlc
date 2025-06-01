import { BufferReader, BufferWriter } from '@node-dlc/bufio';

export class Tlv {
  /**
   * Deserializes an tlv message
   * @param buf
   */
  public static deserialize(buf: Buffer): Tlv {
    const instance = new Tlv();
    const reader = new BufferReader(buf);

    instance.type = Number(reader.readBigSize()); // read type
    instance.length = reader.readBigSize();
    instance.body = reader.readBytes(Number(instance.length));

    return instance;
  }

  public type: number;

  public length: bigint;

  public body: Buffer;

  /**
   * Serializes the tlv message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);
    const dataWriter = new BufferWriter();

    dataWriter.writeBytes(this.body);

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}
