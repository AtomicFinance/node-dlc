import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { Tx } from '@node-dlc/bitcoin';

export abstract class DlcTransactions {
  public static deserialize(buf: Buffer): DlcTransactionsV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.DlcTransactionsV0:
        return DlcTransactionsV0.deserialize(buf);
      default:
        throw new Error(`Dlc Transactions type must be DlcTransactionsV0`);
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
export class DlcTransactionsV0 implements IDlcMessage {
  public static type = MessageType.DlcTransactionsV0;

  /**
   * Deserializes an offer_dlc_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcTransactionsV0 {
    const instance = new DlcTransactionsV0();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type

    return instance;
  }

  /**
   * The type for offer_dlc_v0 message. offer_dlc_v0 = 42778
   */
  public type = DlcTransactionsV0.type;

  public fundTx: Tx;

  public fundTxOutAmount: bigint;

  public refundTx: Tx;

  public cets: Tx[];

  public tempContractId: Buffer;

  public contractId: Buffer;

  /**
   * Serializes the offer_dlc_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);

    return writer.toBuffer();
  }
}
