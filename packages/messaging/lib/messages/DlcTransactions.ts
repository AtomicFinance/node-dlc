import { Tx } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter, StreamReader } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * DlcTransactions message contains information about state of DLC
 * contract such as fundtx and closetx
 */
export class DlcTransactions implements IDlcMessage {
  public static type = MessageType.DlcTransactions;

  /**
   * Deserializes a dlc_transactions message
   * @param buf
   */
  public static deserialize(buf: Buffer, parseCets = true): DlcTransactions {
    const instance = new DlcTransactions();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type

    instance.contractId = reader.readBytes(32);

    const fundTxLen = reader.readUInt16BE();
    instance.fundTx = Tx.decode(
      StreamReader.fromBuffer(reader.readBytes(fundTxLen)),
    );

    instance.fundTxVout = reader.readUInt32BE();

    const fundHash = reader.readBytes(32);
    const fundHeight = reader.readUInt32BE();
    instance.fundEpoch = {
      hash: fundHash,
      height: fundHeight,
    };

    instance.fundBroadcastHeight = reader.readUInt32BE();

    const refundTxLen = reader.readUInt16BE();
    instance.refundTx = Tx.decode(
      StreamReader.fromBuffer(reader.readBytes(refundTxLen)),
    );

    const numCets = reader.readBigSize(); // num_cets
    for (let i = 0; i < numCets; i++) {
      const cetLen = reader.readUInt16BE();
      if (parseCets || i === 0) {
        instance.cets.push(
          Tx.decode(StreamReader.fromBuffer(reader.readBytes(cetLen))),
        );
      } else {
        reader.readBytes(cetLen);
      }
    }

    const closeHash = reader.readBytes(32);
    const closeHeight = reader.readUInt32BE();
    instance.closeEpoch = {
      hash: closeHash,
      height: closeHeight,
    };

    instance.closeTxHash = reader.readBytes(32);

    instance.closeType = reader.readUInt8();

    instance.closeBroadcastHeight = reader.readUInt32BE();

    return instance;
  }

  /**
   * The type for dlc_transactions message. dlc_transactions = 61230
   */
  public type = DlcTransactions.type;

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
   * Converts dlc_transactions to JSON
   */
  public toJSON(): IDlcTransactionsJSON {
    return {
      type: this.type,
      contractId: this.contractId.toString('hex'),
      fundTx: this.fundTx.serialize().toString('hex'),
      fundTxVout: this.fundTxVout,
      fundEpoch: {
        hash: this.fundEpoch.hash.toString('hex'),
        height: this.fundEpoch.height,
      },
      fundBroadcastHeight: this.fundBroadcastHeight,
      refundTx: this.refundTx.serialize().toString('hex'),
      cets: this.cets.map((cet) => cet.serialize().toString('hex')),
      closeEpoch: {
        hash: this.closeEpoch.hash.toString('hex'),
        height: this.closeEpoch.height,
      },
      closeTxHash: this.closeTxHash.toString('hex'),
      closeType: closeTypeToStr(this.closeType),
      closeBroadcastHeight: this.closeBroadcastHeight,
    };
  }

  /**
   * Serializes the dlc_transactions message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBytes(this.contractId);
    writer.writeUInt16BE(this.fundTx.serialize().length);
    writer.writeBytes(this.fundTx.serialize());
    writer.writeUInt32BE(this.fundTxVout);
    writer.writeBytes(this.fundEpoch.hash);
    writer.writeUInt32BE(this.fundEpoch.height);
    writer.writeUInt32BE(this.fundBroadcastHeight);
    writer.writeUInt16BE(this.refundTx.serialize().length);
    writer.writeBytes(this.refundTx.serialize());

    writer.writeBigSize(this.cets.length);
    for (const cet of this.cets) {
      writer.writeUInt16BE(cet.serialize().length);
      writer.writeBytes(cet.serialize());
    }

    writer.writeBytes(this.closeEpoch.hash);
    writer.writeUInt32BE(this.closeEpoch.height);
    writer.writeBytes(this.closeTxHash);
    writer.writeUInt8(this.closeType);
    writer.writeUInt32BE(this.closeBroadcastHeight);

    return writer.toBuffer();
  }
}

const closeTypeToStr = (closeType: CloseType): string => {
  switch (closeType) {
    case CloseType.ExecuteClose:
      return 'ExecuteClose';
    case CloseType.RefundClose:
      return 'RefundClose';
    case CloseType.CooperativeClose:
      return 'CooperativeClose';
    default:
      return 'NotClosed';
  }
};

export interface IDlcTransactionsJSON {
  type: number;
  contractId: string;
  fundTx: string;
  fundTxVout: number;
  fundEpoch: IBlockEpochJSON;
  fundBroadcastHeight: number;
  refundTx: string;
  cets: string[];
  closeEpoch: IBlockEpochJSON;
  closeTxHash: string;
  closeType: string;
  closeBroadcastHeight: number;
}

export interface IBlockEpochJSON {
  hash: string;
  height: number;
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

// Backward compatibility aliases
export const DlcTransactionsV0 = DlcTransactions;
export type IDlcTransactionsV0JSON = IDlcTransactionsJSON;
