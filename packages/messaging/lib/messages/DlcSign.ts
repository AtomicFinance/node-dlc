import { BufferReader, BufferWriter } from '@node-dlc/bufio';
import secp256k1 from 'secp256k1';

import { MessageType, PROTOCOL_VERSION } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import { BatchFundingGroup } from './BatchFundingGroup';
import {
  CetAdaptorSignatures,
  ICetAdaptorSignaturesJSON,
} from './CetAdaptorSignatures';
import { IDlcMessage } from './DlcMessage';
import { FundingSignatures, IFundingSignaturesJSON } from './FundingSignatures';
import { ScriptWitnessV0 } from './ScriptWitnessV0';

/**
 * DlcSign gives all of the initiator's signatures, which allows the
 * receiver to broadcast the funding transaction with both parties being
 * fully committed to all closing transactions.
 * Updated to support dlcspecs PR #163 format.
 */
export class DlcSign implements IDlcMessage {
  public static type = MessageType.DlcSign;

  /**
   * Creates a DlcSign from JSON data (e.g., from test vectors)
   * Handles both our internal format and external test vector formats
   * @param json JSON object representing a DLC sign
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): DlcSign {
    const instance = new DlcSign();

    // Helper function to parse DER-encoded signature and extract raw r,s values (64 bytes total)
    const parseDerSignature = (hexSig: string): Buffer => {
      const sigBuffer = Buffer.from(hexSig, 'hex');

      // If it's already 64 bytes, assume it's raw
      if (sigBuffer.length === 64) {
        return sigBuffer;
      }

      // Use secp256k1.signatureImport to parse DER signature
      try {
        const rawSig = secp256k1.signatureImport(sigBuffer);
        return Buffer.from(rawSig);
      } catch (ex) {
        throw new Error(`Invalid DER signature: ${ex.message}`);
      }
    };

    // Handle both internal and external field naming conventions
    instance.protocolVersion =
      json.protocolVersion || json.protocol_version || PROTOCOL_VERSION;
    instance.contractId = Buffer.from(
      json.contractId || json.contract_id,
      'hex',
    );

    // Parse CET adaptor signatures
    instance.cetAdaptorSignatures = DlcSign.parseCetAdaptorSignaturesFromJSON(
      json.cetAdaptorSignatures || json.cet_adaptor_signatures,
    );

    // Parse refund signature - handle DER encoding
    const refundSigHex = json.refundSignature || json.refund_signature;
    instance.refundSignature = parseDerSignature(refundSigHex);

    // Parse funding signatures
    instance.fundingSignatures = DlcSign.parseFundingSignaturesFromJSON(
      json.fundingSignatures || json.funding_signatures,
    );

    return instance;
  }

  /**
   * Parses CetAdaptorSignatures from JSON
   * @param cetSigsJson JSON object representing CET adaptor signatures
   */
  private static parseCetAdaptorSignaturesFromJSON(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cetSigsJson: any,
  ): CetAdaptorSignatures {
    const instance = new CetAdaptorSignatures();

    if (
      cetSigsJson.ecdsaAdaptorSignatures ||
      cetSigsJson.ecdsa_adaptor_signatures
    ) {
      const ecdsaSigs =
        cetSigsJson.ecdsaAdaptorSignatures ||
        cetSigsJson.ecdsa_adaptor_signatures;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instance.sigs = ecdsaSigs.map((sig: any) => {
        // The test vectors use 'signature' field, but our internal format uses encryptedSig/dleqProof
        // For now, we'll parse the signature as encryptedSig and leave dleqProof empty
        const sigBuffer = Buffer.from(sig.signature, 'hex');
        return {
          encryptedSig: sigBuffer.slice(0, 65), // First 65 bytes
          dleqProof:
            sigBuffer.length > 65 ? sigBuffer.slice(65, 162) : Buffer.alloc(97), // Next 97 bytes or empty
        };
      });
    }

    return instance;
  }

  /**
   * Parses FundingSignatures from JSON
   * @param fundingSigsJson JSON object representing funding signatures
   */
  private static parseFundingSignaturesFromJSON(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fundingSigsJson: any,
  ): FundingSignatures {
    const instance = new FundingSignatures();

    if (
      fundingSigsJson.fundingSignatures ||
      fundingSigsJson.funding_signatures
    ) {
      const fundingSigs =
        fundingSigsJson.fundingSignatures || fundingSigsJson.funding_signatures;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instance.witnessElements = fundingSigs.map((sig: any) =>
        (sig.witnessElements || sig.witness_elements || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (element: any) => {
            // Create a ScriptWitnessV0 instance for each witness element
            const witness = new ScriptWitnessV0();
            witness.witness = Buffer.from(element.witness || element, 'hex');
            return witness;
          },
        ),
      );
    }

    return instance;
  }

  /**
   * Deserializes a sign_dlc message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcSign {
    const instance = new DlcSign();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type

    // New fields as per dlcspecs PR #163
    instance.protocolVersion = reader.readUInt32BE();
    instance.contractId = reader.readBytes(32);

    // Read CET adaptor signatures directly to match serialize format (no TLV wrapping)
    instance.cetAdaptorSignatures = CetAdaptorSignatures.deserialize(
      Buffer.from(reader.buffer.subarray(reader.position)),
    );

    // Skip past the CET adaptor signatures we just read
    const cetLength = instance.cetAdaptorSignatures.serialize().length;
    reader.position += cetLength;

    instance.refundSignature = reader.readBytes(64);

    // Read funding signatures directly to match serialize format (no TLV wrapping)
    instance.fundingSignatures = FundingSignatures.deserialize(
      Buffer.from(reader.buffer.subarray(reader.position)),
    );

    // Skip past the funding signatures we just read
    const fundingLength = instance.fundingSignatures.serialize().length;
    reader.position += fundingLength;

    // Parse TLV stream as per dlcspecs PR #163
    while (!reader.eof) {
      const buf = getTlv(reader);
      const tlvReader = new BufferReader(buf);
      const { type } = deserializeTlv(tlvReader);

      switch (Number(type)) {
        case MessageType.BatchFundingGroup:
          if (!instance.batchFundingGroups) {
            instance.batchFundingGroups = [];
          }
          instance.batchFundingGroups.push(BatchFundingGroup.deserialize(buf));
          break;
        default:
          // Store unknown TLVs for future compatibility
          if (!instance.unknownTlvs) {
            instance.unknownTlvs = [];
          }
          instance.unknownTlvs.push({ type: Number(type), data: buf });
          break;
      }
    }

    return instance;
  }

  /**
   * The type for sign_dlc message. sign_dlc = 42782
   */
  public type = DlcSign.type;

  // New fields as per dlcspecs PR #163
  public protocolVersion: number = PROTOCOL_VERSION; // Default to current protocol version

  // Existing fields
  public contractId: Buffer;

  public cetAdaptorSignatures: CetAdaptorSignatures;

  public refundSignature: Buffer;

  public fundingSignatures: FundingSignatures;

  public batchFundingGroups?: BatchFundingGroup[];

  // Store unknown TLVs for forward compatibility
  public unknownTlvs?: Array<{ type: number; data: Buffer }>;

  /**
   * Validates correctness of all fields
   * Updated validation rules as per dlcspecs PR #163
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    // 1. Type is set automatically in class
    // 2. protocol_version validation
    if (this.protocolVersion !== PROTOCOL_VERSION) {
      throw new Error(
        `Unsupported protocol version: ${this.protocolVersion}, expected: ${PROTOCOL_VERSION}`,
      );
    }

    // 3. contract_id must be 32 bytes
    if (!this.contractId || this.contractId.length !== 32) {
      throw new Error('contractId must be 32 bytes');
    }

    // 4. Other validations would depend on specific business logic
    // TODO: Add more specific validation rules as needed
  }

  /**
   * Converts sign_dlc to JSON (canonical rust-dlc format)
   */
  public toJSON(): IDlcSignJSON {
    // Convert raw signature back to DER format for canonical rust-dlc JSON
    const derRefundSignature = secp256k1.signatureExport(this.refundSignature);

    return {
      protocolVersion: this.protocolVersion,
      contractId: this.contractId.toString('hex'),
      cetAdaptorSignatures: this.cetAdaptorSignatures.toJSON(),
      refundSignature: Buffer.from(derRefundSignature).toString('hex'),
      fundingSignatures: this.fundingSignatures.toJSON(),
    };
  }

  /**
   * Serializes the sign_dlc message into a Buffer
   * Updated serialization format as per dlcspecs PR #163
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);

    // New fields as per dlcspecs PR #163
    writer.writeUInt32BE(this.protocolVersion);
    writer.writeBytes(this.contractId);
    writer.writeBytes(this.cetAdaptorSignatures.serialize());
    writer.writeBytes(this.refundSignature);
    writer.writeBytes(this.fundingSignatures.serialize());

    // TLV stream as per dlcspecs PR #163
    if (this.batchFundingGroups)
      this.batchFundingGroups.forEach((fundingInfo) =>
        writer.writeBytes(fundingInfo.serialize()),
      );

    // Write unknown TLVs for forward compatibility
    if (this.unknownTlvs) {
      this.unknownTlvs.forEach((tlv) => {
        writer.writeBytes(tlv.data);
      });
    }

    return writer.toBuffer();
  }
}

export interface IDlcSignJSON {
  protocolVersion: number;
  contractId: string;
  cetAdaptorSignatures: ICetAdaptorSignaturesJSON;
  refundSignature: string;
  fundingSignatures: IFundingSignaturesJSON;
}

export class DlcSignContainer {
  private signs: DlcSign[] = [];

  /**
   * Adds a DlcSign to the container.
   * @param sign The DlcSign to add.
   */
  public addSign(sign: DlcSign): void {
    this.signs.push(sign);
  }

  /**
   * Returns all DlcSigns in the container.
   * @returns An array of DlcSign instances.
   */
  public getSigns(): DlcSign[] {
    return this.signs;
  }

  /**
   * Serializes all DlcSigns in the container to a Buffer.
   * @returns A Buffer containing the serialized DlcSigns.
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    // Write the number of signs in the container first.
    writer.writeBigSize(this.signs.length);
    // Serialize each sign and write it.
    this.signs.forEach((sign) => {
      const serializedSign = sign.serialize();
      // Optionally, write the length of the serialized sign for easier deserialization.
      writer.writeBigSize(serializedSign.length);
      writer.writeBytes(serializedSign);
    });
    return writer.toBuffer();
  }

  /**
   * Deserializes a Buffer into a DlcSignContainer with DlcSigns.
   * @param buf The Buffer to deserialize.
   * @returns A DlcSignContainer instance.
   */
  public static deserialize(buf: Buffer): DlcSignContainer {
    const reader = new BufferReader(buf);
    const container = new DlcSignContainer();
    const signsCount = reader.readBigSize();
    for (let i = 0; i < signsCount; i++) {
      // Optionally, read the length of the serialized sign if it was written during serialization.
      const signLength = reader.readBigSize();
      const signBuf = reader.readBytes(Number(signLength));
      const sign = DlcSign.deserialize(signBuf);
      container.addSign(sign);
    }
    return container;
  }
}
