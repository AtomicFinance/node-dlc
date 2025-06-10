import { Script } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter } from '@node-dlc/bufio';
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
import { FundingInputV0, IFundingInputV0JSON } from './FundingInput';
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
      instance.fundingInputs.push(FundingInputV0.deserialize(getTlv(reader)));
    }

    const changeSPKLen = reader.readUInt16BE();
    instance.changeSPK = reader.readBytes(changeSPKLen);
    instance.changeSerialId = reader.readUInt64BE();

    if (parseCets) {
      instance.cetSignatures = CetAdaptorSignaturesV0.deserialize(
        getTlv(reader),
      );
    } else {
      skipTlv(reader);
      instance.cetSignatures = new CetAdaptorSignaturesV0();
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

  public cetSignatures: CetAdaptorSignaturesV0;

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
   * Converts accept_dlc to JSON
   */
  public toJSON(): IDlcAcceptJSON {
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
      tempContractId: this.tempContractId.toString('hex'),
      acceptCollateralSatoshis: Number(this.acceptCollateralSatoshis),
      fundingPubKey: this.fundingPubKey.toString('hex'),
      payoutSPK: this.payoutSPK.toString('hex'),
      payoutSerialId: Number(this.payoutSerialId),
      fundingInputs: this.fundingInputs.map((input) => input.toJSON()),
      changeSPK: this.changeSPK.toString('hex'),
      changeSerialId: Number(this.changeSerialId),
      cetSignatures: this.cetSignatures.toJSON(),
      refundSignature: this.refundSignature.toString('hex'),
      negotiationFields: this.negotiationFields?.toJSON(),
      tlvs,
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
      writer.writeBytes(fundingInput.serialize());
    }

    writer.writeUInt16BE(this.changeSPK.length);
    writer.writeBytes(this.changeSPK);
    writer.writeUInt64BE(this.changeSerialId);
    writer.writeBytes(this.cetSignatures.serialize());
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
  type: number;
  protocolVersion: number;
  tempContractId: string;
  acceptCollateralSatoshis: number;
  fundingPubKey: string;
  payoutSPK: string;
  payoutSerialId: number;
  fundingInputs: IFundingInputV0JSON[];
  changeSPK: string;
  changeSerialId: number;
  cetSignatures: ICetAdaptorSignaturesV0JSON;
  refundSignature: string;
  negotiationFields?: // Now optional
  | INegotiationFieldsV0JSON
    | INegotiationFieldsV1JSON
    | INegotiationFieldsV2JSON;
  tlvs: (IBatchFundingGroupJSON | any)[]; // For unknown TLVs
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
