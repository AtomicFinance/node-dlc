import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * DlcInfo message contains list of buffers
 */
export class DlcInfo implements IDlcMessage {
  public static type = MessageType.DlcInfo;

  public static deserialize(buf: Buffer): DlcInfo {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.DlcInfoV0:
        return DlcInfo.deserializeV0(buf);
      default:
        throw new Error(`DLC Info message type must be DlcInfoV0`);
    }
  }

  /**
   * Deserializes an dlc_info message
   * @param buf
   */
  private static deserializeV0(buf: Buffer): DlcInfo {
    const instance = new DlcInfo();
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
   * The type for dlc_info message
   */
  public type = DlcInfo.type;

  public numDlcOffers: number;

  public numDlcAccepts: number;

  public numDlcSigns: number;

  public numDlcCancels: number;

  public numDlcCloses: number;

  public numDlcTransactions: number;

  /**
   * Serializes the dlc_info message into a Buffer
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

// Legacy support - keeping old class name as alias
export const DlcInfoV0 = DlcInfo;
export type DlcInfoV0 = DlcInfo;
