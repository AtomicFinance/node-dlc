import { sha256 } from '@node-lightning/crypto';
import { DlcTxBuilder } from '@node-dlc/core';
import { OrderOfferV0, OrderAcceptV0 } from '@node-dlc/messaging';
import { xor } from '@node-lightning/crypto';
import { RocksdbBase } from '@node-lightning/gossip-rocksdb';

enum Prefix {
  OrderOfferV0 = 40,
  OrderAcceptV0 = 41,
}

export class RocksdbOrderStore extends RocksdbBase {
  public async findOrderOffers(): Promise<OrderOfferV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: OrderOfferV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.OrderOfferV0) {
          results.push(OrderOfferV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findOrderOffer(tempOrderId: Buffer): Promise<OrderOfferV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderOfferV0]),
      tempOrderId,
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return OrderOfferV0.deserialize(raw);
  }

  public async saveOrderOffer(orderOffer: OrderOfferV0): Promise<void> {
    const value = orderOffer.serialize();
    const tempOrderId = sha256(value);
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderOfferV0]),
      tempOrderId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteOrderOffer(tempOrderId: Buffer): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderOfferV0]),
      tempOrderId,
    ]);
    await this._db.del(key);
  }

  public async findOrderAccepts(): Promise<OrderAcceptV0[]> {
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: OrderAcceptV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.OrderAcceptV0) {
          results.push(OrderAcceptV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findOrderAccept(tempOrderId: Buffer): Promise<OrderAcceptV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderAcceptV0]),
      tempOrderId,
    ]);
    const raw = await this._safeGet<Buffer>(key);
    if (!raw) return;
    return OrderAcceptV0.deserialize(raw);
  }

  public async saveOrderAccept(orderAccept: OrderAcceptV0): Promise<void> {
    const value = orderAccept.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderAcceptV0]),
      orderAccept.tempOrderId,
    ]);
    await this._db.put(key, value);
  }

  public async deleteDlcAccept(tempOrderId: Buffer): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderAcceptV0]),
      tempOrderId,
    ]);
    await this._db.del(key);
  }
}
