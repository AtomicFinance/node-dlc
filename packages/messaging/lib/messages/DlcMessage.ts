import { BufferReader } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import {
  ContractDescriptorV0JSON,
  ContractDescriptorV1JSON,
  EnumeratedContractDescriptor,
  NumericOutcomeContractDescriptor,
} from './ContractDescriptor';
import {
  ContractInfo,
  ContractInfoV0,
  ContractInfoV1,
  IContractInfoV0JSON,
  IContractInfoV1JSON,
} from './ContractInfo';
import { DlcAccept } from './DlcAccept';
import { DlcClose } from './DlcClose';
import { DlcOffer } from './DlcOffer';
import { DlcSign } from './DlcSign';
import { EventDescriptor } from './EventDescriptor';
import { FundingInput } from './FundingInput';
import { NodeAnnouncementMessage } from './NodeAnnouncementMessage';
import { OracleAnnouncementV0 } from './OracleAnnouncementV0';
import { OracleAttestationV0 } from './OracleAttestationV0';
import { OracleEventV0 } from './OracleEventV0';
import { OrderAcceptV0 } from './OrderAccept';
import { OrderOfferV0 } from './OrderOffer';

export interface IDlcMessage {
  type: number;
  serialize(): Buffer;
}

export type ContractInfoV0JSON = IContractInfoV0JSON;
export type ContractInfoV1JSON = IContractInfoV1JSON;

export abstract class DlcMessage {
  public static deserialize(
    buf: Buffer,
  ):
    | EnumeratedContractDescriptor
    | NumericOutcomeContractDescriptor
    | ContractInfoV0
    | ContractInfoV1
    | OrderOfferV0
    | OrderAcceptV0
    | DlcOffer
    | DlcAccept
    | DlcSign
    | DlcClose
    | OracleAttestationV0
    | OracleAnnouncementV0
    | NodeAnnouncementMessage {
    const reader = new BufferReader(buf);
    const type = reader.readUInt16BE();

    switch (type) {
      case MessageType.ContractDescriptorV0:
        return EnumeratedContractDescriptor.deserialize(buf);
      case MessageType.ContractDescriptorV1:
        return NumericOutcomeContractDescriptor.deserialize(buf);
      case MessageType.ContractInfoV0:
        return ContractInfoV0.deserialize(buf);
      case MessageType.ContractInfoV1:
        return ContractInfoV1.deserialize(buf);
      case MessageType.OrderOfferV0:
        return OrderOfferV0.deserialize(buf);
      case MessageType.OrderAcceptV0:
        return OrderAcceptV0.deserialize(buf);
      case MessageType.DlcOfferV0:
        return DlcOffer.deserialize(buf);
      case MessageType.DlcAcceptV0:
        return DlcAccept.deserialize(buf);
      case MessageType.DlcSignV0:
        return DlcSign.deserialize(buf);
      case MessageType.DlcCloseV0:
        return DlcClose.deserialize(buf);
      case MessageType.OracleAttestationV0:
        return OracleAttestationV0.deserialize(buf);
      case MessageType.OracleAnnouncementV0:
        return OracleAnnouncementV0.deserialize(buf);
      case MessageType.NodeAnnouncement:
        return NodeAnnouncementMessage.deserialize(buf);
      default:
        throw new Error(`DlcMessage type ${type} not supported`);
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}
