import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../../MessageType';
import { getTlv } from '../../serialize/getTlv';
import { IDlcMessage } from '../DlcMessage';
import { OracleAnnouncementV0Pre167 } from './OracleAnnouncement';
import { OracleAttestationV0Pre167 } from './OracleAttestation';

/**
 * OracleEventContainer contains information about the oracles to be used in
 * executing a DLC.
 */
export class OracleEventContainerV0Pre167 implements IDlcMessage {
  public static type = MessageType.OracleEventContainerV0;

  /**
   * Deserializes an oracle_info_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleEventContainerV0Pre167 {
    const instance = new OracleEventContainerV0Pre167();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    const oracleNameLength = reader.readBigSize();
    const oracleNameBuf = reader.readBytes(Number(oracleNameLength));
    instance.oracleName = oracleNameBuf.toString();

    const uriLength = reader.readBigSize();
    const uriBuf = reader.readBytes(Number(uriLength));
    instance.uri = uriBuf.toString();

    instance.announcement = OracleAnnouncementV0Pre167.deserialize(getTlv(reader));

    instance.attestation = OracleAttestationV0Pre167.deserialize(getTlv(reader));

    const outcomeLength = reader.readBigSize();
    const outcomeBuf = reader.readBytes(Number(outcomeLength));
    instance.outcome = outcomeBuf.toString();

    return instance;
  }

  /**
   * The type for oracle_info_v0 message. oracle_info_v0 = 42770
   */
  public type = OracleEventContainerV0Pre167.type;

  public length: bigint;

  public oracleName: string;

  public uri: string;

  public announcement: OracleAnnouncementV0Pre167;

  public attestation: OracleAttestationV0Pre167;

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
