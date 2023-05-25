import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import {
  ContractInfo,
  IDisjointContractInfoJSON,
  ISingleContractInfoJSON,
} from './ContractInfo';
import { IDlcMessage } from './DlcMessage';

/**
 * OrderNegotiationFields V1 contains preferences of the acceptor of an order
 * offer which are taken into account during DLC construction.
 */
export class OrderNegotiationFields implements IDlcMessage {
  /**
   * Deserializes an order_negotiation_fields_v1 message
   * @param reader
   */
  public static deserialize(
    reader: Buffer | BufferReader,
  ): OrderNegotiationFields {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new OrderNegotiationFields();

    instance.contractInfo = ContractInfo.deserialize(reader);
    instance.offerCollateral = reader.readUInt64BE();
    instance.feeRatePerVb = reader.readUInt64BE();
    instance.cetLocktime = reader.readUInt32BE();
    instance.refundLocktime = reader.readUInt32BE();

    return instance;
  }

  public contractInfo: ContractInfo;

  public offerCollateral: bigint;

  public feeRatePerVb: bigint;

  public cetLocktime: number;

  public refundLocktime: number;

  /**
   * Converts order_negotiation_fields_v1 to JSON
   */
  public toJSON(): IOrderNegotiationFieldsJSON {
    return {
      offerCollateral: Number(this.offerCollateral),
      contractInfo: this.contractInfo.toJSON(),
      feeRatePerVb: Number(this.feeRatePerVb),
      cetLocktime: this.cetLocktime,
      refundLocktime: this.refundLocktime,
    };
  }

  /**
   * Serializes the order_negotiation_fields_v1 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    const dataWriter = new BufferWriter();

    dataWriter.writeBytes(this.contractInfo.serialize());
    dataWriter.writeUInt64BE(this.offerCollateral);
    dataWriter.writeUInt64BE(this.feeRatePerVb);
    dataWriter.writeUInt32BE(this.cetLocktime);
    dataWriter.writeUInt32BE(this.refundLocktime);

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IOrderNegotiationFieldsJSON {
  offerCollateral: number;
  contractInfo: ISingleContractInfoJSON | IDisjointContractInfoJSON;
  feeRatePerVb: number;
  cetLocktime: number;
  refundLocktime: number;
}
