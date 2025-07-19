import { Sequence, Tx } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter, StreamReader } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { bigIntToNumber, toBigInt } from '../util';
import { DlcInput } from './DlcInput';
import { IDlcMessage } from './DlcMessage';

/**
 * FundingInput contains information about a specific input to be used
 * in a funding transaction, as well as its corresponding on-chain UTXO.
 * Matches rust-dlc FundingInput struct.
 */
export class FundingInput implements IDlcMessage {
  public static type = MessageType.FundingInput;

  /**
   * Creates a FundingInput from JSON data (e.g., from test vectors)
   * @param json JSON object representing funding input
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): FundingInput {
    const instance = new FundingInput();

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

    // Parse optional DLC input
    const dlcInput = json.dlcInput || json.dlc_input;
    if (dlcInput) {
      instance.dlcInput = DlcInput.fromJSON(dlcInput);
    }

    return instance;
  }

  /**
   * Deserializes a funding_input message
   * @param buf
   */
  public static deserialize(buf: Buffer): FundingInput {
    const instance = new FundingInput();
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

    // Read optional DLC input using rust-dlc Optional format (0x00/0x01 prefix)
    if (reader.position < reader.buffer.length) {
      const dlcInputData = reader.readOptional();
      if (dlcInputData) {
        instance.dlcInput = DlcInput.deserializeBody(dlcInputData);
      }
    }

    return instance;
  }

  /**
   * Deserializes a funding_input message without TLV wrapper (for use in DlcOffer)
   * This matches rust-dlc behavior where FundingInput is in a vector without individual TLV wrappers
   * @param buf
   */
  public static deserializeBody(buf: Buffer): FundingInput {
    const instance = new FundingInput();
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

    // Read optional DLC input using rust-dlc Optional format (0x00/0x01 prefix)
    if (reader.position < reader.buffer.length) {
      const dlcInputData = reader.readOptional();
      if (dlcInputData) {
        instance.dlcInput = DlcInput.deserializeBody(dlcInputData);
      }
    }

    return instance;
  }

  /**
   * The type for funding_input message. funding_input = 42772
   */
  public type = FundingInput.type;

  public length: bigint;

  public inputSerialId: bigint;

  public prevTx: Tx;

  public prevTxVout: number;

  public sequence: Sequence;

  public maxWitnessLen: number;

  public redeemScript: Buffer;

  public dlcInput?: DlcInput;

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
   * Converts funding_input to JSON (canonical rust-dlc format)
   */
  public toJSON(): IFundingInputJSON {
    const result: IFundingInputJSON = {
      inputSerialId: bigIntToNumber(this.inputSerialId),
      prevTx: this.prevTx.serialize().toString('hex'),
      prevTxVout: this.prevTxVout,
      sequence: this.sequence.value,
      maxWitnessLen: this.maxWitnessLen,
      redeemScript: this.redeemScript.toString('hex'),
    };

    if (this.dlcInput) {
      result.dlcInput = this.dlcInput.toJSON();
    }

    return result;
  }

  /**
   * Serializes the funding_input message into a Buffer
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

    // Write optional DLC input using rust-dlc Optional format (0x00/0x01 prefix)
    const dlcInputData = this.dlcInput ? this.dlcInput.serializeBody() : null;
    dataWriter.writeOptional(dlcInputData);

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

    // Write optional DLC input using rust-dlc Optional format (0x00/0x01 prefix)
    const dlcInputData = this.dlcInput ? this.dlcInput.serializeBody() : null;
    writer.writeOptional(dlcInputData);

    return writer.toBuffer();
  }
}

export interface IFundingInputJSON {
  inputSerialId: number;
  prevTx: string;
  prevTxVout: number;
  sequence: number;
  maxWitnessLen: number;
  redeemScript: string;
  dlcInput?: {
    localFundPubkey: string;
    remoteFundPubkey: string;
    fundValue: number;
  };
}
