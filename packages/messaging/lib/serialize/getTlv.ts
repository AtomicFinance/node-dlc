import { BufferReader, BufferWriter } from '@node-lightning/bufio';

export function getTlv(reader: BufferReader): Buffer {
  const type = reader.readBigSize();
  const length = reader.readBigSize();
  const body = reader.readBytes(Number(length));

  const writer = new BufferWriter();
  writer.writeBigSize(type);
  writer.writeBigSize(length);
  writer.writeBytes(body);

  return writer.toBuffer();
}
