// Re-export ShortChannelId utilities from common package to maintain backward compatibility
export {
  shortChannelIdToBuffer,
  shortChannelIdToNumber,
  shortChannelIdFromString,
  shortChannelIdFromBuffer,
  shortChannelIdFromNumber,
  shortChannelIdToString,
} from '@node-dlc/common';
