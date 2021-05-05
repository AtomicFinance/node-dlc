import irc from 'irc';
import { Callback } from '../callback';
import { Transporter } from '../transporter';

export class Irc {
  public client: irc.Client;
  private transporter: Transporter;

  constructor(
    server: string,
    nick: string,
    port: number,
    channels: string[],
    transporter: Transporter,
  ) {
    this.client = new irc.Client(server, nick, {
      port,
      debug: true,
      secure: true,
      channels: channels,
    });
    this.transporter = transporter;

    this.client.addListener('error', (message) => {
      console.error('ERROR: %s: %s', message.command, message.args.join(' '));
    });

    this.client.addListener('pm', (nick, message) => {
      console.log('Got private message from %s: %s', nick, message);
    });
  }
}
