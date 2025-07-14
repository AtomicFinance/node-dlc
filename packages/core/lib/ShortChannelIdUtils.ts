// Re-export ShortChannelId utilities from common package to maintain backward compatibility
export {
  shortChannelIdFromBuffer,
  shortChannelIdFromNumber,
  shortChannelIdFromString,
  shortChannelIdToBuffer,
  shortChannelIdToNumber,
  shortChannelIdToString,
} from '@node-dlc/common';
