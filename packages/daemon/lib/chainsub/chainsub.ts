import { IArguments } from '../utils/config';
import { BitcoindChainSub } from './bitcoind';
import { BlockHandler, TxHandler } from './handlers';
import { Subscriber } from './subscriber';

export class ChainSub {
  argv: IArguments;
  subscriber: Subscriber;

  constructor(argv: IArguments) {
    this.argv = argv;

    if (argv.electrsapi === undefined || argv.electrsapi === '') {
      const zmqpubrawblock = argv.zmqpubrawblock
        ? argv.zmqpubrawblock
        : `tcp://${argv.host}:28332`;
      const zmqpubrawtx = argv.zmqpubrawtx
        ? argv.zmqpubrawtx
        : `tcp://${argv.host}:28332`;
      this.subscriber = new BitcoindChainSub(zmqpubrawblock, zmqpubrawtx);
    }
  }

  subscribe(blockHandler: BlockHandler, txHandler: TxHandler): void {
    this.subscriber.subscribe(blockHandler, txHandler);
  }
}
