import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import { FundingInputV0, IFundingInputV0JSON } from './FundingInput';
import { FundingSignatures, IFundingSignaturesJSON } from './FundingSignatures';
import { ScriptWitnessV0 } from './ScriptWitnessV0';

export abstract class DlcClose {
  public static deserialize(buf: Buffer): DlcCloseV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.DlcCloseV0:
        return DlcCloseV0.deserialize(buf);
      default:
        throw new Error(`DLC Close message type must be DlcCloseV0`); // This is a temporary measure while protocol is being developed
    }
  }

  public abstract type: number;

  public abstract toJSON(): IDlcCloseV0JSON;

  public abstract serialize(): Buffer;
}

/**
 * DlcClose message contains information about a node and indicates its
 * desire to close an existing contract.
 * Updated to follow DlcOffer architectural patterns.
 */
export class DlcCloseV0 extends DlcClose implements IDlcMessage {
  public static type = MessageType.DlcCloseV0;

  /**
   * Creates a DlcCloseV0 from JSON data (e.g., from test vectors)
   * Handles both our internal format and external test vector formats
   * @param json JSON object representing a DLC close message
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): DlcCloseV0 {
    const instance = new DlcCloseV0();

    // Helper function to safely convert to BigInt from various input types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toBigInt = (value: any): bigint => {
      if (value === null || value === undefined) return BigInt(0);
      if (typeof value === 'bigint') return value;
      if (typeof value === 'string') return BigInt(value);
      if (typeof value === 'number') return BigInt(value);
      return BigInt(0);
    };

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

    // Use FundingInputV0.fromJSON() for each funding input - proper delegation
    instance.fundingInputs = (json.fundingInputs || json.funding_inputs || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((inputJson: any) => FundingInputV0.fromJSON(inputJson));

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
   * Deserializes a close_dlc_v0 message with improved format handling
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcCloseV0 {
    const instance = new DlcCloseV0();
    const reader = new BufferReader(buf);

    const type = reader.readUInt16BE(); // read type

    // Validate type matches expected DlcCloseV0 type
    if (type !== MessageType.DlcCloseV0) {
      throw new Error(
        `Invalid message type. Expected ${MessageType.DlcCloseV0}, got ${type}`,
      );
    }

    instance.contractId = reader.readBytes(32);
    instance.closeSignature = reader.readBytes(64);
    instance.offerPayoutSatoshis = reader.readUInt64BE();
    instance.acceptPayoutSatoshis = reader.readUInt64BE();
    instance.fundInputSerialId = reader.readUInt64BE();

    // Changed from u16 to bigsize for consistency with DlcOffer
    const fundingInputsLen = Number(reader.readBigSize());

    for (let i = 0; i < fundingInputsLen; i++) {
      instance.fundingInputs.push(FundingInputV0.deserialize(getTlv(reader)));
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
   * The type for close_dlc_v0 message. close_dlc_v0 = 52170
   */
  public type = DlcCloseV0.type;

  public contractId: Buffer;

  public closeSignature: Buffer;

  public offerPayoutSatoshis: bigint;

  public acceptPayoutSatoshis: bigint;

  public fundInputSerialId: bigint;

  public fundingInputs: FundingInputV0[] = [];

  public fundingSignatures: FundingSignatures;

  // Store unknown TLVs for forward compatibility
  public unknownTlvs?: Array<{ type: number; data: Buffer }>;

  /**
   * Validates correctness of all fields
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    // Type is set automatically in class

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
      (input: FundingInputV0) => input.inputSerialId,
    );

    if (new Set(inputSerialIds).size !== inputSerialIds.length) {
      throw new Error('inputSerialIds must be unique');
    }

    // Ensure funding inputs are segwit
    this.fundingInputs.forEach((input: FundingInputV0) => input.validate());

    // Note: FundingSignatures doesn't have a validate method, so we skip validation
  }

  /**
   * Converts dlc_close_v0 to JSON (canonical format)
   */
  public toJSON(): IDlcCloseV0JSON {
    // Helper function to safely convert BigInt to number, preserving precision
    const bigIntToNumber = (value: bigint): number => {
      // For values within safe integer range, convert to number
      if (
        value <= BigInt(Number.MAX_SAFE_INTEGER) &&
        value >= BigInt(Number.MIN_SAFE_INTEGER)
      ) {
        return Number(value);
      }
      // For larger values, we need to preserve as BigInt (json-bigint will handle serialization)
      return value as any;
    };

    return {
      type: this.type,
      contractId: this.contractId.toString('hex'),
      closeSignature: this.closeSignature.toString('hex'),
      offerPayoutSatoshis: bigIntToNumber(this.offerPayoutSatoshis),
      acceptPayoutSatoshis: bigIntToNumber(this.acceptPayoutSatoshis),
      fundInputSerialId: bigIntToNumber(this.fundInputSerialId),
      fundingInputs: this.fundingInputs.map((input) => input.toJSON()),
      fundingSignatures: this.fundingSignatures.toJSON(),
    };
  }

  /**
   * Serializes the close_dlc_v0 message into a Buffer
   * Updated serialization format to match DlcOffer patterns
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBytes(this.contractId);
    writer.writeBytes(this.closeSignature);
    writer.writeUInt64BE(this.offerPayoutSatoshis);
    writer.writeUInt64BE(this.acceptPayoutSatoshis);
    writer.writeUInt64BE(this.fundInputSerialId);

    // Changed from u16 to bigsize for consistency with DlcOffer
    writer.writeBigSize(this.fundingInputs.length);

    for (const fundingInput of this.fundingInputs) {
      writer.writeBytes(fundingInput.serialize());
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

export interface IDlcCloseV0JSON {
  type: number;
  contractId: string;
  closeSignature: string;
  offerPayoutSatoshis: number;
  acceptPayoutSatoshis: number;
  fundInputSerialId: number;
  fundingInputs: IFundingInputV0JSON[];
  fundingSignatures: IFundingSignaturesJSON;
}
