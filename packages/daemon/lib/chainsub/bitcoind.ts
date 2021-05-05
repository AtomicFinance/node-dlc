import { Subscriber } from './subscriber';
import zmq from 'zeromq';
import { Block, Transaction } from 'bitcoinjs-lib';
import { BlockHandler, TxHandler } from './handlers';

export class BitcoindChainSub implements Subscriber {
  private zmqpubrawblock: string;
  private zmqpubrawtx: string;
  private blockSock: zmq.Socket;
  private txSock: zmq.Socket;

  constructor(zmqpubrawblock: string, zmqpubrawtx: string) {
    this.zmqpubrawblock = zmqpubrawblock;
    this.zmqpubrawtx = zmqpubrawtx;
  }

  subscribe(blockHandler: BlockHandler, txHandler: TxHandler): void {
    this.blockSock = zmq.socket('sub');
    this.blockSock.connect(this.zmqpubrawblock);
    this.blockSock.subscribe('rawblock');
    this.blockSock.on('message', (topic, message) => {
      if (topic.toString() === 'rawblock') {
        const block = Block.fromBuffer(message);
        blockHandler(block.getId());
      }
    });

    this.txSock = zmq.socket('sub');
    this.txSock.connect(this.zmqpubrawtx);
    this.txSock.subscribe('rawtx');
    this.txSock.on('message', (topic, message) => {
      if (topic.toString() === 'rawtx') {
        const tx = Transaction.fromBuffer(message);
        txHandler(tx.getId());
      }
    });
  }
}
