import { BufferWriter, StreamReader } from '@node-dlc/bufio';

import { HashByteOrder } from './HashByteOrder';
import { HashValue } from './HashValue';
import { ICloneable } from './ICloneable';

/**
 * A tuple defining a transaction output which contains the transaction
 * identifier and the output index.
 */
export class OutPoint implements ICloneable<OutPoint> {
  /**
   * Creates an OutPoint from a byte stream.
   * @param reader
   */
  public static parse(reader: StreamReader): OutPoint {
    const txid = HashValue.parse(reader);
    const outputIndex = reader.readUInt32LE();
    return new OutPoint(txid, outputIndex);
  }

  /**
   * Creates an OutPoint instance from an Outpoint serialized
   * to the standard string of "txid:vout" where the txid is in RPC
   * (reversed) byte order
   */
  public static fromString(text: string): OutPoint {
    const parts = /^([0-9a-f]{64,64}):(\d+)$/i.exec(text);
    if (!parts) {
      throw new Error('invalid argument');
    }
    const txid = HashValue.fromRpc(parts[1]);
    const voutIdx = parseInt(parts[2]);
    if (voutIdx < 0) {
      throw new Error('invalid argument');
    }
    return new OutPoint(txid, voutIdx);
  }

  /**
   * Transaction identifier
   */
  public txid: HashValue;

  /**
   * Index of output in transaction
   */
  public outputIndex: number;

  /**
   * Constructs a new OutPoint
   * @param txid TxId as a HashValue or an RPC (big-endian) string
   * @param outputIndex
   */
  constructor(txid: HashValue | string, outputIndex: number) {
    if (txid instanceof HashValue) {
      this.txid = txid;
    } else {
      this.txid = HashValue.fromRpc(txid);
    }
    this.outputIndex = outputIndex;
  }

  /**
   * Converts the outpoint to a human readable string in the format
   * [txid]:[voutidx]
   */
  public toString() {
    return `${this.txid.toString(HashByteOrder.RPC)}:${this.outputIndex}`;
  }

  /**
   * Converts the outpoint to a JSON object with the txid and index
   * tuple
   */
  public toJSON() {
    return {
      txid: this.txid.toString(HashByteOrder.RPC),
      index: this.outputIndex,
    };
  }

  /**
   * Serializes the OutPoint to a buffer where the txid is serialized
   * in internal byte order, and the output index is uint32LE
   */
  public serialize(): Buffer {
    const writer = new BufferWriter(Buffer.alloc(36));
    writer.writeBytes(this.txid.serialize());
    writer.writeUInt32LE(this.outputIndex);
    return writer.toBuffer();
  }

  /**
   * Clones by performing deep copy
   */
  public clone(): OutPoint {
    return new OutPoint(this.txid.clone(), this.outputIndex);
  }
}
