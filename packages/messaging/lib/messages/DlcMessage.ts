import { BufferReader } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { DlcAcceptV0 } from './DlcAccept';
import { DlcCloseV0 } from './DlcClose';
import { DlcOfferV0 } from './DlcOffer';
import { DlcSignV0 } from './DlcSign';
import { NodeAnnouncementMessage } from './NodeAnnouncementMessage';
import { OrderAcceptV0 } from './OrderAccept';
import { OrderOfferV0 } from './OrderOffer';
import { OracleAnnouncementV0Pre167 } from './pre-167/OracleAnnouncement';
import { OracleAttestationV0Pre167 } from './pre-167/OracleAttestation';

export interface IDlcMessage {
  serialize(): Buffer;
}

export abstract class DlcMessage {
  public static deserialize(
    buf: Buffer,
  ):
    | OrderOfferV0
    | OrderAcceptV0
    | DlcOfferV0
    | DlcAcceptV0
    | DlcSignV0
    | DlcCloseV0
    | OracleAttestationV0Pre167
    | OracleAnnouncementV0Pre167
    | NodeAnnouncementMessage {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
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
        return OracleAttestationV0Pre167.deserialize(buf);
      case MessageType.OracleAnnouncementV0:
        return OracleAnnouncementV0Pre167.deserialize(buf);
      case MessageType.NodeAnnouncement:
        return NodeAnnouncementMessage.deserialize(buf);
      default:
        throw new Error(`Dlc Message type invalid`);
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}
