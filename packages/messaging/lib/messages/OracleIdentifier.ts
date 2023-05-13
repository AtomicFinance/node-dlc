import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export class OracleIdentifierV0 implements IDlcMessage {
  public static type = MessageType.OracleIdentifierV0;

  /**
   * Deserializes an oracle_event message
   * @param reader
   */
  public static deserialize(reader: Buffer | BufferReader): OracleIdentifierV0 {
    const instance = new OracleIdentifierV0();
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    reader.readBigSize(); // read type

    const oracleNameLength = reader.readBigSize();
    const oracleNameBuf = reader.readBytes(Number(oracleNameLength));
    instance.oracleName = oracleNameBuf.toString();
    instance.oraclePubkey = reader.readBytes(32);

    return instance;
  }

  /**
   * The type for oracle_identifier message. oracle_identifier = 61472
   */
  public type = OracleIdentifierV0.type;

  public oracleName: string;

  public oraclePubkey: Buffer;

  public validate(): void {
    return;
  }

  /**
   * Converts oracle_event to JSON
   */
  public toJSON(): IOracleIdentifierV0JSON {
    return {
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
    writer.writeBigSize(this.oracleName.length);
    writer.writeBytes(Buffer.from(this.oracleName));
    writer.writeBytes(this.oraclePubkey);

    return writer.toBuffer();
  }
}

export interface IOracleIdentifierV0JSON {
  oracleName: string;
  oraclePubkey: string;
}
