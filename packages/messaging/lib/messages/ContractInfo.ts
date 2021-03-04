import { BufferReader, BufferWriter } from "@node-lightning/bufio";
import { MessageType } from "../MessageType";
import { getTlv } from "../serialize/getTlv";
import { ContractDescriptor } from "./ContractDescriptor";
import { IDlcMessage } from "./DlcMessage";
import { OracleInfoV0 } from "./OracleInfoV0";

export abstract class ContractInfo {
  public static deserialize(buf: Buffer): ContractInfoV0 | ContractInfoV1 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.ContractInfoV0:
        return ContractInfoV0.deserialize(buf);
      case MessageType.ContractInfoV1:
        return ContractInfoV1.deserialize(buf);
      default:
        throw new Error(
          `Payout function TLV type must be ContractDescriptorV0 or ContractDescriptorV1`
        );
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract serialize(): Buffer;
}

/**
 * ContractInfo V0 contains information about a contract's outcomes,
 * their corresponding payouts, and the oracles to be used.
 */
export class ContractInfoV0 implements IDlcMessage {
    public static type = MessageType.ContractInfoV0;

    /**
     * Deserializes an contract_info_v0 message
     * @param buf
     */
    public static deserialize(buf: Buffer): ContractInfoV0 {
        const instance = new ContractInfoV0();
        const reader = new BufferReader(buf);

        reader.readBigSize(); // read type
        instance.length = reader.readBigSize();
        instance.totalCollateral = reader.readUInt64BE();
        instance.contractDescriptor = ContractDescriptor.deserialize(getTlv(reader));
        instance.oracleInfo = OracleInfoV0.deserialize(getTlv(reader));

        return instance;
    }

    /**
     * The type for contract_info_v0 message. contract_info_v0 = 55342
     */
    public type = ContractInfoV0.type;

    public length: bigint;

    public totalCollateral: bigint;

    public contractDescriptor: ContractDescriptor;

    public oracleInfo: OracleInfoV0;

    /**
     * Serializes the contract_info_v0 message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeBigSize(this.type);
        writer.writeBigSize(this.length);
        writer.writeUInt64BE(this.totalCollateral);
        writer.writeBytes(this.contractDescriptor.serialize());
        writer.writeBytes(this.oracleInfo.serialize());

        return writer.toBuffer();
    }
}

/**
 * ContractInfo V1 contains information about a contract's outcomes,
 * their corresponding payouts, and the oracles to be used.
 */
export class ContractInfoV1 implements IDlcMessage {
  public static type = MessageType.ContractInfoV1;

  /**
   * Deserializes an contract_info_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): ContractInfoV1 {
      const instance = new ContractInfoV1();
      const reader = new BufferReader(buf);

      reader.readBigSize(); // read type
      instance.length = reader.readBigSize();
      instance.totalCollateral = reader.readUInt64BE();
      instance.contractDescriptor = ContractDescriptor.deserialize(getTlv(reader));
      instance.oracleInfo = OracleInfoV0.deserialize(getTlv(reader));

      return instance;
  }

  /**
   * The type for contract_info_v0 message. contract_info_v0 = 55342
   */
  public type = ContractInfoV1.type;

  public length: bigint;

  public totalCollateral: bigint;

  public contractDescriptor: ContractDescriptor;

  public oracleInfo: OracleInfoV0;

  /**
   * Serializes the contract_info_v0 message into a Buffer
   */
  public serialize(): Buffer {
      const writer = new BufferWriter();
      writer.writeBigSize(this.type);
      writer.writeBigSize(this.length);
      writer.writeUInt64BE(this.totalCollateral);
      writer.writeBytes(this.contractDescriptor.serialize());
      writer.writeBytes(this.oracleInfo.serialize());

      return writer.toBuffer();
  }
}
