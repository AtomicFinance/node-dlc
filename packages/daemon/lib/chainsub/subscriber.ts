import { BlockHandler, TxHandler } from './handlers';

export interface Subscriber {
  subscribe(blockHandler: BlockHandler, txHandler: TxHandler): void;
}
