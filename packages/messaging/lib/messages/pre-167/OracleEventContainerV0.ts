import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../../MessageType';
import { getTlv } from '../../serialize/getTlv';
import { IDlcMessage } from '../DlcMessage';
import { OracleAnnouncementV0 } from './OracleAnnouncementV0';
import { OracleAttestationV0 } from './OracleAttestationV0';

/**
 * OracleEventContainer contains information about the oracles to be used in
 * executing a DLC.
 */
export class OracleEventContainerV0 implements IDlcMessage {
  public static type = MessageType.OracleEventContainerV0;

  /**
   * Deserializes an oracle_info_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleEventContainerV0 {
    const instance = new OracleEventContainerV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    const oracleNameLength = reader.readBigSize();
    const oracleNameBuf = reader.readBytes(Number(oracleNameLength));
    instance.oracleName = oracleNameBuf.toString();

    const uriLength = reader.readBigSize();
    const uriBuf = reader.readBytes(Number(uriLength));
    instance.uri = uriBuf.toString();

    instance.announcement = OracleAnnouncementV0.deserialize(getTlv(reader));

    instance.attestation = OracleAttestationV0.deserialize(getTlv(reader));

    const outcomeLength = reader.readBigSize();
    const outcomeBuf = reader.readBytes(Number(outcomeLength));
    instance.outcome = outcomeBuf.toString();

    return instance;
  }

  /**
   * The type for oracle_info_v0 message. oracle_info_v0 = 42770
   */
  public type = OracleEventContainerV0.type;

  public length: bigint;

  public oracleName: string;

  public uri: string;

  public announcement: OracleAnnouncementV0;

  public attestation: OracleAttestationV0;

  public outcome: string;

  public validate(): void {
    this.announcement.validate();
  }

  /**
   * Serializes the oracle_info_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.oracleName.length);
    dataWriter.writeBytes(Buffer.from(this.oracleName));
    dataWriter.writeBigSize(this.uri.length);
    dataWriter.writeBytes(Buffer.from(this.uri));
    dataWriter.writeBytes(this.announcement.serialize());
    dataWriter.writeBytes(this.attestation.serialize());
    dataWriter.writeBigSize(this.outcome.length);
    dataWriter.writeBytes(Buffer.from(this.outcome));

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}
