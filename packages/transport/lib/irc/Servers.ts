interface IrcServer {
  host: string;
  port: number;
}

const primary_server: IrcServer = {
  host: 'irc.libera.chat',
  port: 6697,
};

const secondary_server: IrcServer = {
  host: 'irc.hackint.org',
  port: 6697,
};

const tertiary_server: IrcServer = {
  host: 'agora.anarplex.net',
  port: 14716,
};

export const IrcServers = {
  primary_server,
  secondary_server,
  tertiary_server,
};
