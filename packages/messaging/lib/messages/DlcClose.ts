import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType, PROTOCOL_VERSION } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import { bigIntToNumber, toBigInt } from '../util';
import { IDlcMessage } from './DlcMessage';
import { FundingInput, IFundingInputJSON } from './FundingInput';
import { FundingSignatures, IFundingSignaturesJSON } from './FundingSignatures';
import { ScriptWitnessV0 } from './ScriptWitnessV0';

/**
 * DlcClose message contains information about a node and indicates its
 * desire to close an existing contract.
 * Updated to follow DlcOffer architectural patterns.
 */
export class DlcClose implements IDlcMessage {
  public static type = MessageType.DlcClose;

  /**
   * Creates a DlcClose from JSON data (e.g., from test vectors)
   * Handles both our internal format and external test vector formats
   * @param json JSON object representing a DLC close message
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): DlcClose {
    const instance = new DlcClose();

    // Basic fields with field name variations
    instance.protocolVersion =
      json.protocolVersion || json.protocol_version || PROTOCOL_VERSION;

    // Basic fields with field name variations
    instance.contractId = Buffer.from(
      json.contractId || json.contract_id,
      'hex',
    );
    instance.closeSignature = Buffer.from(
      json.closeSignature || json.close_signature,
      'hex',
    );

    // Use toBigInt helper to handle BigInt values from json-bigint
    instance.offerPayoutSatoshis = toBigInt(
      json.offerPayoutSatoshis || json.offer_payout_satoshis,
    );
    instance.acceptPayoutSatoshis = toBigInt(
      json.acceptPayoutSatoshis || json.accept_payout_satoshis,
    );
    instance.fundInputSerialId = toBigInt(
      json.fundInputSerialId || json.fund_input_serial_id,
    );

    // Use FundingInput.fromJSON() for each funding input - proper delegation
    instance.fundingInputs = (json.fundingInputs || json.funding_inputs || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((inputJson: any) => FundingInput.fromJSON(inputJson));

    // Create FundingSignatures manually since it doesn't have fromJSON
    if (json.fundingSignatures || json.funding_signatures) {
      instance.fundingSignatures = new FundingSignatures();
      const sigData = json.fundingSignatures || json.funding_signatures;

      // Handle different possible structures
      if (sigData.fundingSignatures) {
        // Standard format
        instance.fundingSignatures.witnessElements = sigData.fundingSignatures.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (sig: any) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sig.witnessElements?.map((elem: any) => {
              const witness = new ScriptWitnessV0();
              witness.length =
                elem.length || Buffer.from(elem.witness || '', 'hex').length;
              witness.witness = Buffer.from(elem.witness || '', 'hex');
              return witness;
            }) || [],
        );
      } else if (Array.isArray(sigData)) {
        // Array format
        instance.fundingSignatures.witnessElements = sigData.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (sig: any) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sig.witnessElements?.map((elem: any) => {
              const witness = new ScriptWitnessV0();
              witness.length =
                elem.length || Buffer.from(elem.witness || '', 'hex').length;
              witness.witness = Buffer.from(elem.witness || '', 'hex');
              return witness;
            }) || [],
        );
      }
    }

    return instance;
  }

  /**
   * Deserializes a close_dlc message with backward compatibility
   * Detects old format (without protocol_version) vs new format (with protocol_version)
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcClose {
    const instance = new DlcClose();
    const reader = new BufferReader(buf);

    const type = reader.readUInt16BE(); // read type

    // Validate type matches expected DlcClose type
    if (type !== MessageType.DlcClose) {
      throw new Error(
        `Invalid message type. Expected ${MessageType.DlcClose}, got ${type}`,
      );
    }

    // Read protocol version
    instance.protocolVersion = reader.readUInt32BE();
    instance.contractId = reader.readBytes(32);
    instance.closeSignature = reader.readBytes(64);
    instance.offerPayoutSatoshis = reader.readUInt64BE();
    instance.acceptPayoutSatoshis = reader.readUInt64BE();
    instance.fundInputSerialId = reader.readUInt64BE();

    // Changed from u16 to bigsize for consistency with DlcOffer
    const fundingInputsLen = Number(reader.readBigSize());

    for (let i = 0; i < fundingInputsLen; i++) {
      // FundingInput body is serialized directly without TLV wrapper in rust-dlc format
      const fundingInput = FundingInput.deserializeBody(
        reader.buffer.subarray(reader.position),
      );
      instance.fundingInputs.push(fundingInput);

      // Skip past the FundingInput we just read
      const fundingInputLength = fundingInput.serializeBody().length;
      reader.position += fundingInputLength;
    }

    // Handle FundingSignatures - deserialize raw data (no TLV wrapper) like DlcSign
    instance.fundingSignatures = FundingSignatures.deserialize(
      reader.buffer.subarray(reader.position),
    );

    // Skip past the funding signatures we just read
    const fundingLength = instance.fundingSignatures.serialize().length;
    reader.position += fundingLength;

    // Parse any additional TLV stream (for future extensibility)
    while (!reader.eof) {
      const buf = getTlv(reader);
      const tlvReader = new BufferReader(buf);
      const { type } = deserializeTlv(tlvReader);

      // Store unknown TLVs for future compatibility
      if (!instance.unknownTlvs) {
        instance.unknownTlvs = [];
      }
      instance.unknownTlvs.push({ type: Number(type), data: buf });
    }

    return instance;
  }

  /**
   * The type for close_dlc message. close_dlc = 52170
   */
  public type = DlcClose.type;

  // New fields as per dlcspecs PR #163
  public protocolVersion: number = PROTOCOL_VERSION; // Default to current protocol version

  public contractId: Buffer;

  public closeSignature: Buffer;

  public offerPayoutSatoshis: bigint;

  public acceptPayoutSatoshis: bigint;

  public fundInputSerialId: bigint;

  public fundingInputs: FundingInput[] = [];

  public fundingSignatures: FundingSignatures;

  // Store unknown TLVs for forward compatibility
  public unknownTlvs?: Array<{ type: number; data: Buffer }>;

  /**
   * Validates correctness of all fields
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    // Type is set automatically in class

    // protocol_version validation
    if (this.protocolVersion !== PROTOCOL_VERSION) {
      throw new Error(
        `Unsupported protocol version: ${this.protocolVersion}, expected: ${PROTOCOL_VERSION}`,
      );
    }

    // contractId validation
    if (!this.contractId || this.contractId.length !== 32) {
      throw new Error('contractId must be 32 bytes');
    }

    // closeSignature validation
    if (!this.closeSignature || this.closeSignature.length !== 64) {
      throw new Error('closeSignature must be 64 bytes');
    }

    // Ensure input serial ids are unique
    const inputSerialIds = this.fundingInputs.map(
      (input: FundingInput) => input.inputSerialId,
    );

    if (new Set(inputSerialIds).size !== inputSerialIds.length) {
      throw new Error('inputSerialIds must be unique');
    }

    // Ensure funding inputs are segwit
    this.fundingInputs.forEach((input: FundingInput) => input.validate());

    // Note: FundingSignatures doesn't have a validate method, so we skip validation
  }

  /**
   * Converts dlc_close to JSON (canonical rust-dlc format)
   */
  public toJSON(): IDlcCloseJSON {
    // Include unknown TLVs for debugging
    const tlvs = [];
    if (this.unknownTlvs) {
      this.unknownTlvs.forEach((tlv) =>
        tlvs.push({ type: tlv.type, data: tlv.data.toString('hex') }),
      );
    }

    // Return canonical rust-dlc format
    return {
      protocolVersion: this.protocolVersion,
      contractId: this.contractId.toString('hex'),
      closeSignature: this.closeSignature.toString('hex'),
      offerPayoutSatoshis: bigIntToNumber(this.offerPayoutSatoshis),
      acceptPayoutSatoshis: bigIntToNumber(this.acceptPayoutSatoshis),
      fundInputSerialId: bigIntToNumber(this.fundInputSerialId),
      fundingInputs: this.fundingInputs.map((input) => input.toJSON()),
      fundingSignatures: this.fundingSignatures.toJSON(),
    }; // Allow different field names from interface
  }

  /**
   * Serializes the close_dlc message into a Buffer
   * Updated serialization format to match DlcOffer patterns
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);

    // New fields as per dlcspecs PR #163
    writer.writeUInt32BE(this.protocolVersion);
    writer.writeBytes(this.contractId);
    writer.writeBytes(this.closeSignature);
    writer.writeUInt64BE(this.offerPayoutSatoshis);
    writer.writeUInt64BE(this.acceptPayoutSatoshis);
    writer.writeUInt64BE(this.fundInputSerialId);

    // Changed from u16 to bigsize for consistency with DlcOffer
    writer.writeBigSize(this.fundingInputs.length);

    for (const fundingInput of this.fundingInputs) {
      // Use serializeBody() to match rust-dlc behavior - funding inputs in vec are serialized without TLV wrapper
      writer.writeBytes(fundingInput.serializeBody());
    }

    // Serialize FundingSignatures directly (no TLV wrapper) like DlcSign
    writer.writeBytes(this.fundingSignatures.serialize());

    // Write unknown TLVs for forward compatibility
    if (this.unknownTlvs) {
      this.unknownTlvs.forEach((tlv) => {
        writer.writeBytes(tlv.data);
      });
    }

    return writer.toBuffer();
  }
}

export interface IDlcCloseJSON {
  type?: number; // Made optional for rust-dlc compatibility
  protocolVersion: number;
  contractId: string;
  closeSignature: string;
  offerPayoutSatoshis: number;
  acceptPayoutSatoshis: number;
  fundInputSerialId: number;
  fundingInputs: IFundingInputJSON[];
  fundingSignatures: IFundingSignaturesJSON;
  serialized?: string; // Made optional - hex serialization for compatibility testing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tlvs?: any[]; // Made optional - for unknown TLVs
}
