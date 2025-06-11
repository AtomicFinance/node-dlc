import { Script, Sequence, Tx } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter, StreamReader } from '@node-dlc/bufio';
import { hash160 } from '@node-dlc/crypto';
import { BitcoinNetwork } from 'bitcoin-networks';
import { address } from 'bitcoinjs-lib';
import secp256k1 from 'secp256k1';

import { MessageType, PROTOCOL_VERSION } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import { BatchFundingGroup, IBatchFundingGroupJSON } from './BatchFundingGroup';
import { ContractDescriptor, EnumeratedDescriptor } from './ContractDescriptor';
import {
  ContractInfo,
  DisjointContractInfo,
  IDisjointContractInfoJSON,
  ISingleContractInfoJSON,
  SingleContractInfo,
} from './ContractInfo';
import { IDlcMessage } from './DlcMessage';
import { EnumEventDescriptorV0 } from './EventDescriptor';
import {
  FundingInput,
  FundingInputV0,
  IFundingInputV0JSON,
} from './FundingInput';
import { OracleAnnouncementV0 } from './OracleAnnouncementV0';
import { OracleEventV0 } from './OracleEventV0';
import { MultiOracleInfo, OracleInfo, SingleOracleInfo } from './OracleInfoV0';
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
  public static type = MessageType.DlcOfferV0;

  /**
   * Creates a DlcOffer from JSON data (e.g., from test vectors)
   * Handles both our internal format and external test vector formats
   * @param json JSON object representing a DLC offer
   */
  public static fromJSON(json: any): DlcOffer {
    const instance = new DlcOffer();

    // Helper function to safely convert to BigInt from various input types
    const toBigInt = (value: any): bigint => {
      if (value === null || value === undefined) return BigInt(0);
      if (typeof value === 'bigint') return value;
      if (typeof value === 'string') return BigInt(value);
      if (typeof value === 'number') return BigInt(value);
      return BigInt(0);
    };

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

    instance.fundingPubKey = Buffer.from(
      json.fundingPubKey || json.fundingPubkey || json.funding_pubkey,
      'hex',
    );
    instance.payoutSPK = Buffer.from(
      json.payoutSPK || json.payoutSpk || json.payout_spk,
      'hex',
    );

    // Use toBigInt helper to handle BigInt values from json-bigint
    instance.payoutSerialId = toBigInt(
      json.payoutSerialId || json.payout_serial_id,
    );

    instance.offerCollateralSatoshis = toBigInt(
      json.offerCollateralSatoshis ||
        json.offerCollateral ||
        json.offer_collateral,
    );

    instance.changeSPK = Buffer.from(
      json.changeSPK || json.changeSpk || json.change_spk,
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
    instance.fundingInputs = (
      json.fundingInputs ||
      json.funding_inputs ||
      []
    ).map((inputJson: any) => FundingInput.fromJSON(inputJson));

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

    // Validate type matches expected DlcOfferV0 type
    if (type !== MessageType.DlcOfferV0) {
      throw new Error(
        `Invalid message type. Expected ${MessageType.DlcOfferV0}, got ${type}`,
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
    instance.fundingPubKey = reader.readBytes(33);
    const payoutSPKLen = reader.readUInt16BE();
    instance.payoutSPK = reader.readBytes(payoutSPKLen);
    instance.payoutSerialId = reader.readUInt64BE();
    instance.offerCollateralSatoshis = reader.readUInt64BE();

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
        case MessageType.OrderPositionInfoV0:
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

  public fundingPubKey: Buffer;

  public payoutSPK: Buffer;

  public payoutSerialId: bigint;

  public offerCollateralSatoshis: bigint;

  public fundingInputs: FundingInput[] = [];

  public changeSPK: Buffer;

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
   * Get funding, change and payout address from DlcOffer
   * @param network Bitcoin Network
   * @returns {IDlcOfferAddresses}
   */
  public getAddresses(network: BitcoinNetwork): IDlcOfferAddresses {
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
      address.fromOutputScript(this.payoutSPK);
    } catch (e) {
      throw new Error('DlcOffer payoutSPK is invalid');
    }

    try {
      address.fromOutputScript(this.changeSPK);
    } catch (e) {
      throw new Error('DlcOffer changeSPK is invalid');
    }

    // 7. funding_pubkey must be a valid secp256k1 pubkey in compressed format
    // https://github.com/bitcoin/bips/blob/master/bip-0137.mediawiki#background-on-ecdsa-signatures

    if (secp256k1.publicKeyVerify(Buffer.from(this.fundingPubKey))) {
      if (this.fundingPubKey[0] != 0x02 && this.fundingPubKey[0] != 0x03) {
        throw new Error('fundingPubKey must be in compressed format');
      }
    } else {
      throw new Error('fundingPubKey is not a valid secp256k1 key');
    }

    // 8. offer_collateral_satoshis must be greater than or equal to 1000
    if (this.offerCollateralSatoshis < 1000) {
      throw new Error(
        'offer_collateral_satoshis must be greater than or equal to 1000',
      );
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
      (input: FundingInputV0) => input.inputSerialId,
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
    if (
      this.contractInfo.getTotalCollateral() <= this.offerCollateralSatoshis
    ) {
      throw new Error('totalCollateral should be greater than offerCollateral');
    }

    // validate funding amount
    const fundingAmount = this.fundingInputs.reduce((acc, fundingInput) => {
      const input = fundingInput as FundingInputV0;
      return acc + input.prevTx.outputs[input.prevTxVout].value.sats;
    }, BigInt(0));
    if (this.offerCollateralSatoshis >= fundingAmount) {
      throw new Error(
        'fundingAmount must be greater than offerCollateralSatoshis',
      );
    }
  }

  /**
   * Converts dlc_offer to JSON (includes serialized hex for compatibility testing)
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

    return {
      type: this.type,
      protocolVersion: this.protocolVersion,
      temporaryContractId: this.temporaryContractId.toString('hex'),
      contractFlags: this.contractFlags.toString('hex'),
      chainHash: this.chainHash.toString('hex'),
      contractInfo: this.contractInfo.toJSON(),
      fundingPubKey: this.fundingPubKey.toString('hex'),
      payoutSPK: this.payoutSPK.toString('hex'),
      payoutSerialId: Number(this.payoutSerialId),
      offerCollateralSatoshis: Number(this.offerCollateralSatoshis),
      fundingInputs: this.fundingInputs.map((input) => input.toJSON()),
      changeSPK: this.changeSPK.toString('hex'),
      changeSerialId: Number(this.changeSerialId),
      fundOutputSerialId: Number(this.fundOutputSerialId),
      feeRatePerVb: Number(this.feeRatePerVb),
      cetLocktime: this.cetLocktime,
      refundLocktime: this.refundLocktime,
      serialized: this.serialize().toString('hex'), // Add serialized hex for compatibility testing
      tlvs,
    };
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
    writer.writeBytes(this.fundingPubKey);
    writer.writeUInt16BE(this.payoutSPK.length);
    writer.writeBytes(this.payoutSPK);
    writer.writeUInt64BE(this.payoutSerialId);
    writer.writeUInt64BE(this.offerCollateralSatoshis);

    // Changed from u16 to bigsize as per dlcspecs PR #163
    writer.writeBigSize(this.fundingInputs.length);

    for (const fundingInput of this.fundingInputs) {
      // Use serializeBody() to match rust-dlc behavior - funding inputs in vec are serialized without TLV wrapper
      writer.writeBytes(fundingInput.serializeBody());
    }

    writer.writeUInt16BE(this.changeSPK.length);
    writer.writeBytes(this.changeSPK);
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
  type: number;
  protocolVersion: number;
  temporaryContractId: string;
  contractFlags: string;
  chainHash: string;
  contractInfo: ISingleContractInfoJSON | IDisjointContractInfoJSON;
  fundingPubKey: string;
  payoutSPK: string;
  payoutSerialId: number;
  offerCollateralSatoshis: number;
  fundingInputs: IFundingInputV0JSON[];
  changeSPK: string;
  changeSerialId: number;
  fundOutputSerialId: number;
  feeRatePerVb: number;
  cetLocktime: number;
  refundLocktime: number;
  serialized: string; // Hex serialization for compatibility testing
  tlvs: (
    | IOrderMetadataJSON
    | IOrderIrcInfoJSON
    | IOrderPositionInfoJSON
    | IBatchFundingGroupJSON
    | any
  )[]; // For unknown TLVs
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
