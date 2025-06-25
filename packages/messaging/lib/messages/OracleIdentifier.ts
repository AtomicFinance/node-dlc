import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export class OracleIdentifier implements IDlcMessage {
  public static type = MessageType.OracleIdentifier;

  /**
   * Deserializes an oracle_event message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleIdentifier {
    const instance = new OracleIdentifier();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    const oracleNameLength = reader.readBigSize();
    const oracleNameBuf = reader.readBytes(Number(oracleNameLength));
    instance.oracleName = oracleNameBuf.toString();
    instance.oraclePubkey = reader.readBytes(32);

    return instance;
  }

  /**
   * The type for oracle_identifier message. oracle_identifier = 61472
   */
  public type = OracleIdentifier.type;

  public length: bigint;

  public oracleName: string;

  public oraclePubkey: Buffer;

  public validate(): void {
    return;
  }

  /**
   * Converts oracle_event to JSON
   */
  public toJSON(): IOracleIdentifierJSON {
    return {
      type: this.type,
      oracleName: this.oracleName,
      oraclePubkey: this.oraclePubkey.toString('hex'),
    };
  }

  /**
   * Serializes the oracle_event message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.oracleName.length);
    dataWriter.writeBytes(Buffer.from(this.oracleName));

    dataWriter.writeBytes(this.oraclePubkey);

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IOracleIdentifierJSON {
  type: number;
  oracleName: string;
  oraclePubkey: string;
}
