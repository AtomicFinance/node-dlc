import { ChannelType } from './ChannelType';
import { ILogger } from './ILogger';
import { IrcManager } from './IrcManager';
import { WhitelistHandler } from './WhitelistHandler';
import { OrderOfferV0, OrderAcceptV0, DlcMessage } from '@node-dlc/messaging';
import { NodeAnnouncementMessage, MessageType } from '@node-lightning/wire';
import { sha256 } from '@node-lightning/crypto';

export class IrcOrderManager extends IrcManager {
  public receivedOrders: Map<string, string>; // tempOrderId to nick

  constructor(
    logger: ILogger,
    pubKey: Buffer,
    servers = ['irc.darkscience.net'],
    debug = false,
    channel = ChannelType.AtomicMarketPit,
    port = 6697,
    useWhitelist = false,
    whitelistHandler: WhitelistHandler = undefined,
  ) {
    super(
      logger,
      pubKey,
      servers,
      debug,
      channel,
      port,
      useWhitelist,
      whitelistHandler,
    );

    this.receivedOrders = new Map<string, string>();
  }

  public send(
    msg: OrderOfferV0 | OrderAcceptV0 | NodeAnnouncementMessage,
    tempOrderId?: Buffer,
  ): void {
    switch (msg.type) {
      case OrderOfferV0.type:
        this.say(msg.serialize());
        break;
      case OrderAcceptV0.type:
        this.say(
          msg.serialize(),
          this.receivedOrders.get(
            (msg as OrderAcceptV0).tempOrderId.toString('hex'),
          ),
        );
        break;
      case MessageType.NodeAnnouncement:
        this.say(
          msg.serialize(),
          this.receivedOrders.get(tempOrderId.toString('hex')),
        );
        break;
      default:
        throw Error('Msg must be OrderOffer, OrderAccept or NodeAnnouncement');
    }
  }

  protected _emitMsg(from: string, to: string, msg: string): void {
    try {
      const buf = Buffer.from(msg, 'hex');

      const dlcMessage = DlcMessage.deserialize(buf);

      switch (dlcMessage.type) {
        case OrderOfferV0.type:
          this.receivedOrders.set(sha256(buf).toString('hex'), from);
          this.emit('orderoffermessage', from, to, msg);
          break;
        case OrderAcceptV0.type:
          this.emit('orderacceptmessage', from, to, msg);
          break;
        case MessageType.NodeAnnouncement:
          this.emit('nodeannouncementmessage', from, to, msg);
          break;
        default:
          throw Error('DlcMessage type not supported');
      }
    } catch (e) {
      this.emit('message', from, to, msg);
      this.logger.debug('message', from, to, msg);
    }
  }
}
