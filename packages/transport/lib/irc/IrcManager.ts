import { EventEmitter } from 'events';
import irc from 'irc';
import { ECPair } from 'bitcoinjs-lib';
import secp256k1 from 'secp256k1';
import { Base58 } from '@node-lightning/bitcoin';
import { sha256 } from '@node-lightning/crypto';
import { ILogger } from './ILogger';
import { WhitelistHandler } from './WhitelistHandler';
import { ChannelType } from './ChannelType';
import { IrcMessageV0 } from '@node-dlc/messaging';
import { verifySignature } from './crypto';

export enum ConnectState {
  Unconnected,
  Connecting,
  Connected,
}

export enum MarketType {
  AtomicOptions = 'A',
}

export enum MarketVersion {
  Version0 = '0',
}

/**
 * IrcManager
 */
export class IrcManager extends EventEmitter {
  public static type = MarketType.AtomicOptions;
  public static version = MarketVersion.Version0;
  public static nickHashLen = 10;
  public static nickMaxEncoded = 14;

  public static nickDecode(
    nick: string,
  ): { type: string; version: string; suffix: string } {
    const { type, version, nickSuffixLen } = IrcManager;

    if (!IrcManager.nickValid(nick)) throw Error(`Invalid Nick: ${nick}`);
    const suffix = nick.substring(
      type.length + version.length,
      nickSuffixLen(),
    );
    return { type, version, suffix };
  }

  public static nickLen(): number {
    const suffixLen = IrcManager.nickSuffixLen();
    return (
      IrcManager.type.length + IrcManager.version.toString().length + suffixLen
    );
  }

  public static nickValid(nick: string): boolean {
    const { type, version, nickLen, nickSuffixLen } = IrcManager;
    const base58Regex = /[0-9A-HJ-NP-Za-km-z]{14}/g;
    let i = 0;

    if (nick.length !== nickLen()) return false;
    if (nick.substring(i, type.length) !== type) return false;
    i += type.length;
    if (nick.substring(i, i + version.length) !== version) return false;
    i += version.length;
    if (!nick.substring(i, i + nickSuffixLen()).match(base58Regex))
      return false;

    return true;
  }

  public static nickSuffixLen(): number {
    return Base58.encode(
      sha256(Buffer.alloc(0)).slice(0, IrcManager.nickHashLen),
    ).length;
  }

  public blockHeight: number;
  public started: boolean;
  public connectState: ConnectState;
  public useWhitelist: boolean;
  public whitelistHandler: WhitelistHandler;
  public privKey: Buffer; // 32 Bytes
  public pubKey: Buffer; // 33 Bytes
  public keyPair;
  public serverIndex = 0;
  public servers: string[];
  public logger: ILogger;
  public nick: string;
  public client: irc.Client;
  public opts: irc.ClientOptions;
  public channel: ChannelType;

  public receivedIrcMsgs: Map<number, Buffer[]>;

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
    super();
    this.keyPair = ECPair.fromPrivateKey(privKey);
    this.privKey = privKey;
    this.pubKey = this.keyPair.publicKey;
    this.logger = logger.sub('ircmgr');
    this.servers = servers;
    this.nick = this.generateNick(this.pubKey);
    this.channel = channel;
    this.opts = {
      port,
      debug,
      secure: true,
      channels: [this.channel],
    };
    this.useWhitelist = useWhitelist;
    this.whitelistHandler = whitelistHandler;
    this.receivedIrcMsgs = new Map<number, Buffer[]>();
  }

  public generateNick(pubKey: Buffer): string {
    const { type, version } = IrcManager;
    const prefix = `${type}${version}`;
    let suffix = Base58.encode(sha256(pubKey).slice(0, IrcManager.nickHashLen));
    suffix += '0'.repeat(IrcManager.nickMaxEncoded - suffix.length);
    return `${prefix}${suffix}`;
  }

  /**
   * Starts the irc manager. This will connect to
   * irc server and setup listeners
   */
  public start(): void {
    this.logger.info('starting irc manager');

    this.client = new irc.Client(
      this.servers[this.serverIndex],
      this.nick,
      this.opts,
    );

    this._setupListeners();
  }

  public stop(): void {
    this.client.disconnect();
  }

  public say(msg: Buffer, to?: string): void {
    const ircMessages = IrcMessageV0.fromBuffer(msg, this.pubKey);

    for (let i = 0; i < ircMessages.length; i++) {
      const ircMsgWithoutSig = ircMessages[i].serializeWithoutSig();
      const msg = sha256(ircMsgWithoutSig);
      const sig = secp256k1.ecdsaSign(msg, this.privKey);
      ircMessages[i].signature = Buffer.from(sig.signature);

      verifySignature(ircMessages[i]);

      this.client.say(
        to ? to : this.channel,
        ircMessages[i].serialize().toString('base64'),
      );
    }

    this.logger.debug('You msged: %s', msg);
  }

  private _setupListeners() {
    this.connectState = ConnectState.Connecting;

    this.client.addListener('message', (from, to, message) => {
      this.logger.debug('%s => %s: %s', from, to, message);
      if (
        IrcManager.nickValid(from) &&
        from !== this.nick &&
        (!this.useWhitelist || this.whitelistHandler(from))
      ) {
        this._processMsg(from, to, message);
      }
    });

    this.client.addListener('pm', (nick, message) => {
      this.logger.debug('Got private message from %s: %s', nick, message);
      if (
        IrcManager.nickValid(nick) &&
        nick === this.nick &&
        (!this.useWhitelist || this.whitelistHandler(nick))
      ) {
        this._processMsg(nick, this.nick, message);
      }
    });

    this.client.addListener('join', (channel, who) => {
      if (who === this.nick) {
        this.started = true;
        this.connectState = ConnectState.Connected;
      }
      this.logger.debug('%s has joined %s', who, channel);
    });

    this.client.addListener('part', (channel, who, reason) => {
      this.logger.debug('%s has left %s: %s', who, channel, reason);
    });

    this.client.addListener('kick', (channel, who, by, reason) => {
      this.logger.debug(
        '%s was kicked from %s by %s: %s',
        who,
        channel,
        by,
        reason,
      );
    });
  }

  private _processMsg(from: string, to: string, msg: string) {
    this.logger.debug('raw-message', msg);

    try {
      const ircMessage = IrcMessageV0.deserialize(Buffer.from(msg, 'base64'));

      verifySignature(ircMessage);

      if (this.generateNick(ircMessage.pubkey) !== from)
        throw Error('Incorrect nick');

      let receivedMsgs = this.receivedIrcMsgs.get(ircMessage.checksum);
      if (!receivedMsgs)
        receivedMsgs = new Array(Number(ircMessage.sequenceLength));

      receivedMsgs[Number(ircMessage.sequenceNumber)] = ircMessage.data;

      if (receivedMsgs.includes(undefined)) {
        this.receivedIrcMsgs.set(ircMessage.checksum, receivedMsgs);
      } else {
        const msg = Buffer.concat(receivedMsgs);

        this.receivedIrcMsgs.set(ircMessage.checksum, undefined);

        this._emitMsg(from, to, msg.toString('hex'));
      }
    } catch (e) {
      this.logger.error('Invalid Irc Message: %s', e);
    }
  }

  protected _emitMsg(from: string, to: string, msg: string): void {
    this.emit('message', from, to, msg);
    this.logger.debug('message', from, to, msg);
  }
}
