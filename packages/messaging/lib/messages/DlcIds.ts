import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * DlcIds message contains list of buffers
 */
export class DlcIds implements IDlcMessage {
  public static type = MessageType.DlcIds;

  public static deserialize(buf: Buffer): DlcIds {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.DlcIdsV0:
        return DlcIds.deserializeV0(buf);
      default:
        throw new Error(`DLC IDs message type must be DlcIdsV0`);
    }
  }

  /**
   * Deserializes an dlc_ids message
   * @param buf
   */
  private static deserializeV0(buf: Buffer): DlcIds {
    const instance = new DlcIds();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type
    const idsLen = reader.readBigSize(); // ids length

    for (let i = 0; i < idsLen; i++) {
      instance.ids.push(reader.readBytes(32));
    }

    return instance;
  }

  /**
   * The type for dlc_ids message
   */
  public type = DlcIds.type;

  public ids: Buffer[] = [];

  /**
   * Serializes the dlc_ids message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBigSize(this.ids.length);
    for (const id of this.ids) {
      writer.writeBytes(id);
    }

    return writer.toBuffer();
  }
}

// Legacy support - keeping old class name as alias
export const DlcIdsV0 = DlcIds;
export type DlcIdsV0 = DlcIds;
