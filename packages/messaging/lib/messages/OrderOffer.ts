import { BufferReader, BufferWriter } from '@node-dlc/bufio';
import { BitcoinNetwork } from 'bitcoin-networks';

import { IOrderMetadataJSON } from '..';
import { MessageType, PROTOCOL_VERSION } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import { bigIntToNumber, toBigInt } from '../util';
import { BatchFundingGroup, IBatchFundingGroupJSON } from './BatchFundingGroup';
import {
  ContractInfo,
  IContractInfoV0JSON,
  IContractInfoV1JSON,
} from './ContractInfo';
import { IDlcMessage } from './DlcMessage';
import {
  IOrderIrcInfoJSON,
  OrderIrcInfo,
  OrderIrcInfoV0,
} from './OrderIrcInfo';
import { OrderMetadata, OrderMetadataV0 } from './OrderMetadata';
import { IOrderPositionInfoJSON, OrderPositionInfo } from './OrderPositionInfo';

const LOCKTIME_THRESHOLD = 500000000;

/**
 * OrderOffer message contains information about a node and indicates its
 * desire to enter into a new contract. This is the first step toward
 * order negotiation. This is a simpler message than DlcOffer.
 */
export class OrderOffer implements IDlcMessage {
  public static type = MessageType.OrderOffer;

  /**
   * Creates an OrderOffer from JSON data
   * @param json JSON object representing an order offer
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): OrderOffer {
    const instance = new OrderOffer();

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

    // Use toBigInt helper to handle BigInt values from json-bigint
    instance.offerCollateral = toBigInt(
      json.offerCollateral ||
        json.offerCollateralSatoshis ||
        json.offer_collateral,
    );

    instance.feeRatePerVb = toBigInt(json.feeRatePerVb || json.fee_rate_per_vb);
    instance.cetLocktime = json.cetLocktime || json.cet_locktime || 0;
    instance.refundLocktime = json.refundLocktime || json.refund_locktime || 0;

    // Use ContractInfo.fromJSON() - proper delegation
    instance.contractInfo = ContractInfo.fromJSON(
      json.contractInfo || json.contract_info,
    );

    return instance;
  }

  /**
   * Deserializes an order_offer message
   * @param buf
   */
  public static deserialize(buf: Buffer): OrderOffer {
    const instance = new OrderOffer();
    const reader = new BufferReader(buf);

    const type = reader.readUInt16BE(); // read type

    // Validate type matches expected OrderOffer type
    if (type !== MessageType.OrderOffer) {
      throw new Error(
        `Invalid message type. Expected ${MessageType.OrderOffer}, got ${type}`,
      );
    }

    // BACKWARD COMPATIBILITY: Detect old vs new format
    const nextBytes = reader.buffer.subarray(
      reader.position,
      reader.position + 5,
    );
    const possibleProtocolVersion = nextBytes.readUInt32BE(0);
    const possibleContractFlags = nextBytes.readUInt8(4);

    // Heuristic: protocol_version should be 1, contract_flags should be 0
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

    instance.offerCollateral = reader.readUInt64BE();
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
   * The type for order_offer message. order_offer = 62770
   */
  public type = OrderOffer.type;

  // New fields as per dlcspecs PR #163
  public protocolVersion: number = PROTOCOL_VERSION; // Default to current protocol version

  public temporaryContractId: Buffer; // New field for contract identification

  // Existing fields
  public contractFlags: Buffer;

  public chainHash: Buffer;

  public contractInfo: ContractInfo;

  public offerCollateral: bigint;

  public feeRatePerVb: bigint;

  public cetLocktime: number;

  public refundLocktime: number;

  public metadata?: OrderMetadata;

  public ircInfo?: OrderIrcInfo;

  public positionInfo?: OrderPositionInfo;

  public batchFundingGroups?: BatchFundingGroup[];

  // Store unknown TLVs for forward compatibility
  public unknownTlvs?: Array<{ type: number; data: Buffer }>;

  // Legacy property for backward compatibility
  public get offerCollateralSatoshis(): bigint {
    return this.offerCollateral;
  }

  public set offerCollateralSatoshis(value: bigint) {
    this.offerCollateral = value;
  }

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

    // 6. offer_collateral must be greater than or equal to 1000
    if (this.offerCollateral < 1000) {
      throw new Error('offer_collateral must be greater than or equal to 1000');
    }

    if (this.cetLocktime < 0) {
      throw new Error('cet_locktime must be greater than or equal to 0');
    }

    if (this.refundLocktime < 0) {
      throw new Error('refund_locktime must be greater than or equal to 0');
    }

    // 7. cet_locktime and refund_locktime must either both be unix timestamps, or both be block heights.
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

    // 8. cetLocktime must be less than refundLocktime
    if (this.cetLocktime >= this.refundLocktime) {
      throw new Error('cetLocktime must be less than refundLocktime');
    }

    // validate contractInfo
    this.contractInfo.validate();

    // totalCollateral should be > offerCollateral (logical validation)
    if (this.contractInfo.getTotalCollateral() <= this.offerCollateral) {
      throw new Error('totalCollateral should be greater than offerCollateral');
    }
  }

  /**
   * Converts order_offer to JSON
   */
  public toJSON(): IOrderOfferJSON {
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
      contractFlags: Number(this.contractFlags[0]),
      chainHash: this.chainHash.toString('hex'),
      contractInfo: this.contractInfo.toJSON(),
      offerCollateral: bigIntToNumber(this.offerCollateral),
      offerCollateralSatoshis: bigIntToNumber(this.offerCollateral), // Legacy field
      feeRatePerVb: bigIntToNumber(this.feeRatePerVb),
      cetLocktime: this.cetLocktime,
      refundLocktime: this.refundLocktime,
      tlvs,
    };
  }

  /**
   * Serializes the order_offer message into a Buffer
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
    writer.writeUInt64BE(this.offerCollateral);
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

export interface IOrderOfferJSON {
  type: number;
  protocolVersion: number;
  temporaryContractId: string;
  contractFlags: number;
  chainHash: string;
  contractInfo: IContractInfoV0JSON | IContractInfoV1JSON;
  offerCollateral: number;
  offerCollateralSatoshis: number; // Legacy field for backward compatibility
  feeRatePerVb: number;
  cetLocktime: number;
  refundLocktime: number;
  tlvs: (
    | IOrderMetadataJSON
    | IOrderIrcInfoJSON
    | IOrderPositionInfoJSON
    | IBatchFundingGroupJSON
    | any
  )[];
}

export class OrderOfferContainer {
  private offers: OrderOffer[] = [];

  /**
   * Adds an OrderOffer to the container.
   * @param offer The OrderOffer to add.
   */
  public addOffer(offer: OrderOffer): void {
    this.offers.push(offer);
  }

  /**
   * Returns all OrderOffers in the container.
   * @returns An array of OrderOffer instances.
   */
  public getOffers(): OrderOffer[] {
    return this.offers;
  }

  /**
   * Serializes all OrderOffers in the container to a Buffer.
   * @returns A Buffer containing the serialized OrderOffers.
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
   * Deserializes a Buffer into an OrderOfferContainer with OrderOffers.
   * @param buf The Buffer to deserialize.
   * @returns An OrderOfferContainer instance.
   */
  public static deserialize(buf: Buffer): OrderOfferContainer {
    const reader = new BufferReader(buf);
    const container = new OrderOfferContainer();
    const offersCount = reader.readBigSize();
    for (let i = 0; i < offersCount; i++) {
      // Optionally, read the length of the serialized offer if it was written during serialization.
      const offerLength = reader.readBigSize();
      const offerBuf = reader.readBytes(Number(offerLength));
      const offer = OrderOffer.deserialize(offerBuf);
      container.addOffer(offer);
    }
    return container;
  }
}
