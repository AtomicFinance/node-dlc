import { BitField } from '@node-dlc/common';
import { ILogger } from '@node-dlc/logger';
import { NoiseSocket } from '@node-dlc/noise';
import { NoiseServer } from '@node-dlc/noise';
import { EventEmitter } from 'events';

import { InitFeatureFlags } from './flags/InitFeatureFlags';
import { Peer } from './Peer';

export class PeerServer extends EventEmitter {
  protected _server: NoiseServer;

  constructor(
    readonly host: string,
    readonly port: number,
    readonly localSecret: Buffer,
    readonly localFeatures: BitField<InitFeatureFlags>,
    readonly localChains: Buffer[],
    readonly logger: ILogger,
  ) {
    super();
    this._server = new NoiseServer(
      { ls: localSecret },
      this._onSocket.bind(this),
    );
    this._server.on('listening', () => this.emit('listening'));
  }

  /**
   * Starts the peer manager listening
   * @param host
   * @param port
   */
  public listen() {
    this._server.listen({ host: this.host, port: this.port });
  }

  /**
   * Shuts down the server
   */
  public shutdown() {
    this._server.close();
  }

  /**
   * Handles when a socket connects to us
   * @param socket
   */
  protected _onSocket(socket: NoiseSocket) {
    this.logger.info('peer connected');
    const peer = new Peer(
      this.localSecret,
      this.localFeatures,
      this.localChains,
      this.logger,
    );
    peer.attach(socket);
    this.emit('peer', peer);
  }
}
