import { BufferReader, BufferWriter } from '@node-dlc/bufio';
import { validPublicKey } from '@node-dlc/crypto';

import { MessageType } from '../MessageType';
import { bigIntToNumber, toBigInt } from '../util';
import { IDlcMessage } from './DlcMessage';

/**
 * DlcInput contains information about a DLC input to be used in a funding transaction.
 * Contains the local and remote funding public keys and the value of the DLC input.
 * Matches rust-dlc DlcInput struct.
 */
export class DlcInput implements IDlcMessage {
  public static type = MessageType.DlcInput;

  /**
   * Creates a DlcInput from JSON data
   * @param json JSON object representing DLC input
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): DlcInput {
    const instance = new DlcInput();

    // Parse local funding public key
    const localFundPubkey = json.localFundPubkey || json.local_fund_pubkey;
    if (typeof localFundPubkey === 'string') {
      instance.localFundPubkey = Buffer.from(localFundPubkey, 'hex');
    } else {
      throw new Error('localFundPubkey is required');
    }

    // Parse remote funding public key
    const remoteFundPubkey = json.remoteFundPubkey || json.remote_fund_pubkey;
    if (typeof remoteFundPubkey === 'string') {
      instance.remoteFundPubkey = Buffer.from(remoteFundPubkey, 'hex');
    } else {
      throw new Error('remoteFundPubkey is required');
    }

    // Parse fund value (in satoshis)
    const fundValue = json.fundValue || json.fund_value;
    instance.fundValue = toBigInt(fundValue);

    return instance;
  }

  /**
   * Deserializes a dlc_input message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcInput {
    const instance = new DlcInput();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    // Read local funding public key (33 bytes)
    instance.localFundPubkey = reader.readBytes(33);

    // Read remote funding public key (33 bytes)
    instance.remoteFundPubkey = reader.readBytes(33);

    // Read fund value (8 bytes)
    instance.fundValue = reader.readUInt64BE();

    return instance;
  }

  /**
   * Deserializes a dlc_input without TLV wrapper (for use in FundingInput)
   * @param buf
   */
  public static deserializeBody(buf: Buffer): DlcInput {
    const instance = new DlcInput();
    const reader = new BufferReader(buf);

    // Read local funding public key (33 bytes)
    instance.localFundPubkey = reader.readBytes(33);

    // Read remote funding public key (33 bytes)
    instance.remoteFundPubkey = reader.readBytes(33);

    // Read fund value (8 bytes)
    instance.fundValue = reader.readUInt64BE();

    return instance;
  }

  /**
   * The type for dlc_input message. dlc_input = 42774
   */
  public type = DlcInput.type;

  public length: bigint;

  public localFundPubkey: Buffer;

  public remoteFundPubkey: Buffer;

  public fundValue: bigint;

  /**
   * Validates correctness of all fields
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    if (!this.localFundPubkey) {
      throw new Error('localFundPubkey is required');
    }
    if (!this.remoteFundPubkey) {
      throw new Error('remoteFundPubkey is required');
    }
    if (this.fundValue <= BigInt('0')) {
      throw new Error('fundValue must be greater than 0');
    }
  }

  /**
   * Converts dlc_input to JSON
   */
  public toJSON(): IDlcInputJSON {
    return {
      localFundPubkey: this.localFundPubkey.toString('hex'),
      remoteFundPubkey: this.remoteFundPubkey.toString('hex'),
      fundValue: bigIntToNumber(this.fundValue),
    };
  }

  /**
   * Serializes the dlc_input message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBytes(this.localFundPubkey);
    dataWriter.writeBytes(this.remoteFundPubkey);
    dataWriter.writeUInt64BE(this.fundValue);

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }

  /**
   * Serializes dlc_input body without TLV wrapper (for embedding in FundingInput)
   */
  public serializeBody(): Buffer {
    const writer = new BufferWriter();
    writer.writeBytes(this.localFundPubkey);
    writer.writeBytes(this.remoteFundPubkey);
    writer.writeUInt64BE(this.fundValue);

    return writer.toBuffer();
  }
}

export interface IDlcInputJSON {
  localFundPubkey: string;
  remoteFundPubkey: string;
  fundValue: number;
}
