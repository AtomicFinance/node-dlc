import { ConsoleTransport, Logger } from '@node-lightning/logger';
import util from 'util';
import { Callback } from './callback';
import { ITransport } from './transport';

export interface ITransporter {
  send(msg: string);
}

export class Transporter implements ITransporter {
  public readonly area: string;
  public readonly instance: string;
  public readonly format: boolean;

  private callback: Callback;
  public logger: Logger;

  private _transports: ITransport[];
  private _root: Transporter;

  constructor(logger: Logger, callback: Callback) {
    this._root = this;
    this.callback = callback;
    this.logger = logger;
    this._transports = [];
  }

  /**
   * Gets the available transports
   */
  get transports(): ITransport[] {
    return this._root._transports;
  }

  public send(msg: string): void {
    for (const transport of this._root.transports) {
      transport.send(msg);
    }
  }

  public receive(msg: string): void {
    this.callback(msg);
  }
}
