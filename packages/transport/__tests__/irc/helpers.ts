import { ILogger, Logger } from '@node-dlc/logger';
import { EventEmitter } from 'events';
import fs from 'fs';
import net from 'net';
import path from 'path';
import sinon from 'sinon';
import tls from 'tls';

export enum IrcPort {
  Secure = 6697,
  Insecure = 6667,
}

export class MockIrcd extends EventEmitter {
  public port: IrcPort;
  public encoding: string;
  public isSecure: boolean;
  public connectionClass: any;
  public options: tls.TlsOptions = {};
  public server: net.Server | tls.Server;
  public incoming = [];
  public outgoing = [];

  constructor(port = IrcPort.Secure, encoding = 'utf-8', isSecure = true) {
    super();
    this.port = port || (isSecure ? 6697 : 6667);
    this.encoding = encoding || 'utf-8';
    this.isSecure = isSecure;

    if (isSecure) {
      this.connectionClass = tls;
      this.options = {
        key: fs.readFileSync(path.resolve(__dirname, 'data/ircd.key')),
        cert: fs.readFileSync(path.resolve(__dirname, 'data/ircd.pem')),
      };
    } else {
      this.connectionClass = net;
    }

    this.server = this.connectionClass.createServer(this.options, function (c) {
      c.on('data', function (data) {
        const msg = data
          .toString(this.encoding)
          .split('\r\n')
          .filter(function (m) {
            return m;
          });
        this.incoming = this.incoming.concat(msg);
      });

      this.on('send', function (data) {
        this.outgoing.push(data);
        c.write(data);
      });

      c.on('end', function () {
        this.emit('end');
      });
    });

    this.server.listen(this.port);
  }

  public send(data) {
    this.emit('send', data);
  }

  public close() {
    this.server.close();
  }

  public getIncomingMsgs() {
    return this.incoming;
  }
}

export const createFakeLogger = (): ILogger => {
  const fake = sinon.createStubInstance(Logger);
  fake.sub = createFakeLogger as any;
  return fake;
};
