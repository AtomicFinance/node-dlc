// tslint:disable: max-classes-per-file
// tslint:disable: no-unused-expression
import { BitField } from '@node-dlc/common';
import { ILogger } from '@node-dlc/logger';
import * as noise from '@node-dlc/noise';
import { expect } from 'chai';
import sinon from 'sinon';
import { Duplex } from 'stream';

import { IWireMessage } from '../lib';
import { InitFeatureFlags } from '../lib/flags/InitFeatureFlags';
import { Peer } from '../lib/Peer';
import { PeerState } from '../lib/PeerState';
import { PingPongState } from '../lib/PingPongState';
import { createFakeLogger } from './_test-utils';

class FakeSocket extends Duplex {
  [x: string]: any;
  public outgoing: Buffer[] = [];

  constructor() {
    super();
    this.end = sinon.spy(this.end.bind(this));
    this.rpk = Buffer.alloc(33);
  }

  public _write(
    data: any,
    encoding: BufferEncoding,
    cb: (err?: Error) => void,
  ) {
    this.outgoing.push(data);
    cb();
  }

  public _read() {
    // nada
  }

  public simReceive(data: Buffer) {
    this.push(data);
  }
}

class FakeMessage implements IWireMessage {
  public type = 3;

  [x: string]: any;

  constructor(msg) {
    this.msg = msg;
  }
  public serialize() {
    return Buffer.from(this.msg);
  }
}

describe('Peer', () => {
  let chainHashes: Buffer[];
  let sut: Peer;
  let ls: Buffer;
  let rpk: Buffer;
  let logger: ILogger;
  let sandbox: sinon.SinonSandbox;
  let socket: FakeSocket;
  let localFeatures: BitField<InitFeatureFlags>;

  beforeEach(() => {
    chainHashes = [Buffer.alloc(32, 0xff)];
    localFeatures = new BitField<InitFeatureFlags>();
    localFeatures.set(InitFeatureFlags.optionDataLossProtectOptional);
    ls = Buffer.alloc(32, 0);
    rpk = Buffer.alloc(32, 1);
    logger = createFakeLogger();
    sut = new Peer(ls, localFeatures, chainHashes, logger, 1);
    socket = new FakeSocket();
    sut.pingPongState = sinon.createStubInstance(PingPongState) as any;
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('.connect()', () => {
    beforeEach(() => {
      sandbox.stub(noise, 'connect').returns(socket as any);
      sandbox.stub(sut, '_onSocketReady' as any);
      sandbox.stub(sut, '_onSocketClose' as any);
      sandbox.stub(sut, '_onSocketError' as any);
      sandbox.stub(sut, '_onSocketReadable' as any);
      sut.connect(rpk, '127.0.0.1', 9735);
    });

    it('should be initiator', () => {
      expect(sut.isInitiator).to.equal(true);
    });

    it('should bind to ready', () => {
      socket.emit('ready');
      expect((sut as any)._onSocketReady.called).to.be.true;
    });

    it('should bind close', () => {
      socket.emit('close');
      expect((sut as any)._onSocketClose.called).to.be.true;
    });

    it('should bind error', () => {
      socket.emit('error');
      expect((sut as any)._onSocketError.called).to.be.true;
    });

    it('should bind readable', () => {
      socket.emit('readable');
      expect((sut as any)._onSocketReadable.called).to.be.true;
    });
  });

  describe('.attach()', () => {
    beforeEach(() => {
      sandbox.stub(sut, '_onSocketReady' as any);
      sandbox.stub(sut, '_onSocketClose' as any);
      sandbox.stub(sut, '_onSocketError' as any);
      sandbox.stub(sut, '_onSocketReadable' as any);
      sut.attach(socket as any);
    });

    it('should not be initiator', () => {
      expect(sut.isInitiator).to.equal(false);
    });

    it('should bind to ready', () => {
      socket.emit('ready');
      expect((sut as any)._onSocketReady.called).to.be.true;
    });

    it('should bind close', () => {
      socket.emit('close');
      expect((sut as any)._onSocketClose.called).to.be.true;
    });

    it('should bind error', () => {
      socket.emit('error');
      expect((sut as any)._onSocketError.called).to.be.true;
    });

    it('should bind readable', () => {
      socket.emit('readable');
      expect((sut as any)._onSocketReadable.called).to.be.true;
    });
  });

  describe('when connected', () => {
    beforeEach(() => {
      sut.attach(socket as any);
    });

    describe('.sendMessage()', () => {
      it('should throw when not ready', () => {
        expect(() =>
          sut.sendMessage(new FakeMessage('hello') as any),
        ).to.throw();
      });

      it('should send the serialized message', () => {
        const input = new FakeMessage('test');
        sut.state = Peer.states.Ready;
        sut.sendMessage(input);
        expect((socket as any).outgoing[0]).to.deep.equal(Buffer.from('test'));
      });

      it('should emit a sending message', (done) => {
        const input = new FakeMessage('test');
        sut.state = Peer.states.Ready;
        sut.on('sending', () => done());
        sut.sendMessage(input);
      });
    });

    describe('.disconnect()', () => {
      it('should stop the socket', () => {
        sut.disconnect();
        expect((sut.socket as any).end.called).to.be.true;
      });

      it('should change the peer state to disconnecting', () => {
        sut.disconnect();
        expect(sut.state).to.equal(PeerState.Disconnecting);
      });
    });

    describe('.reconnect()', () => {
      it('should stop the socket', () => {
        sut.reconnect();
        expect((sut.socket as any).end.called).to.be.true;
      });

      it('should retain the peer state', () => {
        const beforeState = sut.state;
        sut.reconnect();
        expect(sut.state).to.equal(beforeState);
      });
    });

    describe('._onSocketReady()', () => {
      it('should transition state to awaiting_peer_init', () => {
        (sut as any)._onSocketReady();
        expect(sut.state).to.equal(Peer.states.AwaitingPeerInit);
      });

      it('should send the init message to the peer', () => {
        (sut as any)._onSocketReady();
        expect((socket as any).outgoing[0]).to.deep.equal(
          Buffer.from(
            '001000000001020120ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            'hex',
          ),
        );
      });
    });

    describe('_onSocketClose', () => {
      it('should stop the ping pong state', () => {
        sut.state = PeerState.Disconnecting;
        (sut as any)._onSocketClose();
        expect((sut as any).pingPongState.onDisconnecting.called).to.be.true;
      });

      describe('when disconnecting', () => {
        it('should emit the close event', (done) => {
          sut.state = PeerState.Disconnecting;
          sut.on('close', () => done());
          (sut as any)._onSocketClose();
        });
      });

      describe('when initiator', () => {
        it('should trigger reconnect', (done) => {
          sut.state = PeerState.Ready;
          sut.reconnectTimeoutMs = 0;
          sut.connect = sandbox.stub(sut, 'connect');
          sut.isInitiator = true;
          (sut as any)._onSocketClose();
          setTimeout(() => {
            expect((sut.connect as any).called).to.be.true;
            done();
          }, 50);
        });
      });

      describe('when not initiator', () => {
        it('should not trigger reconnect', (done) => {
          sut.state = PeerState.Ready;
          sut.reconnectTimeoutMs = 0;
          sut.connect = sandbox.stub(sut, 'connect');
          sut.isInitiator = false;
          (sut as any)._onSocketClose();
          setTimeout(() => {
            expect((sut.connect as any).called).to.be.false;
            done();
          }, 50);
        });
      });
    });

    describe('_onSocketError', () => {
      it('should emit error event', (done) => {
        sut.on('error', () => done());
        (sut as any)._onSocketError();
      });
    });

    describe('_sendInitMessage', () => {
      it('should send the initialization message', () => {
        (sut as any)._sendInitMessage();
        expect((socket as any).outgoing[0]).to.deep.equal(
          Buffer.from(
            '001000000001020120ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            'hex',
          ),
        );
      });
    });

    describe('_processPeerInitMessage', () => {
      let input;

      beforeEach(() => {
        input = Buffer.from('001000000000', 'hex');
      });

      it('it should fail if not init message', () => {
        input = Buffer.from('001100000000', 'hex');
        expect(() => (sut as any)._processPeerInitMessage(input)).to.throw();
      });

      it('should start ping state', () => {
        (sut as any)._processPeerInitMessage(input);
        expect((sut as any).pingPongState.start.called).to.be.true;
      });

      it('should change the state to ready', () => {
        (sut as any)._processPeerInitMessage(input);
        expect(sut.state).to.equal(Peer.states.Ready);
      });

      it('should capture the init features', () => {
        input = Buffer.from('00100000000109', 'hex');
        (sut as any)._processPeerInitMessage(input);
        expect(sut.remoteFeatures).to.be.instanceof(BitField);
        expect(
          sut.remoteFeatures.isSet(
            InitFeatureFlags.optionDataLossProtectRequired,
          ),
        );
        expect(
          sut.remoteFeatures.isSet(InitFeatureFlags.initialRoutingSyncOptional),
        );
      });

      it('should emit ready', (done) => {
        sut.on('ready', () => done());
        (sut as any)._processPeerInitMessage(input);
      });

      it('should be ok with no remote chainhash', () => {
        input = Buffer.from('00100000000109', 'hex');
        (sut as any)._processPeerInitMessage(input);
      });

      it('should be ok with single chain_hash', () => {
        input = Buffer.from(
          '00100000000109' +
            '0120' +
            'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          'hex',
        );
        (sut as any)._processPeerInitMessage(input);
        expect(sut.remoteChains.length).to.equal(1);
        expect(sut.remoteChains[0].toString('hex')).to.equal('ff'.repeat(32));
      });

      it('should be ok with multiple chain_hashes', () => {
        input = Buffer.from(
          '00100000000109' +
            '0140' +
            'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
            'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          'hex',
        );
        (sut as any)._processPeerInitMessage(input);
        expect(sut.remoteChains.length).to.equal(2);
        expect(sut.remoteChains[0].toString('hex')).to.equal('ff'.repeat(32));
        expect(sut.remoteChains[1].toString('hex')).to.equal('ee'.repeat(32));
      });

      it('should disconnect with no chainhash match', () => {
        input = Buffer.from(
          '00100000000109' +
            '0120' +
            'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          'hex',
        );
        (sut as any)._processPeerInitMessage(input);
        expect(sut.state).to.equal(PeerState.Disconnecting);
      });

      it('should stay connected when local odd no remote feature', () => {
        // enable compulsory (bit 0)
        (sut as any).localFeatures = new BitField<InitFeatureFlags>();
        sut.localFeatures.set(InitFeatureFlags.optionDataLossProtectOptional);

        // remote optional (bit 1)
        input = Buffer.from('00100000000100', 'hex');
        (sut as any)._processPeerInitMessage(input);
        expect(sut.state).to.equal(PeerState.Ready);
      });

      it('should stay connected when local even/remote even feature', () => {
        // enable compulsory (bit 0)
        sut.localFeatures.set(InitFeatureFlags.optionDataLossProtectRequired);

        // remote optional (bit 1)
        input = Buffer.from('00100000000102', 'hex');
        (sut as any)._processPeerInitMessage(input);
        expect(sut.state).to.equal(PeerState.Ready);
      });

      it('should stay connected with local even/remote even feature', () => {
        // enable compulsory (bit 0)
        sut.localFeatures.set(InitFeatureFlags.optionDataLossProtectRequired);

        // remote optional (bit 1)
        input = Buffer.from('00100000000101', 'hex');
        (sut as any)._processPeerInitMessage(input);
        expect(sut.state).to.equal(PeerState.Ready);
      });

      it('should disconnect with local even missing remote feature', () => {
        // enable compulsory (bit 0)
        sut.localFeatures.set(InitFeatureFlags.optionDataLossProtectRequired);

        // remote optional (bit 1)
        input = Buffer.from('00100000000100', 'hex');
        (sut as any)._processPeerInitMessage(input);
        expect(sut.state).to.equal(PeerState.Disconnecting);
      });
    });

    describe('_processMessage', () => {
      let input;
      let msg;

      beforeEach(() => {
        input = Buffer.from('001000000000', 'hex');
      });

      describe('when valid message', () => {
        it('should log with ping service', () => {
          msg = (sut as any)._processMessage(input);
          expect((sut as any).pingPongState.onMessage.called).to.be.true;
        });

        it('should emit the message', () => {
          expect(msg.type).to.equal(16);
        });
      });
    });

    describe('_onSocketReadable', () => {
      it('should read peer init message when awaiting_peer_init state', (done) => {
        sut.state = Peer.states.AwaitingPeerInit;
        sut.on('ready', () => done());
        socket.simReceive(Buffer.from('001000000000', 'hex'));
      });

      it('should process message when in ready state', (done) => {
        sut.state = Peer.states.Ready;
        sut.on('readable', () => {
          done();
        });
        socket.simReceive(Buffer.from('001000000000', 'hex'));
      });

      describe('on error', () => {
        it('should close the socket', (done) => {
          sut.state = Peer.states.Ready;
          sut.on('error', () => {
            expect((socket as any).end.called).to.be.true;
            done();
          });
          socket.simReceive(Buffer.from('0010', 'hex'));
        });
        it('should emit an error event', (done) => {
          sut.state = Peer.states.Ready;
          sut.on('error', () => done());
          socket.simReceive(Buffer.from('0010', 'hex'));
        });
      });
    });
  });
});
