import { BufferReader, BufferWriter } from '@node-dlc/bufio';

// TODO: add unit tests
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

export function skipTlv(reader: BufferReader): void {
  reader.readBigSize();
  const length = reader.readBigSize();
  reader.readBytes(Number(length));
}
