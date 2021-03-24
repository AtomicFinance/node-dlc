import {
  BufferReader,
  BufferWriter,
  StreamReader,
} from '@node-lightning/bufio';
import { Tx, Sequence } from '@node-dlc/bitcoin';
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

  public abstract type: number;

  public abstract length: bigint;

  public abstract serialize(): Buffer;
}

/**
 * FundingInput V0 contains information about a specific input to be used
 * in a funding transaction, as well as its corresponding on-chain UTXO.
 */
export class FundingInputV0 extends FundingInput implements IDlcMessage {
  public static type = MessageType.FundingInputV0;

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
    instance.prevTx = Tx.parse(
      StreamReader.fromBuffer(reader.readBytes(prevTxLen)),
    );
    instance.prevTxVout = reader.readUInt32BE();
    instance.sequence = new Sequence(reader.readUInt32LE());
    instance.maxWitnessLen = reader.readUInt16BE();
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
}
