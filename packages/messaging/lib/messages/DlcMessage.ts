import { BufferReader } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import {
  ContractDescriptorV0,
  ContractDescriptorV1,
} from './ContractDescriptor';
import { ContractInfoV0, ContractInfoV1 } from './ContractInfo';
import { DlcAcceptV0 } from './DlcAccept';
import { DlcCloseV0 } from './DlcClose';
import { DlcOfferV0 } from './DlcOffer';
import { DlcSignV0 } from './DlcSign';
import { NodeAnnouncementMessage } from './NodeAnnouncementMessage';
import { OracleAnnouncementV0 } from './OracleAnnouncementV0';
import { OracleAttestationV0 } from './OracleAttestationV0';
import { OrderAcceptV0 } from './OrderAccept';
import { OrderOfferV0 } from './OrderOffer';

export interface IDlcMessage {
  serialize(): Buffer;
}

export abstract class DlcMessage {
  public static deserialize(
    buf: Buffer,
  ):
    | ContractDescriptorV0
    | ContractDescriptorV1
    | ContractInfoV0
    | ContractInfoV1
    | OrderOfferV0
    | OrderAcceptV0
    | DlcOfferV0
    | DlcAcceptV0
    | DlcSignV0
    | DlcCloseV0
    | OracleAttestationV0
    | OracleAnnouncementV0
    | NodeAnnouncementMessage {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.ContractDescriptorV0:
        return ContractDescriptorV0.deserialize(buf);
      case MessageType.ContractDescriptorV1:
        return ContractDescriptorV1.deserialize(buf);
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
      case MessageType.DlcCloseV0:
        return DlcCloseV0.deserialize(buf);
      case MessageType.OracleAttestationV0:
        return OracleAttestationV0.deserialize(buf);
      case MessageType.OracleAnnouncementV0:
        return OracleAnnouncementV0.deserialize(buf);
      case MessageType.NodeAnnouncement:
        return NodeAnnouncementMessage.deserialize(buf);
      default:
        throw new Error(`Dlc Message type invalid`);
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}
