import { sha256 } from '@node-dlc/crypto';
import {
  DlcMessage,
  NodeAnnouncementMessage,
  OrderAccept,
  OrderOffer,
} from '@node-dlc/messaging';

import { ChannelType } from './ChannelType';
import { ILogger } from './ILogger';
import { IrcManager } from './IrcManager';
import { WhitelistHandler } from './WhitelistHandler';

export class IrcOrderManager extends IrcManager {
  public receivedOrders: Map<string, string>; // tempOrderId to nick

  constructor(
    logger: ILogger,
    privKey: Buffer,
    servers = ['irc.darkscience.net'],
    debug = false,
    channel = ChannelType.AtomicMarketPit,
    port = 6697,
    useWhitelist = false,
    whitelistHandler: WhitelistHandler = undefined,
  ) {
    super(
      logger,
      privKey,
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
    msg: OrderOffer | OrderAccept | NodeAnnouncementMessage,
    tempOrderId?: Buffer,
  ): void {
    switch (msg.type) {
      case OrderOffer.type:
        this.say(msg.serialize());
        break;
      case OrderAccept.type:
        this.say(
          msg.serialize(),
          this.receivedOrders.get(
            (msg as OrderAccept).tempOrderId.toString('hex'),
          ),
        );
        break;
      case NodeAnnouncementMessage.type:
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
        case OrderOffer.type:
          this.receivedOrders.set(sha256(buf).toString('hex'), from);
          this.emit('orderoffermessage', from, to, msg);
          break;
        case OrderAccept.type:
          this.emit('orderacceptmessage', from, to, msg);
          break;
        case NodeAnnouncementMessage.type:
          this.emit('nodeannouncementmessage', from, to, msg);
          break;
        default:
          throw Error('DlcMessage type not supported');
      }
    } catch (e) {
      this.logger.debug('error parsing message', e);
      this.emit('message', from, to, msg);
      this.logger.debug('message', from, to, msg);
    }
  }
}
