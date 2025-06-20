import { BufferReader } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import {
  EnumeratedDescriptor,
  NumericalDescriptor,
} from './ContractDescriptor';
import {
  DisjointContractInfo,
  IContractInfoV0JSON,
  IContractInfoV1JSON,
  SingleContractInfo,
} from './ContractInfo';
import { DlcAccept } from './DlcAccept';
import { DlcClose } from './DlcClose';
import { DlcOffer } from './DlcOffer';
import { DlcSign } from './DlcSign';
import { NodeAnnouncementMessage } from './NodeAnnouncementMessage';
import { OracleAnnouncement } from './OracleAnnouncement';
import { OracleAttestation } from './OracleAttestation';
import { OrderAccept } from './OrderAccept';
import { OrderOffer } from './OrderOffer';

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
    | EnumeratedDescriptor
    | NumericalDescriptor
    | SingleContractInfo
    | DisjointContractInfo
    | OrderOffer
    | OrderAccept
    | DlcOffer
    | DlcAccept
    | DlcSign
    | DlcClose
    | OracleAttestation
    | OracleAnnouncement
    | NodeAnnouncementMessage {
    const reader = new BufferReader(buf);
    const type = reader.readUInt16BE();

    switch (type) {
      case MessageType.ContractDescriptorV0:
        return EnumeratedDescriptor.deserialize(buf);
      case MessageType.ContractDescriptorV1:
        return NumericalDescriptor.deserialize(buf);
      case MessageType.SingleContractInfo:
        return SingleContractInfo.deserialize(buf);
      case MessageType.DisjointContractInfo:
        return DisjointContractInfo.deserialize(buf);
      case MessageType.OrderOffer:
        return OrderOffer.deserialize(buf);
      case MessageType.OrderAccept:
        return OrderAccept.deserialize(buf);
      case MessageType.DlcOffer:
        return DlcOffer.deserialize(buf);
      case MessageType.DlcAccept:
        return DlcAccept.deserialize(buf);
      case MessageType.DlcSign:
        return DlcSign.deserialize(buf);
      case MessageType.DlcClose:
        return DlcClose.deserialize(buf);
      case MessageType.OracleAttestation:
        return OracleAttestation.deserialize(buf);
      case MessageType.OracleAnnouncement:
        return OracleAnnouncement.deserialize(buf);
      case MessageType.NodeAnnouncement:
        return NodeAnnouncementMessage.deserialize(buf);
      default:
        throw new Error(`DlcMessage type ${type} not supported`);
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}
