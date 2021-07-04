import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class DlcCancel {
  public static deserialize(buf: Buffer): DlcCancelV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.DlcCancelV0:
        return DlcCancelV0.deserialize(buf);
      default:
        throw new Error(`DLC Cancel message type must be DlcCancelV0`); // This is a temporary measure while protocol is being developed
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}

/**
 * DlcOffer message contains information about a node and indicates its
 * desire to enter into a new contract. This is the first step toward
 * creating the funding transaction and CETs.
 */
export class DlcCancelV0 extends DlcCancel implements IDlcMessage {
  public static type = MessageType.DlcCancelV0;

  /**
   * Deserializes an offer_dlc_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcCancelV0 {
    const instance = new DlcCancelV0();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type
    instance.contractId = reader.readBytes(32);
    instance.cancelType = reader.readUInt8();

    return instance;
  }

  /**
   * The type for cancel_dlc_v0 message. cancel_dlc_v0 = 52172
   */
  public type = DlcCancelV0.type;

  public contractId: Buffer;

  public cancelType: CancelType = 0;

  /**
   * Serializes the offer_dlc_v0 message into a Buffer
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
