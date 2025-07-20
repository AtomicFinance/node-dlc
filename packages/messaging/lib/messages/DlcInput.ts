import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * DlcInput contains information about a DLC input to be used in a funding transaction.
 * Contains the local and remote funding public keys and the contract ID of the DLC input.
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

    // Parse contract ID (32 bytes)
    const contractId = json.contractId || json.contract_id;
    if (typeof contractId === 'string') {
      instance.contractId = Buffer.from(contractId, 'hex');
    } else {
      throw new Error('contractId is required');
    }

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

    // Read contract ID (32 bytes)
    instance.contractId = reader.readBytes(32);

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

    // Read contract ID (32 bytes)
    instance.contractId = reader.readBytes(32);

    return instance;
  }

  /**
   * The type for dlc_input message. dlc_input = 42773
   */
  public type = DlcInput.type;

  public length: bigint;

  public localFundPubkey: Buffer;

  public remoteFundPubkey: Buffer;

  public contractId: Buffer;

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
    if (!this.contractId || this.contractId.length !== 32) {
      throw new Error('contractId must be a 32-byte buffer');
    }
  }

  /**
   * Converts dlc_input to JSON
   */
  public toJSON(): IDlcInputJSON {
    return {
      localFundPubkey: this.localFundPubkey.toString('hex'),
      remoteFundPubkey: this.remoteFundPubkey.toString('hex'),
      contractId: this.contractId.toString('hex'),
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
    dataWriter.writeBytes(this.contractId);

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
    writer.writeBytes(this.contractId);

    return writer.toBuffer();
  }
}

export interface IDlcInputJSON {
  localFundPubkey: string;
  remoteFundPubkey: string;
  contractId: string;
}
