import { Sequence, Tx } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter, StreamReader } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class FundingInput {
  public static deserialize(buf: Buffer): FundingInputV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.FundingInputV0:
        return FundingInputV0.deserialize(buf);
      default:
        throw new Error(
          `FundingInput function TLV type must be FundingInputV0`,
        );
    }
  }

  /**
   * Creates a FundingInput from JSON data (e.g., from test vectors)
   * @param json JSON object representing funding input
   */
  public static fromJSON(json: any): FundingInput {
    // For now, always create FundingInputV0
    return FundingInputV0.fromJSON(json);
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract toJSON(): IFundingInputV0JSON;

  public abstract serialize(): Buffer;
  public abstract serializeBody(): Buffer;
}

/**
 * FundingInput V0 contains information about a specific input to be used
 * in a funding transaction, as well as its corresponding on-chain UTXO.
 */
export class FundingInputV0 extends FundingInput implements IDlcMessage {
  public static type = MessageType.FundingInputV0;

  /**
   * Creates a FundingInputV0 from JSON data
   * @param json JSON object representing funding input
   */
  public static fromJSON(json: any): FundingInputV0 {
    const instance = new FundingInputV0();

    // Helper function to safely convert to BigInt from various input types
    const toBigInt = (value: any): bigint => {
      if (value === null || value === undefined) return BigInt(0);
      if (typeof value === 'bigint') return value;
      if (typeof value === 'string') return BigInt(value);
      if (typeof value === 'number') return BigInt(value);
      return BigInt(0);
    };

    instance.inputSerialId = toBigInt(
      json.inputSerialId || json.input_serial_id,
    );

    // Parse previous transaction
    const prevTxHex = json.prevTx || json.prev_tx;
    if (prevTxHex) {
      instance.prevTx = Tx.decode(
        StreamReader.fromBuffer(Buffer.from(prevTxHex, 'hex')),
      );
    } else {
      // Create a minimal transaction for test purposes
      // TODO: This should be properly implemented when full test vector support is needed
      const writer = new BufferWriter();
      writer.writeUInt32BE(2); // version
      writer.writeUInt8(0); // input count
      writer.writeUInt8(1); // output count
      writer.writeUInt64BE(BigInt(100000000)); // output value
      writer.writeUInt8(25); // script length
      writer.writeBytes(Buffer.alloc(25)); // script
      writer.writeUInt32BE(0); // locktime

      const txBytes = writer.toBuffer();
      instance.prevTx = Tx.decode(StreamReader.fromBuffer(txBytes));
    }

    instance.prevTxVout = json.prevTxVout || json.prev_tx_vout || 0;
    instance.sequence = new Sequence(json.sequence || 0xffffffff);
    instance.maxWitnessLen = json.maxWitnessLen || json.max_witness_len || 108;

    const redeemScript = json.redeemScript || json.redeem_script || '';
    instance.redeemScript = Buffer.from(redeemScript, 'hex');

    return instance;
  }

  /**
   * Deserializes an funding_input_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): FundingInputV0 {
    const instance = new FundingInputV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    instance.inputSerialId = reader.readUInt64BE();
    const prevTxLen = reader.readUInt16BE();
    instance.prevTx = Tx.decode(
      StreamReader.fromBuffer(reader.readBytes(prevTxLen)),
    );
    instance.prevTxVout = reader.readUInt32BE();
    instance.sequence = new Sequence(reader.readUInt32BE());
    instance.maxWitnessLen = reader.readUInt16BE();
    const redeemScriptLen = reader.readUInt16BE();
    instance.redeemScript = reader.readBytes(redeemScriptLen);

    return instance;
  }

  /**
   * Deserializes an funding_input_v0 message without TLV wrapper (for use in DlcOffer)
   * This matches rust-dlc behavior where FundingInput is in a vector without individual TLV wrappers
   * @param buf
   */
  public static deserializeBody(buf: Buffer): FundingInputV0 {
    const instance = new FundingInputV0();
    const reader = new BufferReader(buf);

    // No TLV type/length to read - funding input body is serialized directly
    instance.inputSerialId = reader.readUInt64BE();

    // Read prev_tx with BigSize length (to match rust-dlc)
    const prevTxLen = Number(reader.readBigSize());
    instance.prevTx = Tx.decode(
      StreamReader.fromBuffer(reader.readBytes(prevTxLen)),
    );

    instance.prevTxVout = reader.readUInt32BE();
    instance.sequence = new Sequence(reader.readUInt32BE());
    instance.maxWitnessLen = reader.readUInt16BE();

    // Test: Read redeem_script with simple u16 length (to match rust-bitcoin ScriptBuf)
    const redeemScriptLen = reader.readUInt16BE();
    instance.redeemScript = reader.readBytes(redeemScriptLen);

    return instance;
  }

  /**
   * The type for funding_input_v0 message. funding_input_v0 = 42772
   */
  public type = FundingInputV0.type;

  public length: bigint;

  public inputSerialId: bigint;

  public prevTx: Tx;

  public prevTxVout: number;

  public sequence: Sequence;

  public maxWitnessLen: number;

  public redeemScript: Buffer;

  public scriptSigLength(): number {
    if (this.redeemScript.length > 0) {
      return 1 + this.redeemScript.length;
    } else {
      return 0;
    }
  }

  /**
   * Validates correctness of all fields
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    // 1. Type is set automatically in class
    // 2. Ensure inputs are segwit
    if (!this.prevTx.isSegWit) throw new Error('fundingInput must be segwit');
  }

  /**
   * Converts funding_input_v0 to JSON
   */
  public toJSON(): IFundingInputV0JSON {
    return {
      type: this.type,
      inputSerialId: Number(this.inputSerialId),
      prevTx: this.prevTx.serialize().toString('hex'),
      prevTxVout: this.prevTxVout,
      sequence: this.sequence.value,
      maxWitnessLen: this.maxWitnessLen,
      redeemScript: this.redeemScript.toString('hex'),
    };
  }

  /**
   * Serializes the funding_input_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt64BE(this.inputSerialId);
    dataWriter.writeUInt16BE(this.prevTx.serialize().length);
    dataWriter.writeBytes(this.prevTx.serialize());
    dataWriter.writeUInt32BE(this.prevTxVout);
    dataWriter.writeUInt32BE(this.sequence.value);
    dataWriter.writeUInt16BE(this.maxWitnessLen);
    dataWriter.writeUInt16BE(this.redeemScript.length);
    dataWriter.writeBytes(this.redeemScript);

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }

  public serializeBody(): Buffer {
    // Serialize funding input body without TLV wrapper (for embedding in DlcOffer)
    // This matches rust-dlc behavior where FundingInput.write() doesn't add type_id
    const writer = new BufferWriter();
    writer.writeUInt64BE(this.inputSerialId);

    // Use BigSize for prev_tx length to match rust-dlc (prev_tx, vec)
    writer.writeBigSize(this.prevTx.serialize().length);
    writer.writeBytes(this.prevTx.serialize());

    writer.writeUInt32BE(this.prevTxVout);
    writer.writeUInt32BE(this.sequence.value);
    writer.writeUInt16BE(this.maxWitnessLen);

    // Test: Use simple u16 length for redeem_script to match rust-bitcoin ScriptBuf
    writer.writeUInt16BE(this.redeemScript.length);
    writer.writeBytes(this.redeemScript);

    return writer.toBuffer();
  }
}

export interface IFundingInputV0JSON {
  type: number;
  inputSerialId: number;
  prevTx: string;
  prevTxVout: number;
  sequence: number;
  maxWitnessLen: number;
  redeemScript: string;
}
