import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * DlcCancel message contains information about a node's desire to cancel
 * a DLC contract negotiation.
 */
export class DlcCancel implements IDlcMessage {
  public static type = MessageType.DlcCancel;

  /**
   * Deserializes a dlc_cancel message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcCancel {
    const instance = new DlcCancel();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type
    instance.contractId = reader.readBytes(32);
    instance.cancelType = reader.readUInt8();

    return instance;
  }

  /**
   * The type for dlc_cancel message. dlc_cancel = 52172
   */
  public type = DlcCancel.type;

  public contractId: Buffer;

  public cancelType: CancelType = 0;

  /**
   * Serializes the dlc_cancel message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBytes(this.contractId);
    writer.writeUInt8(this.cancelType);

    return writer.toBuffer();
  }
}

export enum CancelType {
  Unknown = 0,
  Market = 1,
  Error = 2,
}

// Backward compatibility alias
export const DlcCancelV0 = DlcCancel;
