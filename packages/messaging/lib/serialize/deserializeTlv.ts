import { BufferReader } from '@node-dlc/bufio';

export function deserializeTlv(reader: BufferReader): ITlv {
  const type = reader.readBigSize();
  const length = reader.readBigSize();
  const body = reader.readBytes(Number(length));

  return { type, length, body };
}

interface ITlv {
  type: bigint;
  length: bigint;
  body: Buffer;
}
