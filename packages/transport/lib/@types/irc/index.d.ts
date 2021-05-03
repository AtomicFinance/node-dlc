declare module 'irc' {
  import events = require('events');

  export interface Client extends events.EventEmitter {
    send(command: string, ...args: string[]): void;
    join(channel: string, callback: (arg: any) => void): void;
    part(channel: string, message: string): void;
    part(channel: string, callback: (arg: any) => void, message: string): void;
    say(target: string, message: string): void;
    ctcp(target: string, type: string, text: string): void;
    action(target: string, message: string): void;
    notice(target: string, message: string): void;
    whois(nick: string, callback: (arg: any) => void): void;
    list(args: string[]): void;
    connect(retryCount?: number, callback?: (arg: any) => void): void;
    disconnect(message?: string, callback?: (arg: any) => void): void;
    activateFloodProtection(interval?: number): void;
  }

  interface ClientClass {
    new (server: string, nick: string, opt?: ClientOptions): Client;
  }

  export interface ClientOptions {
    userName?: string;
    realName?: string;
    port?: number;
    localAddress?: string;
    debug?: boolean;
    showErrors?: boolean;
    autoRejoin?: boolean;
    autoConnect?: boolean;
    channels?: string[];
    secure?: boolean;
    selfSigned?: boolean;
    certExpired?: boolean;
    floodProtection?: boolean;
    floodProtectionDelay?: number;
    sasl?: boolean;
    stripColors?: boolean;
    channelPrefixes?: string;
    messageSplit?: number;
    encoding?: string;
  }

  export const Client: ClientClass;

  export const colors: {
    wrap(color: string, text: string, reset_color?: string);
  };
}
