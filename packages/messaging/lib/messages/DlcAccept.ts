import { Script, Sequence, Tx } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter, StreamReader } from '@node-dlc/bufio';
import { hash160 } from '@node-dlc/crypto';
import { BitcoinNetwork } from 'bitcoin-networks';
import { address } from 'bitcoinjs-lib';
import secp256k1 from 'secp256k1';

import { MessageType, PROTOCOL_VERSION } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv, skipTlv } from '../serialize/getTlv';
import { BatchFundingGroup, IBatchFundingGroupJSON } from './BatchFundingGroup';
import {
  CetAdaptorSignaturesV0,
  ICetAdaptorSignaturesV0JSON,
} from './CetAdaptorSignaturesV0';
import { IDlcMessage } from './DlcMessage';
import {
  FundingInput,
  FundingInputV0,
  IFundingInputV0JSON,
} from './FundingInput';
import {
  INegotiationFieldsV0JSON,
  INegotiationFieldsV1JSON,
  INegotiationFieldsV2JSON,
  NegotiationFields,
} from './NegotiationFields';

/**
 * DlcAccept contains information about a node and indicates its
 * acceptance of the new DLC, as well as its CET and refund
 * transaction signatures. This is the second step toward creating
 * the funding transaction and closing transactions.
 * Updated to support dlcspecs PR #163 format.
 */
export class DlcAccept implements IDlcMessage {
  public static type = MessageType.DlcAcceptV0;

  /**
   * Creates a DlcAccept from JSON data (e.g., from test vectors)
   * Handles both our internal format and external test vector formats
   * @param json JSON object representing a DLC accept
   */
  public static fromJSON(json: any): DlcAccept {
    const instance = new DlcAccept();

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
    instance.tempContractId = Buffer.from(
      json.tempContractId ||
        json.temporaryContractId ||
        json.temporary_contract_id,
      'hex',
    );

    // Helper function to safely convert to BigInt from various input types
    const toBigInt = (value: any): bigint => {
      if (value === null || value === undefined) return BigInt(0);
      if (typeof value === 'bigint') return value;
      if (typeof value === 'string') return BigInt(value);
      if (typeof value === 'number') return BigInt(value);
      return BigInt(0);
    };

    instance.acceptCollateralSatoshis = toBigInt(
      json.acceptCollateralSatoshis ||
        json.acceptCollateral ||
        json.accept_collateral,
    );

    // Handle field name variations between formats
    instance.fundingPubKey = Buffer.from(
      json.fundingPubKey || json.fundingPubkey || json.funding_pubkey,
      'hex',
    );
    instance.payoutSPK = Buffer.from(
      json.payoutSPK || json.payoutSpk || json.payout_spk,
      'hex',
    );
    instance.payoutSerialId = toBigInt(
      json.payoutSerialId || json.payout_serial_id,
    );

    instance.changeSPK = Buffer.from(
      json.changeSPK || json.changeSpk || json.change_spk,
      'hex',
    );
    instance.changeSerialId = toBigInt(
      json.changeSerialId || json.change_serial_id,
    );

    // Parse FundingInputs
    instance.fundingInputs = DlcAccept.parseFundingInputsFromJSON(
      json.fundingInputs || json.funding_inputs || [],
    );

    // Parse CET adaptor signatures
    instance.cetAdaptorSignatures = DlcAccept.parseCetAdaptorSignaturesFromJSON(
      json.cetAdaptorSignatures || json.cet_adaptor_signatures,
    );

    // Parse refund signature - handle DER encoding
    const refundSigHex = json.refundSignature || json.refund_signature;
    instance.refundSignature = parseDerSignature(refundSigHex);

    // Parse optional negotiation fields
    if (json.negotiationFields || json.negotiation_fields) {
      instance.negotiationFields = DlcAccept.parseNegotiationFieldsFromJSON(
        json.negotiationFields || json.negotiation_fields,
      );
    }

    return instance;
  }

  /**
   * Parses FundingInputs from JSON
   * @param fundingInputsJson Array of JSON objects representing funding inputs
   */
  private static parseFundingInputsFromJSON(
    fundingInputsJson: any[],
  ): FundingInputV0[] {
    return fundingInputsJson.map((inputJson) => {
      // Use the existing FundingInput.fromJSON method which handles all the field mapping correctly
      return FundingInput.fromJSON(inputJson) as FundingInputV0;
    });
  }

  /**
   * Parses CetAdaptorSignatures from JSON
   * @param cetSigsJson JSON object representing CET adaptor signatures
   */
  private static parseCetAdaptorSignaturesFromJSON(
    cetSigsJson: any,
  ): CetAdaptorSignaturesV0 {
    const instance = new CetAdaptorSignaturesV0();

    if (
      cetSigsJson.ecdsaAdaptorSignatures ||
      cetSigsJson.ecdsa_adaptor_signatures
    ) {
      const ecdsaSigs =
        cetSigsJson.ecdsaAdaptorSignatures ||
        cetSigsJson.ecdsa_adaptor_signatures;
      instance.sigs = ecdsaSigs.map((sig: any) => {
        // The test vectors use 'signature' field, but our internal format uses encryptedSig/dleqProof
        // Adaptor signatures have different format than regular ECDSA (65 bytes + 97 bytes)
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
   * Parses NegotiationFields from JSON
   * @param negotiationJson JSON object representing negotiation fields
   */
  private static parseNegotiationFieldsFromJSON(
    negotiationJson: any,
  ): NegotiationFields {
    // For now, return a basic implementation
    // TODO: Implement proper NegotiationFields parsing from JSON
    throw new Error('NegotiationFields.fromJSON not yet implemented');
  }

  /**
   * Deserializes an accept_dlc message
   * @param buf
   */
  public static deserialize(buf: Buffer, parseCets = true): DlcAccept {
    const instance = new DlcAccept();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type

    // New fields as per dlcspecs PR #163
    instance.protocolVersion = reader.readUInt32BE();
    instance.tempContractId = reader.readBytes(32);
    instance.acceptCollateralSatoshis = reader.readUInt64BE();
    instance.fundingPubKey = reader.readBytes(33);
    const payoutSPKLen = reader.readUInt16BE();
    instance.payoutSPK = reader.readBytes(payoutSPKLen);
    instance.payoutSerialId = reader.readUInt64BE();

    // Changed from u16 to bigsize as per dlcspecs PR #163
    const fundingInputsLen = Number(reader.readBigSize());
    for (let i = 0; i < fundingInputsLen; i++) {
      // FundingInput body is serialized directly without TLV wrapper in rust-dlc format
      const fundingInput = FundingInputV0.deserializeBody(
        reader.buffer.subarray(reader.position),
      );
      instance.fundingInputs.push(fundingInput);

      // Skip past the FundingInput we just read
      const fundingInputLength = fundingInput.serializeBody().length;
      reader.position += fundingInputLength;
    }

    const changeSPKLen = reader.readUInt16BE();
    instance.changeSPK = reader.readBytes(changeSPKLen);
    instance.changeSerialId = reader.readUInt64BE();

    if (parseCets) {
      // Read CET adaptor signatures directly to match serialize format (no TLV wrapping)
      instance.cetAdaptorSignatures = CetAdaptorSignaturesV0.deserialize(
        reader.buffer.subarray(reader.position),
      );

      // Skip past the CET adaptor signatures we just read
      const cetLength = instance.cetAdaptorSignatures.serialize().length;
      reader.position += cetLength;
    } else {
      instance.cetAdaptorSignatures = new CetAdaptorSignaturesV0();
    }

    instance.refundSignature = reader.readBytes(64);

    // negotiation_fields is now optional as per dlcspecs PR #163
    const hasNegotiationFields = reader.readUInt8();
    if (hasNegotiationFields === 0x01) {
      instance.negotiationFields = NegotiationFields.deserialize(
        getTlv(reader),
      );
    }

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
   * The type for accept_dlc message. accept_dlc = 42780
   */
  public type = DlcAccept.type;

  // New fields as per dlcspecs PR #163
  public protocolVersion: number = PROTOCOL_VERSION; // Default to current protocol version

  // Existing fields
  public tempContractId: Buffer;

  public acceptCollateralSatoshis: bigint;

  public fundingPubKey: Buffer;

  public payoutSPK: Buffer;

  public payoutSerialId: bigint;

  public fundingInputs: FundingInputV0[] = [];

  public changeSPK: Buffer;

  public changeSerialId: bigint;

  public cetAdaptorSignatures: CetAdaptorSignaturesV0;

  public refundSignature: Buffer;

  // negotiation_fields is now optional
  public negotiationFields?: NegotiationFields;

  public batchFundingGroups?: BatchFundingGroup[];

  // Store unknown TLVs for forward compatibility
  public unknownTlvs?: Array<{ type: number; data: Buffer }>;

  /**
   * Get funding, change and payout address from DlcAccept
   * @param network Bitcoin Network
   * @returns {IDlcAcceptAddresses}
   */
  public getAddresses(network: BitcoinNetwork): IDlcAcceptAddresses {
    const fundingSPK = Script.p2wpkhLock(hash160(this.fundingPubKey))
      .serialize()
      .slice(1);
    const fundingAddress = address.fromOutputScript(fundingSPK, network);
    const changeAddress = address.fromOutputScript(this.changeSPK, network);
    const payoutAddress = address.fromOutputScript(this.payoutSPK, network);

    return {
      fundingAddress,
      changeAddress,
      payoutAddress,
    };
  }

  /**
   * Validates correctness of all fields
   * Updated validation rules as per dlcspecs PR #163
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Protocol.md#the-accept_dlc-message
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

    // 3. temporary_contract_id must match the one from offer_dlc
    if (!this.tempContractId || this.tempContractId.length !== 32) {
      throw new Error('tempContractId must be 32 bytes');
    }

    // 4. payout_spk and change_spk must be standard script pubkeys
    try {
      address.fromOutputScript(this.payoutSPK);
    } catch (e) {
      throw new Error('payoutSPK is invalid');
    }

    try {
      address.fromOutputScript(this.changeSPK);
    } catch (e) {
      throw new Error('changeSPK is invalid');
    }

    // 5. funding_pubkey must be a valid secp256k1 pubkey in compressed format
    // https://github.com/bitcoin/bips/blob/master/bip-0137.mediawiki#background-on-ecdsa-signatures

    if (secp256k1.publicKeyVerify(Buffer.from(this.fundingPubKey))) {
      if (this.fundingPubKey[0] != 0x02 && this.fundingPubKey[0] != 0x03) {
        throw new Error('fundingPubKey must be in compressed format');
      }
    } else {
      throw new Error('fundingPubKey is not a valid secp256k1 key');
    }

    // 6. inputSerialId must be unique for each input
    const inputSerialIds = this.fundingInputs.map(
      (input: FundingInputV0) => input.inputSerialId,
    );

    if (new Set(inputSerialIds).size !== inputSerialIds.length) {
      throw new Error('inputSerialIds must be unique');
    }

    // 7. Ensure funding inputs are segwit
    this.fundingInputs.forEach((input: FundingInputV0) => input.validate());

    // 8. validate funding amount
    const fundingAmount = this.fundingInputs.reduce((acc, fundingInput) => {
      const input = fundingInput as FundingInputV0;
      return acc + input.prevTx.outputs[input.prevTxVout].value.sats;
    }, BigInt(0));
    if (this.acceptCollateralSatoshis >= fundingAmount) {
      throw new Error(
        'fundingAmount must be greater than acceptCollateralSatoshis',
      );
    }
  }

  /**
   * Converts accept_dlc to JSON (canonical rust-dlc format)
   */
  public toJSON(): IDlcAcceptJSON {
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

    // Convert raw signature back to DER format for canonical rust-dlc JSON
    const derRefundSignature = secp256k1.signatureExport(this.refundSignature);

    return {
      protocolVersion: this.protocolVersion,
      temporaryContractId: this.tempContractId.toString('hex'),
      acceptCollateral: bigIntToNumber(this.acceptCollateralSatoshis),
      fundingPubkey: this.fundingPubKey.toString('hex'), // lowercase 'k'
      payoutSpk: this.payoutSPK.toString('hex'), // lowercase
      payoutSerialId: bigIntToNumber(this.payoutSerialId),
      fundingInputs: this.fundingInputs.map((input) => input.toJSON()),
      changeSpk: this.changeSPK.toString('hex'), // lowercase
      changeSerialId: bigIntToNumber(this.changeSerialId),
      cetAdaptorSignatures: this.cetAdaptorSignatures.toJSON(),
      refundSignature: Buffer.from(derRefundSignature).toString('hex'),
      negotiationFields: this.negotiationFields?.toJSON(),
    };
  }

  /**
   * Serializes the accept_dlc message into a Buffer
   * Updated serialization format as per dlcspecs PR #163
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);

    // New fields as per dlcspecs PR #163
    writer.writeUInt32BE(this.protocolVersion);
    writer.writeBytes(this.tempContractId);
    writer.writeUInt64BE(this.acceptCollateralSatoshis);
    writer.writeBytes(this.fundingPubKey);
    writer.writeUInt16BE(this.payoutSPK.length);
    writer.writeBytes(this.payoutSPK);
    writer.writeUInt64BE(this.payoutSerialId);

    // Changed from u16 to bigsize as per dlcspecs PR #163
    writer.writeBigSize(this.fundingInputs.length);

    for (const fundingInput of this.fundingInputs) {
      // Use serializeBody() to match rust-dlc behavior - funding inputs in vec are serialized without TLV wrapper
      writer.writeBytes(fundingInput.serializeBody());
    }

    writer.writeUInt16BE(this.changeSPK.length);
    writer.writeBytes(this.changeSPK);
    writer.writeUInt64BE(this.changeSerialId);
    writer.writeBytes(this.cetAdaptorSignatures.serialize());
    writer.writeBytes(this.refundSignature);

    // negotiation_fields is now optional as per dlcspecs PR #163
    if (this.negotiationFields) {
      writer.writeUInt8(0x01); // present
      writer.writeBytes(this.negotiationFields.serialize());
    } else {
      writer.writeUInt8(0x00); // absent
    }

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

  public withoutSigs(): DlcAcceptWithoutSigs {
    return new DlcAcceptWithoutSigs(
      this.protocolVersion,
      this.tempContractId,
      this.acceptCollateralSatoshis,
      this.fundingPubKey,
      this.payoutSPK,
      this.payoutSerialId,
      this.fundingInputs,
      this.changeSPK,
      this.changeSerialId,
      this.negotiationFields,
      this.batchFundingGroups,
    );
  }
}

export class DlcAcceptWithoutSigs {
  constructor(
    readonly protocolVersion: number,
    readonly tempContractId: Buffer,
    readonly acceptCollateralSatoshis: bigint,
    readonly fundingPubKey: Buffer,
    readonly payoutSPK: Buffer,
    readonly payoutSerialId: bigint,
    readonly fundingInputs: FundingInputV0[],
    readonly changeSPK: Buffer,
    readonly changeSerialId: bigint,
    readonly negotiationFields?: NegotiationFields,
    readonly batchFundingGroups?: BatchFundingGroup[],
  ) {}
}

export interface IDlcAcceptJSON {
  protocolVersion: number;
  temporaryContractId: string;
  acceptCollateral: number;
  fundingPubkey: string;
  payoutSpk: string;
  payoutSerialId: number;
  fundingInputs: IFundingInputV0JSON[];
  changeSpk: string;
  changeSerialId: number;
  cetAdaptorSignatures: ICetAdaptorSignaturesV0JSON;
  refundSignature: string;
  negotiationFields?: // Now optional
  | INegotiationFieldsV0JSON
    | INegotiationFieldsV1JSON
    | INegotiationFieldsV2JSON;
}

export interface IDlcAcceptAddresses {
  fundingAddress: string;
  changeAddress: string;
  payoutAddress: string;
}

export class DlcAcceptContainer {
  private accepts: DlcAccept[] = [];

  /**
   * Adds a DlcAccept to the container.
   * @param accept The DlcAccept to add.
   */
  public addAccept(accept: DlcAccept): void {
    this.accepts.push(accept);
  }

  /**
   * Returns all DlcAccepts in the container.
   * @returns An array of DlcAccept instances.
   */
  public getAccepts(): DlcAccept[] {
    return this.accepts;
  }

  /**
   * Serializes all DlcAccepts in the container to a Buffer.
   * @returns A Buffer containing the serialized DlcAccepts.
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    // Write the number of accepts in the container first.
    writer.writeBigSize(this.accepts.length);
    // Serialize each accept and write it.
    this.accepts.forEach((accept) => {
      const serializedAccept = accept.serialize();
      // Optionally, write the length of the serialized accept for easier deserialization.
      writer.writeBigSize(serializedAccept.length);
      writer.writeBytes(serializedAccept);
    });
    return writer.toBuffer();
  }

  /**
   * Deserializes a Buffer into a DlcAcceptContainer with DlcAccepts.
   * @param buf The Buffer to deserialize.
   * @returns A DlcAcceptContainer instance.
   */
  public static deserialize(buf: Buffer, parseCets = true): DlcAcceptContainer {
    const reader = new BufferReader(buf);
    const container = new DlcAcceptContainer();
    const acceptsCount = reader.readBigSize();
    for (let i = 0; i < acceptsCount; i++) {
      const acceptLength = reader.readBigSize();
      const acceptBuf = reader.readBytes(Number(acceptLength));
      const accept = DlcAccept.deserialize(acceptBuf, parseCets);
      container.addAccept(accept);
    }
    return container;
  }
}
