import {
  BufferReader,
  BufferWriter,
  StreamReader,
} from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { Tx } from '@node-dlc/bitcoin';

export abstract class DlcTransactions {
  public static deserialize(buf: Buffer): DlcTransactionsV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

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
export class DlcTransactionsV0 extends DlcTransactions implements IDlcMessage {
  public static type = MessageType.DlcTransactionsV0;

  /**
   * Deserializes an offer_dlc_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcTransactionsV0 {
    const instance = new DlcTransactionsV0();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type
    console.log('test1');

    instance.contractId = reader.readBytes(32);
    console.log('test2');

    const fundTxLen = reader.readUInt16BE();
    instance.fundTx = Tx.parse(
      StreamReader.fromBuffer(reader.readBytes(fundTxLen)),
    );
    console.log('test3');

    instance.fundTxOutAmount = reader.readBigSize();
    console.log('test4');

    const refundTxLen = reader.readUInt16BE();
    instance.refundTx = Tx.parse(
      StreamReader.fromBuffer(reader.readBytes(refundTxLen)),
    );
    console.log('test5');

    reader.readBigSize(); // num_cets
    while (!reader.eof) {
      const cetLen = reader.readUInt16BE();
      instance.cets.push(
        Tx.parse(StreamReader.fromBuffer(reader.readBytes(cetLen))),
      );
    }

    return instance;
  }

  /**
   * The type for offer_dlc_v0 message. offer_dlc_v0 = 42778
   */
  public type = DlcTransactionsV0.type;

  public contractId: Buffer;

  public fundTx: Tx;

  public fundTxOutAmount: bigint;

  public refundTx: Tx;

  public cets: Tx[] = [];

  /**
   * Serializes the dlc_transactions_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBytes(this.contractId);
    writer.writeUInt16BE(this.fundTx.serialize().length);
    writer.writeBytes(this.fundTx.serialize());
    writer.writeBigSize(this.fundTxOutAmount);
    writer.writeUInt16BE(this.refundTx.serialize().length);
    writer.writeBytes(this.refundTx.serialize());

    writer.writeBigSize(this.cets.length);
    for (const cet of this.cets) {
      writer.writeUInt16BE(cet.serialize().length);
      writer.writeBytes(cet.serialize());
    }

    return writer.toBuffer();
  }
}
