import { Script, Sequence, Tx } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter, StreamReader } from '@node-dlc/bufio';
import { hash160 } from '@node-dlc/crypto';
import { BitcoinNetwork } from 'bitcoin-networks';
import { address } from 'bitcoinjs-lib';
import secp256k1 from 'secp256k1';

import { MessageType, PROTOCOL_VERSION } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv, skipTlv } from '../serialize/getTlv';
import { bigIntToNumber, toBigInt } from '../util';
import { BatchFundingGroup, IBatchFundingGroupJSON } from './BatchFundingGroup';
import {
  CetAdaptorSignatures,
  ICetAdaptorSignaturesJSON,
} from './CetAdaptorSignatures';
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
  public static type = MessageType.DlcAccept;

  /**
   * Creates a DlcAccept from JSON data (e.g., from test vectors)
   * Handles both our internal format and external test vector formats
   * @param json JSON object representing a DLC accept
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
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
    instance.temporaryContractId = Buffer.from(
      json.temporaryContractId ||
        json.tempContractId ||
        json.temporary_contract_id,
      'hex',
    );

    instance.acceptCollateral = toBigInt(
      json.acceptCollateral ||
        json.acceptCollateralSatoshis ||
        json.accept_collateral,
    );

    // Handle field name variations between formats
    instance.fundingPubkey = Buffer.from(
      json.fundingPubkey || json.fundingPubKey || json.funding_pubkey,
      'hex',
    );
    instance.payoutSpk = Buffer.from(
      json.payoutSpk || json.payoutSPK || json.payout_spk,
      'hex',
    );
    instance.payoutSerialId = toBigInt(
      json.payoutSerialId || json.payout_serial_id,
    );

    instance.changeSpk = Buffer.from(
      json.changeSpk || json.changeSPK || json.change_spk,
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
  ): CetAdaptorSignatures {
    const instance = new CetAdaptorSignatures();

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
    return NegotiationFields.fromJSON(negotiationJson);
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
    instance.temporaryContractId = reader.readBytes(32);
    instance.acceptCollateral = reader.readUInt64BE();
    instance.fundingPubkey = reader.readBytes(33);
    const payoutSpkLen = reader.readUInt16BE();
    instance.payoutSpk = reader.readBytes(payoutSpkLen);
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

    const changeSpkLen = reader.readUInt16BE();
    instance.changeSpk = reader.readBytes(changeSpkLen);
    instance.changeSerialId = reader.readUInt64BE();

    if (parseCets) {
      // Read CET adaptor signatures directly to match serialize format (no TLV wrapping)
      instance.cetAdaptorSignatures = CetAdaptorSignatures.deserialize(
        reader.buffer.subarray(reader.position),
      );

      // Skip past the CET adaptor signatures we just read
      const cetLength = instance.cetAdaptorSignatures.serialize().length;
      reader.position += cetLength;
    } else {
      instance.cetAdaptorSignatures = new CetAdaptorSignatures();
    }

    instance.refundSignature = reader.readBytes(64);

    // negotiation_fields is now optional as per dlcspecs PR #163
    // Check if there's enough data left for the new format fields (backward compatibility)
    // The old format ends exactly after refundSignature. If there's more data, it should be new format.
    const remainingBytes = reader.buffer.length - reader.position;

    if (remainingBytes > 0) {
      // Only try to parse new fields if we have a reasonable amount of extra data
      // A single stray byte is likely not valid new format data
      if (remainingBytes >= 1) {
        try {
          const hasNegotiationFields = reader.readUInt8();
          if (hasNegotiationFields === 0x01) {
            instance.negotiationFields = NegotiationFields.deserialize(
              getTlv(reader),
            );
          }

          // Parse TLV stream as per dlcspecs PR #163
          // Only continue if there's still data left after the hasNegotiationFields flag
          while (reader.position < reader.buffer.length) {
            const buf = getTlv(reader);
            const tlvReader = new BufferReader(buf);
            const { type } = deserializeTlv(tlvReader);

            switch (Number(type)) {
              case MessageType.BatchFundingGroup:
                if (!instance.batchFundingGroups) {
                  instance.batchFundingGroups = [];
                }
                instance.batchFundingGroups.push(
                  BatchFundingGroup.deserialize(buf),
                );
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
        } catch (error) {
          // If parsing new format fails, assume it's old format and ignore the extra bytes
          // This provides backward compatibility for malformed or old format data
          // Silently ignore parsing errors for backward compatibility
        }
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
  public temporaryContractId: Buffer;

  public acceptCollateral: bigint;

  public fundingPubkey: Buffer;

  public payoutSpk: Buffer;

  public payoutSerialId: bigint;

  public fundingInputs: FundingInputV0[] = [];

  public changeSpk: Buffer;

  public changeSerialId: bigint;

  public cetAdaptorSignatures: CetAdaptorSignatures;

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
    const fundingSPK = Script.p2wpkhLock(hash160(this.fundingPubkey))
      .serialize()
      .slice(1);
    const fundingAddress = address.fromOutputScript(fundingSPK, network);
    const changeAddress = address.fromOutputScript(this.changeSpk, network);
    const payoutAddress = address.fromOutputScript(this.payoutSpk, network);

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
    if (!this.temporaryContractId || this.temporaryContractId.length !== 32) {
      throw new Error('temporaryContractId must be 32 bytes');
    }

    // 4. payout_spk and change_spk must be standard script pubkeys
    try {
      address.fromOutputScript(this.payoutSpk);
    } catch (e) {
      throw new Error('payoutSpk is invalid');
    }

    try {
      address.fromOutputScript(this.changeSpk);
    } catch (e) {
      throw new Error('changeSpk is invalid');
    }

    // 5. funding_pubkey must be a valid secp256k1 pubkey in compressed format
    // https://github.com/bitcoin/bips/blob/master/bip-0137.mediawiki#background-on-ecdsa-signatures

    if (secp256k1.publicKeyVerify(Buffer.from(this.fundingPubkey))) {
      if (this.fundingPubkey[0] != 0x02 && this.fundingPubkey[0] != 0x03) {
        throw new Error('fundingPubkey must be in compressed format');
      }
    } else {
      throw new Error('fundingPubkey is not a valid secp256k1 key');
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
    if (this.acceptCollateral >= fundingAmount) {
      throw new Error('fundingAmount must be greater than acceptCollateral');
    }
  }

  /**
   * Converts accept_dlc to JSON (canonical rust-dlc format)
   */
  public toJSON(): IDlcAcceptJSON {
    // Convert raw signature back to DER format for canonical rust-dlc JSON
    const derRefundSignature = secp256k1.signatureExport(this.refundSignature);

    return {
      protocolVersion: this.protocolVersion,
      temporaryContractId: this.temporaryContractId.toString('hex'),
      acceptCollateral: bigIntToNumber(this.acceptCollateral),
      fundingPubkey: this.fundingPubkey.toString('hex'), // lowercase 'k'
      payoutSpk: this.payoutSpk.toString('hex'), // lowercase
      payoutSerialId: bigIntToNumber(this.payoutSerialId),
      fundingInputs: this.fundingInputs.map((input) => input.toJSON()),
      changeSpk: this.changeSpk.toString('hex'), // lowercase
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
    writer.writeBytes(this.temporaryContractId);
    writer.writeUInt64BE(this.acceptCollateral);
    writer.writeBytes(this.fundingPubkey);
    writer.writeUInt16BE(this.payoutSpk.length);
    writer.writeBytes(this.payoutSpk);
    writer.writeUInt64BE(this.payoutSerialId);

    // Changed from u16 to bigsize as per dlcspecs PR #163
    writer.writeBigSize(this.fundingInputs.length);

    for (const fundingInput of this.fundingInputs) {
      // Use serializeBody() to match rust-dlc behavior - funding inputs in vec are serialized without TLV wrapper
      writer.writeBytes(fundingInput.serializeBody());
    }

    writer.writeUInt16BE(this.changeSpk.length);
    writer.writeBytes(this.changeSpk);
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
      this.temporaryContractId,
      this.acceptCollateral,
      this.fundingPubkey,
      this.payoutSpk,
      this.payoutSerialId,
      this.fundingInputs,
      this.changeSpk,
      this.changeSerialId,
      this.negotiationFields,
      this.batchFundingGroups,
    );
  }
}

export class DlcAcceptWithoutSigs {
  constructor(
    readonly protocolVersion: number,
    readonly temporaryContractId: Buffer,
    readonly acceptCollateral: bigint,
    readonly fundingPubkey: Buffer,
    readonly payoutSpk: Buffer,
    readonly payoutSerialId: bigint,
    readonly fundingInputs: FundingInputV0[],
    readonly changeSpk: Buffer,
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
  cetAdaptorSignatures: ICetAdaptorSignaturesJSON;
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
