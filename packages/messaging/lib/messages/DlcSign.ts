import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType, PROTOCOL_VERSION } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import { BatchFundingGroup, IBatchFundingGroupJSON } from './BatchFundingGroup';
import {
  CetAdaptorSignaturesV0,
  ICetAdaptorSignaturesV0JSON,
} from './CetAdaptorSignaturesV0';
import { IDlcMessage } from './DlcMessage';
import {
  FundingSignaturesV0,
  IFundingSignaturesV0JSON,
} from './FundingSignaturesV0';

/**
 * DlcSign gives all of the initiator's signatures, which allows the
 * receiver to broadcast the funding transaction with both parties being
 * fully committed to all closing transactions.
 * Updated to support dlcspecs PR #163 format.
 */
export class DlcSign implements IDlcMessage {
  public static type = MessageType.DlcSignV0;

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
    instance.cetSignatures = CetAdaptorSignaturesV0.deserialize(getTlv(reader));
    instance.refundSignature = reader.readBytes(64);
    instance.fundingSignatures = FundingSignaturesV0.deserialize(
      getTlv(reader),
    );

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

  public cetSignatures: CetAdaptorSignaturesV0;

  public refundSignature: Buffer;

  public fundingSignatures: FundingSignaturesV0;

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
   * Converts sign_dlc to JSON
   */
  public toJSON(): IDlcSignJSON {
    const tlvs = [];

    if (this.batchFundingGroups) {
      this.batchFundingGroups.forEach((group) => {
        tlvs.push(group.toJSON());
      });
    }

    // Include unknown TLVs for debugging
    if (this.unknownTlvs) {
      this.unknownTlvs.forEach((tlv) =>
        tlvs.push({ type: tlv.type, data: tlv.data.toString('hex') }),
      );
    }

    return {
      type: this.type,
      protocolVersion: this.protocolVersion,
      contractId: this.contractId.toString('hex'),
      cetSignatures: this.cetSignatures.toJSON(),
      refundSignature: this.refundSignature.toString('hex'),
      fundingSignatures: this.fundingSignatures.toJSON(),
      tlvs,
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
    writer.writeBytes(this.cetSignatures.serialize());
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
  type: number;
  protocolVersion: number;
  contractId: string;
  cetSignatures: ICetAdaptorSignaturesV0JSON;
  refundSignature: string;
  fundingSignatures: IFundingSignaturesV0JSON;
  tlvs: (IBatchFundingGroupJSON | any)[]; // For unknown TLVs
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
