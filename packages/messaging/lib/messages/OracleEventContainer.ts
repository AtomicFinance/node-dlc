import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import { OracleAnnouncement } from './OracleAnnouncement';
import { OracleAttestation } from './OracleAttestation';

/**
 * OracleEventContainer contains information about the oracles to be used in
 * executing a DLC.
 */
export class OracleEventContainer implements IDlcMessage {
  public static type = MessageType.OracleEventContainer;

  /**
   * Deserializes an oracle_info_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleEventContainer {
    const instance = new OracleEventContainer();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    const oracleNameLength = reader.readBigSize();
    const oracleNameBuf = reader.readBytes(Number(oracleNameLength));
    instance.oracleName = oracleNameBuf.toString();

    const uriLength = reader.readBigSize();
    const uriBuf = reader.readBytes(Number(uriLength));
    instance.uri = uriBuf.toString();

    instance.announcement = OracleAnnouncement.deserialize(getTlv(reader));

    instance.attestation = OracleAttestation.deserialize(getTlv(reader));

    const outcomeLength = reader.readBigSize();
    const outcomeBuf = reader.readBytes(Number(outcomeLength));
    instance.outcome = outcomeBuf.toString();

    return instance;
  }

  /**
   * The type for oracle_info_v0 message. oracle_info_v0 = 42770
   */
  public type = OracleEventContainer.type;

  public length: bigint;

  public oracleName: string;

  public uri: string;

  public announcement: OracleAnnouncement;

  public attestation: OracleAttestation;

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
