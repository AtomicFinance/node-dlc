import { EventEmitter } from 'events';
import irc from 'irc';
import { Base58 } from '@node-lightning/bitcoin';
import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { sha256 } from '@node-lightning/crypto';
import { ILogger } from './ILogger';
import { WhitelistHandler } from './WhitelistHandler';
import { ChannelType } from './ChannelType';

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
    const base58Regex = /[1-9A-HJ-NP-Za-km-z]{14}/g;
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
  public pubKey: Buffer; // 33 Bytes
  public serverIndex = 0;
  public servers: string[];
  public logger: ILogger;
  public nick: string;
  public client: irc.Client;
  public opts: irc.ClientOptions;
  public channel: ChannelType;

  public receivedNickMsgs: Map<string, string>;
  public lengthNickMsgs: Map<string, bigint>;

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
    super();
    this.logger = logger.sub('ircmgr');
    this.pubKey = pubKey;
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
    this.receivedNickMsgs = new Map<string, string>();
    this.lengthNickMsgs = new Map<string, bigint>();
  }

  public generateNick(pubKey: Buffer): string {
    const { type, version } = IrcManager;
    const prefix = `${type}${version}`;
    const suffix = Base58.encode(
      sha256(pubKey).slice(0, IrcManager.nickHashLen),
    );
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
    const newMsg = msg.toString('hex');

    const writer = new BufferWriter();
    writer.writeBigSize(newMsg.length);
    writer.writeBytes(msg);

    this.client.say(to ? to : this.channel, writer.toBuffer().toString('hex'));
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

    let msgs = this.receivedNickMsgs.get(`${from}:${to}`);
    let length = this.lengthNickMsgs.get(`${from}:${to}`);

    if (!msgs) msgs = '';
    if (!length) length = BigInt(0);

    if (msgs.length === Number(length)) {
      const msgBuf = Buffer.from(msg, 'hex');
      const reader = new BufferReader(msgBuf);
      length = reader.readBigSize();
      msgs = '';

      const writer = new BufferWriter();
      writer.writeBigSize(length);
      const lengthStr = writer.toBuffer().toString('hex');
      msgs = msg.substring(lengthStr.length, msg.length);

      this.lengthNickMsgs.set(`${from}:${to}`, length);
    } else {
      msgs += msg;
    }
    this.receivedNickMsgs.set(`${from}:${to}`, msgs);

    if (msgs.length === Number(length)) {
      this._emitMsg(from, to, msgs);
    }
  }

  protected _emitMsg(from: string, to: string, msg: string): void {
    this.emit('message', from, to, msg);
    this.logger.debug('message', from, to, msg);
  }
}
