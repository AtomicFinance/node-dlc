import { OutPoint } from '@node-dlc/bitcoin';
import { ShortChannelId } from '@node-dlc/common';
import { ChannelAnnouncementMessage } from '../messages/ChannelAnnouncementMessage';
import { ChannelUpdateMessage } from '../messages/ChannelUpdateMessage';
import { NodeAnnouncementMessage } from '../messages/NodeAnnouncementMessage';

/**
 * Interface for storing, finding, and deleting gossip messages.
 */
export interface IGossipStore {
  findChannelAnnouncemnts(): Promise<ChannelAnnouncementMessage[]>;
  findChannelsForNode(nodeId: Buffer): Promise<ShortChannelId[]>;
  findNodeAnnouncement(nodeId: Buffer): Promise<NodeAnnouncementMessage>;
  findNodeAnnouncements(): Promise<NodeAnnouncementMessage[]>;
  findChannelAnnouncement(
    scid: ShortChannelId,
  ): Promise<ChannelAnnouncementMessage>;
  findChannelAnnouncementByOutpoint(
    outpoint: OutPoint,
  ): Promise<ChannelAnnouncementMessage>;
  findChannelUpdate(
    scid: ShortChannelId,
    dir: number,
  ): Promise<ChannelUpdateMessage>;
  saveChannelAnnouncement(msg: ChannelAnnouncementMessage): Promise<void>;
  saveChannelUpdate(msg: ChannelUpdateMessage): Promise<void>;
  saveNodeAnnouncement(msg: NodeAnnouncementMessage): Promise<void>;
  deleteChannelAnnouncement(scid: ShortChannelId): Promise<void>;
  deleteChannelUpdate(scid: ShortChannelId, dir: number): Promise<void>;
  deleteNodeAnnouncement(nodeId: Buffer): Promise<void>;
}
