/* eslint-disable @typescript-eslint/require-await */
import { OutPoint } from '@node-dlc/bitcoin';
import { ShortChannelId, shortChannelIdFromNumber } from '@node-dlc/common';

import { ChannelAnnouncementMessage } from '../messages/ChannelAnnouncementMessage';
import { ChannelUpdateMessage } from '../messages/ChannelUpdateMessage';
import { ExtendedChannelAnnouncementMessage } from '../messages/ExtendedChannelAnnouncementMessage';
import { NodeAnnouncementMessage } from '../messages/NodeAnnouncementMessage';
import { IGossipStore } from './GossipStore';

/**
 * In-memory implementation of the IGossipStore.
 */
export class GossipMemoryStore implements IGossipStore {
  private _channelAnn = new Map<bigint, ChannelAnnouncementMessage>();
  private _channelByOutPoint = new Map<string, bigint>();
  private _channelUpd = new Map<bigint, ChannelUpdateMessage>();
  private _nodeAnn = new Map<string, NodeAnnouncementMessage>();
  private _nodeChannels = new Map<string, Set<bigint>>();

  public get channelAnnouncementCount() {
    return this._channelAnn.size;
  }

  public get channelUpdateCount() {
    return this._channelUpd.size;
  }

  public get nodeAnnouncementCount() {
    return this._nodeAnn.size;
  }

  public async saveChannelAnnouncement(
    msg: ChannelAnnouncementMessage,
  ): Promise<void> {
    const chanKey = getChanKey(msg.shortChannelId);
    this._channelAnn.set(chanKey, msg);
    if (msg instanceof ExtendedChannelAnnouncementMessage) {
      this._channelByOutPoint.set(
        msg.outpoint.toString(),
        msg.shortChannelId.toNumber(),
      );
    }
    await this._saveNodeChannel(msg.nodeId1, chanKey);
    await this._saveNodeChannel(msg.nodeId2, chanKey);
  }

  public async saveChannelUpdate(msg: ChannelUpdateMessage): Promise<void> {
    this._channelUpd.set(
      getChanUpdKey(getChanKey(msg.shortChannelId), msg.direction),
      msg,
    );
  }

  public async saveNodeAnnouncement(
    msg: NodeAnnouncementMessage,
  ): Promise<void> {
    this._nodeAnn.set(getNodeKey(msg.nodeId), msg);
  }

  public async findChannelsForNode(nodeId: Buffer): Promise<ShortChannelId[]> {
    const scidInts = this._nodeChannels.get(getNodeKey(nodeId));
    const results: ShortChannelId[] = [];
    if (!scidInts) return results;
    for (const scidInt of scidInts) {
      results.push(shortChannelIdFromNumber(scidInt));
    }
    return results;
  }

  public async findNodeAnnouncement(
    nodeId: Buffer,
  ): Promise<NodeAnnouncementMessage> {
    return this._nodeAnn.get(getNodeKey(nodeId));
  }

  public async findNodeAnnouncements(): Promise<NodeAnnouncementMessage[]> {
    return Array.from(this._nodeAnn.values());
  }

  public async findChannelAnnouncemnts(): Promise<
    ChannelAnnouncementMessage[]
  > {
    return Array.from(this._channelAnn.values());
  }

  public async findChannelAnnouncement(
    scid: ShortChannelId,
  ): Promise<ChannelAnnouncementMessage> {
    return this._channelAnn.get(getChanKey(scid));
  }

  public async findChannelAnnouncementByOutpoint(
    outpoint: OutPoint,
  ): Promise<ChannelAnnouncementMessage> {
    const scidNum = this._channelByOutPoint.get(outpoint.toString());
    return this._channelAnn.get(scidNum);
  }

  public async findChannelUpdate(
    scid: ShortChannelId,
    dir: number,
  ): Promise<ChannelUpdateMessage> {
    return this._channelUpd.get(getChanUpdKey(getChanKey(scid), dir));
  }

  public async deleteChannelAnnouncement(scid: ShortChannelId): Promise<void> {
    const msg = await this.findChannelAnnouncement(scid);
    if (!msg) return;
    const chanKey = getChanKey(scid);

    // delete channel
    this._channelAnn.delete(getChanKey(scid));

    // delete outpoint link
    if (msg instanceof ExtendedChannelAnnouncementMessage) {
      this._channelByOutPoint.delete(msg.outpoint.toString());
    }

    // delete channel_updates
    this._channelUpd.delete(getChanUpdKey(scid.toNumber(), 0));
    this._channelUpd.delete(getChanUpdKey(scid.toNumber(), 0));

    // delete node links
    this._nodeChannels.get(getNodeKey(msg.nodeId1)).delete(chanKey);
    this._nodeChannels.get(getNodeKey(msg.nodeId2)).delete(chanKey);
  }

  public async deleteChannelUpdate(scid: ShortChannelId, dir: number) {
    this._channelUpd.delete(getChanUpdKey(getChanKey(scid), dir));
  }

  public async deleteNodeAnnouncement(nodeId: Buffer) {
    this._nodeAnn.delete(getNodeKey(nodeId));
    this._nodeChannels.get(getNodeKey(nodeId));
  }

  private async _saveNodeChannel(nodeId: Buffer, chanKey: bigint) {
    const nodeKey = getNodeKey(nodeId);
    this._nodeChannels.set(
      nodeKey,
      this._nodeChannels.get(nodeKey) || new Set<bigint>(),
    );
    this._nodeChannels.get(nodeKey).add(chanKey);
  }
}

function getNodeKey(nodeId: Buffer): string {
  return nodeId.toString('hex');
}

function getChanKey(scid: ShortChannelId): bigint {
  return scid.toNumber();
}

function getChanUpdKey(chanKey: bigint, direction: number): bigint {
  return (chanKey << BigInt(8)) | BigInt(direction);
}
