import {
  BufferReader,
  BufferWriter,
  StreamReader,
} from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { Tx } from '@node-lightning/bitcoin';

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

  public abstract toJSON(): IDlcTransactionsV0JSON;

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

    instance.contractId = reader.readBytes(32);

    const fundTxLen = reader.readUInt16BE();
    instance.fundTx = Tx.decode(
      StreamReader.fromBuffer(reader.readBytes(fundTxLen)),
    );

    instance.fundTxVout = reader.readUInt32BE();

    const fundHash = reader.readBytes(32);
    const fundHeight = reader.readUInt16BE();
    instance.fundEpoch = {
      hash: fundHash,
      height: fundHeight,
    };

    instance.fundBroadcastHeight = reader.readUInt16BE();

    const refundTxLen = reader.readUInt16BE();
    instance.refundTx = Tx.decode(
      StreamReader.fromBuffer(reader.readBytes(refundTxLen)),
    );

    const numCets = reader.readBigSize(); // num_cets
    for (let i = 0; i < numCets; i++) {
      const cetLen = reader.readUInt16BE();
      instance.cets.push(
        Tx.decode(StreamReader.fromBuffer(reader.readBytes(cetLen))),
      );
    }

    const closeHash = reader.readBytes(32);
    const closeHeight = reader.readUInt16BE();
    instance.closeEpoch = {
      hash: closeHash,
      height: closeHeight,
    };

    instance.closeTxHash = reader.readBytes(32);

    instance.closeType = reader.readUInt8();

    instance.closeBroadcastHeight = reader.readUInt16BE();

    return instance;
  }

  /**
   * The type for offer_dlc_v0 message. offer_dlc_v0 = 42778
   */
  public type = DlcTransactionsV0.type;

  public contractId: Buffer;

  public fundTx: Tx;

  public fundTxVout: number;

  public fundEpoch: BlockEpoch = {
    hash: Buffer.alloc(32),
    height: 0,
  };

  public fundBroadcastHeight = 0;

  public refundTx: Tx;

  public cets: Tx[] = [];

  public closeEpoch: BlockEpoch = {
    hash: Buffer.alloc(32),
    height: 0,
  };

  public closeTxHash: Buffer = Buffer.alloc(32);

  public closeType: CloseType = 0;

  public closeBroadcastHeight = 0;

  /**
   * Converts dlc_transactions_v0 to JSON
   */
  public toJSON(): IDlcTransactionsV0JSON {
    return {
      type: this.type,
      contractId: this.contractId.toString('hex'),
      fundTx: this.fundTx.serialize().toString('hex'),
      fundTxVout: this.fundTxVout,
      refundTx: this.refundTx.serialize().toString('hex'),
      cets: this.cets.map((cet) => cet.serialize().toString('hex')),
    };
  }

  /**
   * Serializes the dlc_transactions_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBytes(this.contractId);
    writer.writeUInt16BE(this.fundTx.serialize().length);
    writer.writeBytes(this.fundTx.serialize());
    writer.writeUInt32BE(this.fundTxVout);
    writer.writeBytes(this.fundEpoch.hash);
    writer.writeUInt16BE(this.fundEpoch.height);
    writer.writeUInt16BE(this.fundBroadcastHeight);
    writer.writeUInt16BE(this.refundTx.serialize().length);
    writer.writeBytes(this.refundTx.serialize());

    writer.writeBigSize(this.cets.length);
    for (const cet of this.cets) {
      writer.writeUInt16BE(cet.serialize().length);
      writer.writeBytes(cet.serialize());
    }

    writer.writeBytes(this.closeEpoch.hash);
    writer.writeUInt16BE(this.closeEpoch.height);
    writer.writeBytes(this.closeTxHash);
    writer.writeUInt8(this.closeType);
    writer.writeUInt16BE(this.closeBroadcastHeight);

    return writer.toBuffer();
  }
}

export interface IDlcTransactionsV0JSON {
  type: number;
  contractId: string;
  fundTx: string;
  fundTxVout: number;
  refundTx: string;
  cets: string[];
}

export interface BlockEpoch {
  hash: Buffer;
  height: number;
}

export enum CloseType {
  NotClosed = 0,
  ExecuteClose = 1,
  RefundClose = 2,
  CooperativeClose = 3,
}
