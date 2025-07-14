export * from '@node-dlc/bitcoin';

// Explicitly re-export commonly used types from bitcoin for better TypeScript support
export * from './AsyncProcessingQueue';
export * from './Base32';
export * from './BigIntUtils';
export * from './BitField';
export * from './ChannelId';
export * from './LinkedList';
export * from './LinkedListNode';
export * from './Queue';
export * from './ShortChannelId';
export * from './ShortChannelIdUtils';
export {
  HashByteOrder,
  HashValue,
  OutPoint,
  Script,
  Tx,
  TxBuilder,
  TxIn,
  TxOut,
  Value,
} from '@node-dlc/bitcoin';

// Explicitly export the utility functions that wire needs
export {
  shortChannelIdFromBuffer,
  shortChannelIdFromNumber,
  shortChannelIdFromString,
  shortChannelIdToBuffer,
  shortChannelIdToNumber,
  shortChannelIdToString,
} from './ShortChannelIdUtils';

// Lightning subdirectory exports (excluding ChannelId to avoid conflict)
export { ChannelId as LightningChannelId } from './lightning/ChannelId';
export * from './lightning/ChannelKeys';
export * from './lightning/CommitmentNumber';
export * from './lightning/CommitmentSecret';
export * from './lightning/CommitmentSecretStore';
export * from './lightning/Htlc';
export * from './lightning/HtlcDirection';
export * from './lightning/ScriptFactory';
export * from './lightning/TxFactory';

// Original node-dlc core exports
export * from './dlc/CETCalculator';
export * from './dlc/CoinSelect';
export * from './dlc/HyperbolaPayoutCurve';
export * from './dlc/PayoutCurve';
export * from './dlc/PolynomialPayoutCurve';
export * from './dlc/TxBuilder';
export * from './dlc/TxFinalizer';

// Finance subdirectory exports
export * from './dlc/finance/Builder';
export * from './dlc/finance/CoveredCall';
export * from './dlc/finance/CsoInfo';
export * from './dlc/finance/LinearPayout';
export * from './dlc/finance/LongCall';
export * from './dlc/finance/LongPut';
export * from './dlc/finance/OptionInfo';
export * from './dlc/finance/ShortPut';
export * from './utils/BigIntUtils';
export * from './utils/Precision';
