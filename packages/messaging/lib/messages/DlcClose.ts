import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { CetAdaptorSignaturesV0 } from './CetAdaptorSignaturesV0';
import { IDlcMessage } from './DlcMessage';
import { FundingInputV0 } from './FundingInput';
import { NegotiationFields } from './NegotiationFields';

export abstract class DlcClose {
  public static deserialize(buf: Buffer): DlcCloseV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.DlcCloseV0:
        return DlcCloseV0.deserialize(buf);
      default:
        throw new Error(`Dlc Close TLV type must be DlcCloseV0`);
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}

/**
 * DlcAccept contains information about a node and indicates its
 * acceptance of the new DLC, as well as its CET and refund
 * transaction signatures. This is the second step toward creating
 * the funding transaction and closing transactions.
 */
export class DlcCloseV0 implements IDlcMessage {
  public static type = MessageType.DlcAcceptV0;

  /**
   * Deserializes an oracle_info message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcCloseV0 {
    const instance = new DlcCloseV0();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type

    return instance;
  }

  /**
   * The type for dlc_close_v0 message. dlc_close_v0 = 49786
   */
  public type = DlcCloseV0.type;

  public closeSignature: Buffer;

  public offerPayoutSatoshis: bigint;

  public acceptPayoutSatoshis: bigint;

  public fundingInputs: FundingInputV0[] = [];

  /**
   * Serializes the dlc_close_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);

    return writer.toBuffer();
  }
}
