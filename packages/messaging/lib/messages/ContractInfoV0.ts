import { BufferReader, BufferWriter } from "@node-lightning/bufio";
import { MessageType } from "../MessageType";
import { getTlv } from "../serialize/getTlv";
import { DlcMessage } from "./DlcMessage";
import { ContractDescriptorV0 } from "./ContractDescriptorV0";
import { OracleInfoV0 } from "./OracleInfoV0";

/**
 * ContractInfo V0 contains information about a contract's outcomes,
 * their corresponding payouts, and the oracles to be used.
 */
export class ContractInfoV0 implements DlcMessage {
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
        instance.totalCollateral = reader.readUInt64BE()
        instance.contractDescriptor = ContractDescriptorV0.deserialize(getTlv(reader))
        instance.oracleInfo = OracleInfoV0.deserialize(getTlv(reader))

        return instance;
    }

    /**
     * The type for contract_info_v0 message. contract_info_v0 = 55342
     */
    public type = ContractInfoV0.type;

    public length: bigint;

    public totalCollateral: bigint;

    public contractDescriptor: ContractDescriptorV0;

    public oracleInfo: OracleInfoV0;

    /**
     * Serializes the contract_info_v0 message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeBigSize(this.type);
        writer.writeBigSize(this.length);
        writer.writeUInt64BE(this.totalCollateral);
        writer.writeBytes(this.contractDescriptor.serialize())
        writer.writeBytes(this.oracleInfo.serialize())

        return writer.toBuffer();
    }
}
