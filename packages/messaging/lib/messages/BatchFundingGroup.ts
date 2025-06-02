import { Value } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * The BatchFundingGroup TLV contains information about the intent to
 * enter multiple DLCs simulatenously within one batch dlc funding
 * transaction in the contract negotiation stage of the peer protocol
 *
 * This is the first step toward creating a batch dlc funding transaction
 *
 * A DlcOffer or DlcAccept can contain one or multiple BatchFundingInfo
 * TLVs to specify one or more groupings. This allows specification of
 * collateral put towards different types of contracts, such as options
 * contracts, futures contracts, or other investment types.
 *
 * Attributes:
 * - tempContractIds: Temporary identifiers for contracts proposed in DlcOffers.
 * - contractIds: Identifiers for contracts that have been accepted and are
 *   part of the funding transaction. These are derived from DlcOffers and DlcAccepts.
 * - allocatedCollateral: The amount of collateral allocated to the contracts
 *   within this group. This is specified early in the negotiation process.
 * - eventIds: Oracle event identifiers for the contracts in this group. These
 *   are also specified early in the negotiation process.
 *
 * Note: During the early stages of the negotiation protocol, only allocatedCollateral
 * and eventIds are specified. tempContractIds and contractIds are added to the
 * DlcAccept upon creation.
 */
export class BatchFundingGroup implements IDlcMessage {
  public static type = MessageType.BatchFundingGroup;

  /**
   * Deserializes a batch_contract_info message
   * @param buf
   */
  public static deserialize(buf: Buffer): BatchFundingGroup {
    const instance = new BatchFundingGroup();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    const tempContractIdsCount = reader.readBigSize();
    for (let i = 0; i < Number(tempContractIdsCount); i++) {
      const length = reader.readBigSize();
      instance.tempContractIds.push(reader.readBytes(Number(length)));
    }

    const contractIdsCount = reader.readBigSize();
    for (let i = 0; i < Number(contractIdsCount); i++) {
      const length = reader.readBigSize();
      instance.contractIds.push(reader.readBytes(Number(length)));
    }

    instance.allocatedCollateral = Value.fromSats(reader.readUInt64BE());

    const eventIdsCount = reader.readBigSize();
    for (let i = 0; i < Number(eventIdsCount); i++) {
      const eventIdLength = reader.readBigSize();
      const eventIdBuf = reader.readBytes(Number(eventIdLength));
      instance.eventIds.push(eventIdBuf.toString());
    }

    return instance;
  }

  /**
   * The type for batch_contract_info message.
   */
  public type = BatchFundingGroup.type;

  public length: bigint;

  public tempContractIds: Buffer[] = [];

  public contractIds: Buffer[] = [];

  public allocatedCollateral: Value;

  public eventIds: string[] = [];

  /**
   * Converts batch_funding_info to JSON
   */
  public toJSON(): IBatchFundingGroupJSON {
    return {
      type: this.type,
      tempContractIds: this.tempContractIds.map((id) => id.toString('hex')),
      contractIds: this.contractIds.map((id) => id.toString('hex')),
      totalCollateral: Number(this.allocatedCollateral.sats),
      eventIds: this.eventIds,
    };
  }

  /**
   * Serializes the batch_funding_info message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();

    dataWriter.writeBigSize(this.tempContractIds.length);
    this.tempContractIds.forEach((id) => {
      dataWriter.writeBigSize(id.length);
      dataWriter.writeBytes(id);
    });

    dataWriter.writeBigSize(this.contractIds.length);
    this.contractIds.forEach((id) => {
      dataWriter.writeBigSize(id.length);
      dataWriter.writeBytes(id);
    });

    dataWriter.writeUInt64BE(this.allocatedCollateral.sats);

    dataWriter.writeBigSize(this.eventIds.length);
    this.eventIds.forEach((id) => {
      const idBuffer = Buffer.from(id);
      dataWriter.writeBigSize(id.length);
      dataWriter.writeBytes(idBuffer);
    });

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IBatchFundingGroupJSON {
  type: number;
  tempContractIds: string[];
  contractIds: string[];
  totalCollateral: number;
  eventIds: string[];
}
