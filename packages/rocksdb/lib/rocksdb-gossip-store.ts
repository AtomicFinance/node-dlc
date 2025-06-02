/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BufferReader } from '@node-dlc/bufio';
import { ShortChannelId } from '@node-dlc/core';
import { shortChannelIdFromBuffer } from '@node-dlc/core';
import { OutPoint } from '@node-dlc/core';
import { IGossipStore } from '@node-dlc/wire';
import { NodeAnnouncementMessage } from '@node-dlc/wire';
import { ChannelAnnouncementMessage } from '@node-dlc/wire';
import { ExtendedChannelAnnouncementMessage } from '@node-dlc/wire';
import { ChannelUpdateMessage } from '@node-dlc/wire';

import { RocksdbBase } from './rocksdb-base';

enum Prefix {
  ChannelAnnouncement = 1,
  ChannelUpdate = 2,
  NodeAnnouncement = 3,
  ChannelsForNode = 4,
  Outpoint = 5,
  NodeId = 70,
}

export class RocksdbGossipStore extends RocksdbBase implements IGossipStore {
  public async findNodeIdByNick(nick: string): Promise<Buffer> {
    const key = Buffer.concat([
      Buffer.from([Prefix.NodeId]),
      Buffer.from(nick),
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return raw;
  }

  public async saveNodeIdByNick(
    msg: NodeAnnouncementMessage,
    nick: string,
  ): Promise<void> {
    await this.saveNodeAnnouncement(msg);

    const value = msg.nodeId;
    const key = Buffer.concat([
      Buffer.from([Prefix.NodeId]),
      Buffer.from(nick),
    ]);
    await this._db.put(key, value);
  }

  public async deleteNodeIdByNick(nick: string): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.NodeId]),
      Buffer.from(nick),
    ]);
    await this._db.del(key);
  }

  public async findChannelAnnouncemnts(): Promise<
    ChannelAnnouncementMessage[]
  > {
    const results: ChannelAnnouncementMessage[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.ChannelAnnouncement) {
          results.push(ExtendedChannelAnnouncementMessage.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findNodeAnnouncements(): Promise<NodeAnnouncementMessage[]> {
    const results: NodeAnnouncementMessage[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.NodeAnnouncement) {
          results.push(NodeAnnouncementMessage.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findChannelsForNode(nodeId: Buffer): Promise<ShortChannelId[]> {
    const key = Buffer.concat([Buffer.from([Prefix.ChannelsForNode]), nodeId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return [];

    const reader = new BufferReader(raw);
    const results = [];
    while (!reader.eof) {
      results.push(shortChannelIdFromBuffer(reader.readBytes(8)));
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return results;
  }

  public async findNodeAnnouncement(
    nodeId: Buffer,
  ): Promise<NodeAnnouncementMessage> {
    const key = Buffer.concat([Buffer.from([Prefix.NodeAnnouncement]), nodeId]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return NodeAnnouncementMessage.deserialize(raw);
  }

  public async findChannelAnnouncement(
    scid: ShortChannelId,
  ): Promise<ChannelAnnouncementMessage> {
    const key = Buffer.concat([
      Buffer.from([Prefix.ChannelAnnouncement]),
      scid.toBuffer(),
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return ExtendedChannelAnnouncementMessage.deserialize(raw);
  }

  public async findChannelAnnouncementByOutpoint(
    outpoint: OutPoint,
  ): Promise<ChannelAnnouncementMessage> {
    const key = Buffer.concat([
      Buffer.from([Prefix.Outpoint]),
      Buffer.from(outpoint.toString()),
    ]);
    const scidBuf = await this._safeGet<Buffer>(key);
    if (!scidBuf) return;
    const key2 = Buffer.concat([
      Buffer.from([Prefix.ChannelAnnouncement]),
      scidBuf,
    ]);
    const raw = await this._safeGet<Buffer>(key2);
    if (!raw) return;
    return ExtendedChannelAnnouncementMessage.deserialize(raw);
  }

  public async findChannelUpdate(
    scid: ShortChannelId,
    dir: number,
  ): Promise<ChannelUpdateMessage> {
    const key = Buffer.concat([
      Buffer.from([Prefix.ChannelUpdate]),
      scid.toBuffer(),
      Buffer.from([dir]),
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return ChannelUpdateMessage.deserialize(raw);
  }

  public async saveChannelAnnouncement(
    msg: ChannelAnnouncementMessage,
  ): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.ChannelAnnouncement]),
      msg.shortChannelId.toBuffer(),
    ]);
    const value = msg.serialize();
    await this._db.put(key, value);

    // store outpoint reference
    if (msg instanceof ExtendedChannelAnnouncementMessage) {
      const key2 = Buffer.concat([
        Buffer.from([Prefix.Outpoint]),
        Buffer.from(msg.outpoint.toString()),
      ]);
      await this._db.put(key2, msg.shortChannelId.toBuffer());
    }

    // store channel-node refererences
    await this._saveNodeChannel(msg.shortChannelId, msg.nodeId1);
    await this._saveNodeChannel(msg.shortChannelId, msg.nodeId2);
  }

  public async saveChannelUpdate(msg: ChannelUpdateMessage): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.ChannelUpdate]),
      msg.shortChannelId.toBuffer(),
      Buffer.from([msg.direction]),
    ]);
    const value = msg.serialize();
    await this._db.put(key, value);
  }

  public async saveNodeAnnouncement(
    msg: NodeAnnouncementMessage,
  ): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.NodeAnnouncement]),
      msg.nodeId,
    ]);
    const value = msg.serialize();
    await this._db.put(key, value);
  }

  public async deleteChannelAnnouncement(scid: ShortChannelId): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.ChannelAnnouncement]),
      scid.toBuffer(),
    ]);

    const msg = await this.findChannelAnnouncement(scid);
    if (!msg) return;

    // delete channel updates
    await this.deleteChannelUpdate(scid, 0);
    await this.deleteChannelUpdate(scid, 1);

    // delete node/channel links
    await this._deleteNodeChannel(scid, msg.nodeId1);
    await this._deleteNodeChannel(scid, msg.nodeId2);

    // finally delete reference
    await this._db.del(key);
  }

  public async deleteChannelUpdate(
    scid: ShortChannelId,
    dir: number,
  ): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.ChannelUpdate]),
      scid.toBuffer(),
      Buffer.from([dir]),
    ]);
    await this._db.del(key);
  }

  public async deleteNodeAnnouncement(nodeId: Buffer): Promise<void> {
    const key = Buffer.concat([Buffer.from([Prefix.NodeAnnouncement]), nodeId]);
    await this._deleteNodeChannels(nodeId);
    await this._db.del(key);
  }

  private async _deleteNodeChannel(scid: ShortChannelId, nodeId: Buffer) {
    const scids = await this.findChannelsForNode(nodeId);
    if (!scids.length) return;
    const scidKey = scid.toString();
    const index = scids.findIndex((p) => p.toString() === scidKey);
    if (index === -1) return;
    scids.splice(index, 1);
    await this._putNodeChannels(nodeId, scids);
  }

  private async _deleteNodeChannels(nodeId: Buffer) {
    const key = Buffer.concat([Buffer.from([Prefix.ChannelsForNode]), nodeId]);
    await this._db.del(key);
  }

  private async _saveNodeChannel(scid: ShortChannelId, nodeId: Buffer) {
    const scids = await this.findChannelsForNode(nodeId);
    const scidKey = scid.toString();
    for (const s of scids) {
      if (s.toString() === scidKey) return;
    }
    scids.push(scid);
    await this._putNodeChannels(nodeId, scids);
  }

  private async _putNodeChannels(nodeId: Buffer, scids: ShortChannelId[]) {
    const key = Buffer.concat([Buffer.from([Prefix.ChannelsForNode]), nodeId]);
    const value = Buffer.concat(scids.map((p) => p.toBuffer()));
    await this._db.put(key, value);
  }
}
