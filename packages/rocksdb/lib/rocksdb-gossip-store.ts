import { RocksdbGossipStore as NodeLNRocksdbGossipStore } from '@node-lightning/gossip-rocksdb';
import { NodeAnnouncementMessage } from '@node-lightning/wire';

enum Prefix {
  NodeId = 70,
}

export class RocksdbGossipStore extends NodeLNRocksdbGossipStore {
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
}
