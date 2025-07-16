import { Script } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter } from '@node-dlc/bufio';
import { hash160 } from '@node-dlc/crypto';
import { BitcoinNetwork } from 'bitcoin-networks';
import { address } from 'bitcoinjs-lib';
import secp256k1 from 'secp256k1';

import { MessageType, PROTOCOL_VERSION } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import { bigIntToNumber, toBigInt } from '../util';
import { BatchFundingGroup, IBatchFundingGroupJSON } from './BatchFundingGroup';
import {
  ContractInfo,
  IDisjointContractInfoJSON,
  ISingleContractInfoJSON,
} from './ContractInfo';
import { IDlcMessage } from './DlcMessage';
import { FundingInput, IFundingInputJSON } from './FundingInput';
import {
  IOrderIrcInfoJSON,
  OrderIrcInfo,
  OrderIrcInfoV0,
} from './OrderIrcInfo';
import {
  IOrderMetadataJSON,
  OrderMetadata,
  OrderMetadataV0,
} from './OrderMetadata';
import { IOrderPositionInfoJSON, OrderPositionInfo } from './OrderPositionInfo';

export const LOCKTIME_THRESHOLD = 500000000;

/**
 * DlcOffer message contains information about a node and indicates its
 * desire to enter into a new contract. This is the first step toward
 * creating the funding transaction and CETs.
 * Updated to support dlcspecs PR #163 format.
 */
export class DlcOffer implements IDlcMessage {
  public static type = MessageType.DlcOffer;

  /**
   * Creates a DlcOffer from JSON data (e.g., from test vectors)
   * Handles both our internal format and external test vector formats
   * @param json JSON object representing a DLC offer
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): DlcOffer {
    const instance = new DlcOffer();

    // Basic fields with field name variations
    instance.protocolVersion =
      json.protocolVersion || json.protocol_version || PROTOCOL_VERSION;
    instance.contractFlags = Buffer.from(
      json.contractFlags || json.contract_flags || '00',
      'hex',
    );
    instance.chainHash = Buffer.from(json.chainHash || json.chain_hash, 'hex');
    instance.temporaryContractId = Buffer.from(
      json.temporaryContractId || json.temporary_contract_id,
      'hex',
    );

    instance.fundingPubkey = Buffer.from(
      json.fundingPubkey || json.fundingPubKey || json.funding_pubkey,
      'hex',
    );
    instance.payoutSpk = Buffer.from(
      json.payoutSpk || json.payoutSPK || json.payout_spk,
      'hex',
    );

    // Use toBigInt helper to handle BigInt values from json-bigint
    instance.payoutSerialId = toBigInt(
      json.payoutSerialId || json.payout_serial_id,
    );

    instance.offerCollateral = toBigInt(
      json.offerCollateral ||
        json.offerCollateralSatoshis ||
        json.offer_collateral,
    );

    instance.changeSpk = Buffer.from(
      json.changeSpk || json.changeSPK || json.change_spk,
      'hex',
    );
    instance.changeSerialId = toBigInt(
      json.changeSerialId || json.change_serial_id,
    );
    instance.fundOutputSerialId = toBigInt(
      json.fundOutputSerialId || json.fund_output_serial_id,
    );
    instance.feeRatePerVb = toBigInt(json.feeRatePerVb || json.fee_rate_per_vb);
    instance.cetLocktime = json.cetLocktime || json.cet_locktime || 0;
    instance.refundLocktime = json.refundLocktime || json.refund_locktime || 0;

    // Use ContractInfo.fromJSON() - proper delegation
    instance.contractInfo = ContractInfo.fromJSON(
      json.contractInfo || json.contract_info,
    );

    // Use FundingInput.fromJSON() for each funding input - proper delegation
    instance.fundingInputs = (json.fundingInputs || json.funding_inputs || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((inputJson: any) => FundingInput.fromJSON(inputJson));

    return instance;
  }

  /**
   * Deserializes an offer_dlc message with backward compatibility
   * Detects old format (without protocol_version) vs new format (with protocol_version)
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcOffer {
    const instance = new DlcOffer();
    const reader = new BufferReader(buf);

    const type = reader.readUInt16BE(); // read type

    // Validate type matches expected DlcOffer type
    if (type !== MessageType.DlcOffer) {
      throw new Error(
        `Invalid message type. Expected ${MessageType.DlcOffer}, got ${type}`,
      );
    }

    // BACKWARD COMPATIBILITY: Detect old vs new format
    // New format: [type][protocol_version: 4 bytes][contract_flags: 1 byte][chain_hash: 32 bytes]
    // Old format: [type][contract_flags: 1 byte][chain_hash: 32 bytes]

    const nextBytes = reader.buffer.subarray(
      reader.position,
      reader.position + 5,
    );
    const possibleProtocolVersion = nextBytes.readUInt32BE(0);
    const possibleContractFlags = nextBytes.readUInt8(4);

    // Heuristic: protocol_version should be 1, contract_flags should be 0
    // If first 4 bytes are reasonable protocol version (1-10) and next byte is 0, assume new format
    const isNewFormat =
      possibleProtocolVersion >= 1 &&
      possibleProtocolVersion <= 10 &&
      possibleContractFlags === 0;

    if (isNewFormat) {
      // New format with protocol_version
      instance.protocolVersion = reader.readUInt32BE();
      instance.contractFlags = reader.readBytes(1);
    } else {
      // Old format without protocol_version
      instance.protocolVersion = 1; // Default to version 1
      instance.contractFlags = reader.readBytes(1);
    }

    instance.chainHash = reader.readBytes(32);
    instance.temporaryContractId = reader.readBytes(32);

    // ContractInfo is serialized as sibling type in dlcspecs PR #163 format
    instance.contractInfo = ContractInfo.deserialize(
      reader.buffer.subarray(reader.position),
    );
    // Skip past the ContractInfo we just read
    const contractInfoLength = instance.contractInfo.serialize().length;
    reader.position += contractInfoLength;
    instance.fundingPubkey = reader.readBytes(33);
    const payoutSpkLen = reader.readUInt16BE();
    instance.payoutSpk = reader.readBytes(payoutSpkLen);
    instance.payoutSerialId = reader.readUInt64BE();
    instance.offerCollateral = reader.readUInt64BE();

    // Changed from u16 to bigsize as per dlcspecs PR #163
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

    const changeSpkLen = reader.readUInt16BE();
    instance.changeSpk = reader.readBytes(changeSpkLen);
    instance.changeSerialId = reader.readUInt64BE();
    instance.fundOutputSerialId = reader.readUInt64BE();
    instance.feeRatePerVb = reader.readUInt64BE();
    instance.cetLocktime = reader.readUInt32BE();
    instance.refundLocktime = reader.readUInt32BE();

    // Parse TLV stream as per dlcspecs PR #163
    while (!reader.eof) {
      const buf = getTlv(reader);
      const tlvReader = new BufferReader(buf);
      const { type } = deserializeTlv(tlvReader);

      switch (Number(type)) {
        case MessageType.OrderMetadataV0:
          instance.metadata = OrderMetadataV0.deserialize(buf);
          break;
        case MessageType.OrderIrcInfoV0:
          instance.ircInfo = OrderIrcInfoV0.deserialize(buf);
          break;
        case MessageType.OrderPositionInfo:
          instance.positionInfo = OrderPositionInfo.deserialize(buf);
          break;
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

    // Auto-detect single funded DLCs
    if (
      instance.contractInfo.getTotalCollateral() === instance.offerCollateral
    ) {
      instance.singleFunded = true;
    }

    return instance;
  }

  /**
   * The type for offer_dlc message. offer_dlc = 42778
   */
  public type = DlcOffer.type;

  // New fields as per dlcspecs PR #163
  public protocolVersion: number = PROTOCOL_VERSION; // Default to current protocol version

  public temporaryContractId: Buffer; // New field for contract identification

  // Existing fields
  public contractFlags: Buffer;

  public chainHash: Buffer;

  public contractInfo: ContractInfo;

  public fundingPubkey: Buffer;

  public payoutSpk: Buffer;

  public payoutSerialId: bigint;

  public offerCollateral: bigint;

  public fundingInputs: FundingInput[] = [];

  public changeSpk: Buffer;

  public changeSerialId: bigint;

  public fundOutputSerialId: bigint;

  public feeRatePerVb: bigint;

  public cetLocktime: number;

  public refundLocktime: number;

  public metadata?: OrderMetadata;

  public ircInfo?: OrderIrcInfo;

  public positionInfo?: OrderPositionInfo;

  public batchFundingGroups?: BatchFundingGroup[];

  // Store unknown TLVs for forward compatibility
  public unknownTlvs?: Array<{ type: number; data: Buffer }>;

  /**
   * Flag to indicate if this is a single funded DLC
   * In single funded DLCs, totalCollateral equals offerCollateral
   */
  public singleFunded = false;

  /**
   * Marks this DLC offer as single funded and validates that collateral amounts are correct
   * @throws Will throw an error if totalCollateral doesn't equal offerCollateral
   */
  public markAsSingleFunded(): void {
    const totalCollateral = this.contractInfo.getTotalCollateral();
    if (totalCollateral !== this.offerCollateral) {
      throw new Error(
        `Cannot mark as single funded: totalCollateral (${totalCollateral}) must equal offerCollateral (${this.offerCollateral})`,
      );
    }
    this.singleFunded = true;
  }

  /**
   * Checks if this DLC offer is single funded (totalCollateral == offerCollateral)
   * @returns True if this is a single funded DLC
   */
  public isSingleFunded(): boolean {
    return (
      this.singleFunded ||
      this.contractInfo.getTotalCollateral() === this.offerCollateral
    );
  }

  /**
   * Get funding, change and payout address from DlcOffer
   * @param network Bitcoin Network
   * @returns {IDlcOfferAddresses}
   */
  public getAddresses(network: BitcoinNetwork): IDlcOfferAddresses {
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
   * Validates correctness of all fields in DlcOffer
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

    // 3. temporary_contract_id validation
    if (!this.temporaryContractId || this.temporaryContractId.length !== 32) {
      throw new Error('temporaryContractId must be 32 bytes');
    }

    // 4. contract_flags field is ignored
    // 5. chain_hash must be validated as input by end user
    // 6. payout_spk and change_spk must be standard script pubkeys

    try {
      address.fromOutputScript(this.payoutSpk);
    } catch (e) {
      throw new Error('DlcOffer payoutSpk is invalid');
    }

    try {
      address.fromOutputScript(this.changeSpk);
    } catch (e) {
      throw new Error('DlcOffer changeSpk is invalid');
    }

    // 7. funding_pubkey must be a valid secp256k1 pubkey in compressed format
    // https://github.com/bitcoin/bips/blob/master/bip-0137.mediawiki#background-on-ecdsa-signatures

    if (secp256k1.publicKeyVerify(Buffer.from(this.fundingPubkey))) {
      if (this.fundingPubkey[0] != 0x02 && this.fundingPubkey[0] != 0x03) {
        throw new Error('fundingPubkey must be in compressed format');
      }
    } else {
      throw new Error('fundingPubkey is not a valid secp256k1 key');
    }

    // 8. offer_collateral must be greater than or equal to 1000
    if (this.offerCollateral < 1000) {
      throw new Error('offer_collateral must be greater than or equal to 1000');
    }

    if (this.cetLocktime < 0) {
      throw new Error('cet_locktime must be greater than or equal to 0');
    }

    if (this.refundLocktime < 0) {
      throw new Error('refund_locktime must be greater than or equal to 0');
    }

    // 9. cet_locktime and refund_locktime must either both be unix timestamps, or both be block heights.
    // https://en.bitcoin.it/wiki/NLockTime
    // https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki#detailed-specification
    // https://github.com/bitcoin/bitcoin/blob/master/src/script/script.h#L39
    if (
      !(
        (this.cetLocktime < LOCKTIME_THRESHOLD &&
          this.refundLocktime < LOCKTIME_THRESHOLD) ||
        (this.cetLocktime >= LOCKTIME_THRESHOLD &&
          this.refundLocktime >= LOCKTIME_THRESHOLD)
      )
    ) {
      throw new Error('cetLocktime and refundLocktime must be in same units');
    }

    // 10. cetLocktime must be less than refundLocktime
    if (this.cetLocktime >= this.refundLocktime) {
      throw new Error('cetLocktime must be less than refundLocktime');
    }

    // 11. inputSerialId must be unique for each input

    const inputSerialIds = this.fundingInputs.map(
      (input: FundingInput) => input.inputSerialId,
    );

    if (new Set(inputSerialIds).size !== inputSerialIds.length) {
      throw new Error('inputSerialIds must be unique');
    }

    // 12. changeSerialId and fundOutputSerialID must be different

    if (this.changeSerialId === this.fundOutputSerialId) {
      throw new Error(
        'changeSerialId and fundOutputSerialId must be different',
      );
    }

    // validate contractInfo
    this.contractInfo.validate();

    // totalCollateral should be > offerCollateral (logical validation)
    // Exception: for single funded DLCs, totalCollateral == offerCollateral is allowed
    if (this.isSingleFunded()) {
      if (this.contractInfo.getTotalCollateral() !== this.offerCollateral) {
        throw new Error(
          'For single funded DLCs, totalCollateral must equal offerCollateral',
        );
      }
    } else {
      if (this.contractInfo.getTotalCollateral() <= this.offerCollateral) {
        throw new Error(
          'totalCollateral should be greater than offerCollateral',
        );
      }
    }

    // validate funding amount
    const fundingAmount = this.fundingInputs.reduce((acc, fundingInput) => {
      const input = fundingInput as FundingInput;
      return acc + input.prevTx.outputs[input.prevTxVout].value.sats;
    }, BigInt(0));

    if (this.isSingleFunded()) {
      // For single funded DLCs, funding amount must cover the full total collateral plus fees
      if (fundingAmount < this.contractInfo.getTotalCollateral()) {
        throw new Error(
          'For single funded DLCs, fundingAmount must be at least totalCollateral',
        );
      }
    } else {
      // For regular DLCs, funding amount must be greater than offer collateral
      if (this.offerCollateral >= fundingAmount) {
        throw new Error('fundingAmount must be greater than offerCollateral');
      }
    }
  }

  /**
   * Converts dlc_offer to JSON (canonical rust-dlc format)
   */
  public toJSON(): IDlcOfferJSON {
    const tlvs = [];

    if (this.metadata) tlvs.push(this.metadata.toJSON());
    if (this.ircInfo) tlvs.push(this.ircInfo.toJSON());
    if (this.positionInfo) tlvs.push(this.positionInfo.toJSON());
    if (this.batchFundingGroups)
      this.batchFundingGroups.forEach((fundingInfo) =>
        tlvs.push(fundingInfo.toJSON()),
      );

    // Include unknown TLVs for debugging
    if (this.unknownTlvs) {
      this.unknownTlvs.forEach((tlv) =>
        tlvs.push({ type: tlv.type, data: tlv.data.toString('hex') }),
      );
    }

    // Return canonical rust-dlc format only
    return {
      protocolVersion: this.protocolVersion,
      temporaryContractId: this.temporaryContractId.toString('hex'),
      contractFlags: Number(this.contractFlags[0]),
      chainHash: this.chainHash.toString('hex'),
      contractInfo: this.contractInfo.toJSON(),
      fundingPubkey: this.fundingPubkey.toString('hex'), // lowercase 'k'
      payoutSpk: this.payoutSpk.toString('hex'), // lowercase
      payoutSerialId: bigIntToNumber(this.payoutSerialId),
      offerCollateral: bigIntToNumber(this.offerCollateral), // no "Satoshis"
      fundingInputs: this.fundingInputs.map((input) => input.toJSON()),
      changeSpk: this.changeSpk.toString('hex'), // lowercase
      changeSerialId: bigIntToNumber(this.changeSerialId),
      fundOutputSerialId: bigIntToNumber(this.fundOutputSerialId),
      feeRatePerVb: bigIntToNumber(this.feeRatePerVb),
      cetLocktime: this.cetLocktime,
      refundLocktime: this.refundLocktime,
    }; // Allow different field names from interface
  }

  /**
   * Serializes the offer_dlc message into a Buffer
   * Updated serialization format as per dlcspecs PR #163
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);

    // New fields as per dlcspecs PR #163
    writer.writeUInt32BE(this.protocolVersion);
    writer.writeBytes(this.contractFlags);
    writer.writeBytes(this.chainHash);
    writer.writeBytes(this.temporaryContractId); // New field

    writer.writeBytes(this.contractInfo.serialize());
    writer.writeBytes(this.fundingPubkey);
    writer.writeUInt16BE(this.payoutSpk.length);
    writer.writeBytes(this.payoutSpk);
    writer.writeUInt64BE(this.payoutSerialId);
    writer.writeUInt64BE(this.offerCollateral);

    // Changed from u16 to bigsize as per dlcspecs PR #163
    writer.writeBigSize(this.fundingInputs.length);

    for (const fundingInput of this.fundingInputs) {
      // Use serializeBody() to match rust-dlc behavior - funding inputs in vec are serialized without TLV wrapper
      writer.writeBytes(fundingInput.serializeBody());
    }

    writer.writeUInt16BE(this.changeSpk.length);
    writer.writeBytes(this.changeSpk);
    writer.writeUInt64BE(this.changeSerialId);
    writer.writeUInt64BE(this.fundOutputSerialId);
    writer.writeUInt64BE(this.feeRatePerVb);
    writer.writeUInt32BE(this.cetLocktime);
    writer.writeUInt32BE(this.refundLocktime);

    // TLV stream as per dlcspecs PR #163
    if (this.metadata) writer.writeBytes(this.metadata.serialize());
    if (this.ircInfo) writer.writeBytes(this.ircInfo.serialize());
    if (this.positionInfo) writer.writeBytes(this.positionInfo.serialize());
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

export interface IDlcOfferJSON {
  type?: number; // Made optional for rust-dlc compatibility
  protocolVersion: number;
  temporaryContractId: string;
  contractFlags: number;
  chainHash: string;
  contractInfo: ISingleContractInfoJSON | IDisjointContractInfoJSON;
  fundingPubkey: string;
  payoutSpk: string;
  payoutSerialId: number;
  offerCollateral: number;
  fundingInputs: IFundingInputJSON[];
  changeSpk: string;
  changeSerialId: number;
  fundOutputSerialId: number;
  feeRatePerVb: number;
  cetLocktime: number;
  refundLocktime: number;
  serialized?: string; // Made optional - hex serialization for compatibility testing
  tlvs?: (
    | IOrderMetadataJSON
    | IOrderIrcInfoJSON
    | IOrderPositionInfoJSON
    | IBatchFundingGroupJSON
    | unknown
  )[]; // Made optional - for unknown TLVs
}

export interface IDlcOfferAddresses {
  fundingAddress: string;
  changeAddress: string;
  payoutAddress: string;
}

export class DlcOfferContainer {
  private offers: DlcOffer[] = [];

  /**
   * Adds a DlcOffer to the container.
   * @param offer The DlcOffer to add.
   */
  public addOffer(offer: DlcOffer): void {
    this.offers.push(offer);
  }

  /**
   * Returns all DlcOffers in the container.
   * @returns An array of DlcOffer instances.
   */
  public getOffers(): DlcOffer[] {
    return this.offers;
  }

  /**
   * Serializes all DlcOffers in the container to a Buffer.
   * @returns A Buffer containing the serialized DlcOffers.
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    // Write the number of offers in the container first.
    writer.writeBigSize(this.offers.length);
    // Serialize each offer and write it.
    this.offers.forEach((offer) => {
      const serializedOffer = offer.serialize();
      // Optionally, write the length of the serialized offer for easier deserialization.
      writer.writeBigSize(serializedOffer.length);
      writer.writeBytes(serializedOffer);
    });
    return writer.toBuffer();
  }

  /**
   * Deserializes a Buffer into a DlcOfferContainer with DlcOffers.
   * @param buf The Buffer to deserialize.
   * @returns A DlcOfferContainer instance.
   */
  public static deserialize(buf: Buffer): DlcOfferContainer {
    const reader = new BufferReader(buf);
    const container = new DlcOfferContainer();
    const offersCount = reader.readBigSize();
    for (let i = 0; i < offersCount; i++) {
      // Optionally, read the length of the serialized offer if it was written during serialization.
      const offerLength = reader.readBigSize();
      const offerBuf = reader.readBytes(Number(offerLength));
      const offer = DlcOffer.deserialize(offerBuf);
      container.addOffer(offer);
    }
    return container;
  }
}
