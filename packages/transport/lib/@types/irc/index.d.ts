declare module 'irc' {
  import events = require('events');

  /** Represents a single nick connected to a single IRC server. */
  export interface Client extends events.EventEmitter {
    /**
     * Sends a raw message to the server; generally speaking, it’s
     * best not to use this method unless you know what you’re doing. */
    send(command: string, ...args: string[]): void;

    /**
     * Joins the specified channel.
     * @param channel Channel to join
     * @param callback Callback  automatically subscribed to the join#channel
     * event, but removed after the first invocation. channel supports multiple
     * JOIN arguments as a space separated string (similar to the IRC protocol).
     */
    join(channel: string, callback?: (arg: any) => void): void;

    /**
     * Parts the specified channel.
     * @param channel Channel to part
     * @param message Optional message to send upon leaving the channel
     */
    part(channel: string, message: string): void;

    /**
     * Parts the specified channel.
     * @param channel Channel to part
     * @param message Optional message to send upon leaving the channel
     * @param callback Callback to automatically subscribed to the part#channel
     * event, but removed after the first invocation.
     */
    part(channel: string, message: string, callback: (arg: any) => void): void;

    /**
     * Sends a message to the specified target.
     * @param target is either a nickname, or a channel.
     * @param message the message to send to the target.
     */
    say(target: string, message: string): void;

    /**
     * Sends a CTCP message to the specified target.
     * @param target is either a nickname, or a channel.
     * @param type the type of the CTCP message. Specify “privmsg” for a PRIVMSG, and anything else for a NOTICE.
     * @param text the CTCP message to send.
     */
    ctcp(target: string, type: string, text: string): void;

    /**
     * Sends an action to the specified target.
     * @param target is either a nickname, or a channel.
     * @param message
     */
    action(target: string, message: string): void;

    /**
     * Sends a notice to the specified target.
     * @param target is either a nickname, or a channel.
     * @param message the message to send as a notice to the target.
     */
    notice(target: string, message: string): void;

    /**
     * Request a whois for the specified nick.
     * @param nick is a nickname
     * @param callback Callback to invoke when the server finished
     * generating the whois information and is passed the same
     * information as a 'whois' event.
     */
    whois(nick: string, callback: (arg: any) => void): void;

    /**
     * Request a channel listing from the server. Responses from the server
     * are available via the channellist_start, channellist_item, and
     * channellist events.
     * @param args  The arguments for this method are fairly server
     * specific, this method just passes them through exactly as specified.
     */
    list(args: string[]): void;

    /**
     * Connects to the server. Used when autoConnect in the options is set to
     *  false.
     * @param retryCount Optional number of times to attempt reconnection
     * @param callback Optional callback
     */
    connect(retryCount?: number, callback?: (arg: any) => void): void;

    /**
     * Disconnects from the IRC server. If message is a function it will be
     * treated as the callback (i.e. both arguments to this function are optional).
     * @param message Optional message to send when disconnecting.
     * @param callback  Optional callback
     */
    disconnect(message?: string, callback?: (arg: any) => void): void;

    /**
     * Activates flood protection “after the fact”. You can also use
     * floodProtection while instantiating the Client to enable
     * flood protection, and floodProtectionDelay to set the default
     * message interval.
     * @param interval Optional configuration for amount of time to wait
     * between messages. Takes value from client configuration if unspecified.
     */
    activateFloodProtection(interval?: number): void;
  }

  /** Represents a single nick connected to a single IRC server. */
  interface ClientClass {
    /** Creates a new instance of the Client
     * @param server IP address or host name
     * @param nick Name displayed in chat
     */
    new (server: string, nick: string, opt?: ClientOptions): Client;
  }

  /** Used to create the Client object */
  export interface ClientOptions {
    /** Logon name */
    userName?: string;

    /** Password or token */
    password?: string;

    /** Your actual name or just something cool */
    realName?: string;

    /** Portnumber, use if not connecting to default port. */
    port?: number;

    /** the address to bind to when connecting */
    localAddress?: string;

    /** Set to true to emit timestamped messages to the console using util.log when certain events are fired. */
    debug?: boolean;

    showErrors?: boolean;

    /** rejoin channels after being kicked */
    autoRejoin?: boolean;

    /** Setting to false prevents the Client from connecting on instantiation.
     * You will need to call connect() on the client instance. */
    autoConnect?: boolean;

    /** List of channesl to join on connect */
    channels?: string[];

    /** (SSL connection) can be a true value or an object (the
     *  kind of object returned from crypto.createCredentials())
     *  specifying cert etc for validation.  */
    secure?: boolean;

    /** If you set selfSigned
     *  to true SSL accepts certificates from a non trusted CA. */
    selfSigned?: boolean;

    /** If you set certExpired to true, the bot connects even if the ssl
     *  cert has expired. */
    certExpired?: boolean;

    /** Wueues all your messages and slowly unpacks it to make sure that
     *  we won’t get kicked out because for Excess Flood. You can also use
     *  Client.activateFloodProtection() to activate flood protection after
     *  instantiating the client. */
    floodProtection?: boolean;

    /** sets the amount of time that the client will wait between sending
     * subsequent messages when floodProtection is enabled. */
    floodProtectionDelay?: number;

    /** Set sasl to true to enable SASL support. You’ll also want to set nick,
     *  userName, and password for authentication. */
    sasl?: boolean;

    /** is the number of times the client will try to automatically
     *  reconnect when disconnected. It defaults to 0. */
    retryCount?: number;

    /** is the number of milliseconds to wait before retying to automatically
     * reconnect when disconnected. It defaults to 2000. */
    retryDelay?: number;

    /** removes mirc colors (0x03 followed by one or two ascii numbers for
     * foreground,background) and ircII “effect” codes (0x02 bold, 0x1f
     * underline, 0x16 reverse, 0x0f reset) from the entire message before
     * parsing it and passing it along. */
    stripColors?: boolean;

    channelPrefixes?: string;

    /**will split up large messages sent with the say method into multiple
     * messages of length fewer than messageSplit characters. */
    messageSplit?: number;

    /**With encoding you can set IRC bot to convert all messages to specified
     *  character set. If you don’t want to use this just leave value blank or
     *  false. Example values are UTF-8, ISO-8859-15, etc. */
    encoding?: string;
  }

  export const Client: ClientClass;

  export const colors: {
    wrap(color: string, text: string, reset_color?: string): string;
  };
}
