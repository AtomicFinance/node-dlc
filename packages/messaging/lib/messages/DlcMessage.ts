import { BufferReader } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { ContractInfoV0, ContractInfoV1 } from './ContractInfo';
import { DlcAcceptV0 } from './DlcAccept';
import { DlcOfferV0 } from './DlcOffer';
import { DlcSignV0 } from './DlcSign';
import { OracleAnnouncementV0 } from './OracleAnnouncementV0';
import { OracleAttestationV0 } from './OracleAttestationV0';
import { OrderAcceptV0 } from './OrderAccept';
import { OrderOfferV0 } from './OrderOffer';

export interface IDlcMessage {
  type: MessageType;
  serialize(): Buffer;
}

export abstract class DlcMessage {
  public static deserialize(
    buf: Buffer,
  ):
    | ContractInfoV0
    | ContractInfoV1
    | OrderOfferV0
    | OrderAcceptV0
    | DlcOfferV0
    | DlcAcceptV0
    | DlcSignV0
    | OracleAttestationV0
    | OracleAnnouncementV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.ContractInfoV0:
        return ContractInfoV0.deserialize(buf);
      case MessageType.ContractInfoV1:
        return ContractInfoV1.deserialize(buf);
      case MessageType.OrderOfferV0:
        return OrderOfferV0.deserialize(buf);
      case MessageType.OrderAcceptV0:
        return OrderAcceptV0.deserialize(buf);
      case MessageType.DlcOfferV0:
        return DlcOfferV0.deserialize(buf);
      case MessageType.DlcAcceptV0:
        return DlcAcceptV0.deserialize(buf);
      case MessageType.DlcSignV0:
        return DlcSignV0.deserialize(buf);
      case MessageType.OracleAttestationV0:
        return OracleAttestationV0.deserialize(buf);
      case MessageType.OracleAnnouncementV0:
        return OracleAnnouncementV0.deserialize(buf);
      default:
        throw new Error(`Dlc Message type invalid`);
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}
