import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class DlcInfo {
  public static deserialize(buf: Buffer): DlcInfoV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.DlcInfoV0:
        return DlcInfoV0.deserialize(buf);
      default:
        throw new Error(`DLC IDs message type must be DlcInfoV0`);
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}

/**
 * DlcInfo message contains list of buffers
 */
export class DlcInfoV0 extends DlcInfo implements IDlcMessage {
  public static type = MessageType.DlcInfoV0;

  /**
   * Deserializes an dlc_ids_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcInfoV0 {
    const instance = new DlcInfoV0();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type

    instance.numDlcOffers = reader.readUInt32BE();
    instance.numDlcAccepts = reader.readUInt32BE();
    instance.numDlcSigns = reader.readUInt32BE();
    instance.numDlcCancels = reader.readUInt32BE();
    instance.numDlcCloses = reader.readUInt32BE();
    instance.numDlcTransactions = reader.readUInt32BE();

    return instance;
  }

  /**
   * The type for dlc_info_v0 message
   */
  public type = DlcInfoV0.type;

  public numDlcOffers: number;

  public numDlcAccepts: number;

  public numDlcSigns: number;

  public numDlcCancels: number;

  public numDlcCloses: number;

  public numDlcTransactions: number;

  /**
   * Serializes the dlc_info_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeUInt32BE(this.numDlcOffers);
    writer.writeUInt32BE(this.numDlcAccepts);
    writer.writeUInt32BE(this.numDlcSigns);
    writer.writeUInt32BE(this.numDlcCancels);
    writer.writeUInt32BE(this.numDlcCloses);
    writer.writeUInt32BE(this.numDlcTransactions);

    return writer.toBuffer();
  }
}
