import {
  OrderAcceptV0,
  OrderMetadataV0,
  OrderOfferV0,
} from '@node-dlc/messaging';
import { sha256 } from '@node-lightning/crypto';

import { RocksdbBase } from './rocksdb-base';

enum Prefix {
  OrderOfferV0 = 40,
  OrderAcceptV0 = 41,
  OrderOfferV0Nick = 42,
  OrderAcceptV0Nick = 43,
  OrderMetadataV0 = 44,
  OrderMetadataV0Nick = 45,
}

export class RocksdbOrderStore extends RocksdbBase {
  public async findOrderOffers(): Promise<OrderOfferV0[]> {
    const results: OrderOfferV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.OrderOfferV0) {
          results.push(OrderOfferV0.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
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

  public async findOrderOfferTempOrderIdsByNick(
    nick: string,
  ): Promise<Buffer[]> {
    const nickBuf = Buffer.from(nick);
    const results: Buffer[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (
          key[0] === Prefix.OrderOfferV0Nick &&
          this.keyBufCompare(key.slice(1), nickBuf)
        ) {
          results.push(value);
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findOrderOfferTempOrderIdsByNickAndMetadata(
    nick: string,
    orderMetadataId: Buffer,
  ): Promise<Buffer[]> {
    const nickBuf = Buffer.from(nick);
    const results: Buffer[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (
          key[0] === Prefix.OrderMetadataV0Nick &&
          this.keyBufCompare(key.slice(1, 33), orderMetadataId) &&
          this.keyBufCompare(key.slice(33), nickBuf)
        ) {
          results.push(value);
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findOrderOffersByNick(nick: string): Promise<OrderOfferV0[]> {
    const tempOrderIds = await this.findOrderOfferTempOrderIdsByNick(nick);
    const results: OrderOfferV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.OrderOfferV0) {
          const orderOffer = OrderOfferV0.deserialize(value);

          if (
            tempOrderIds
              .map((orderId) => orderId.toString('hex'))
              .includes(sha256(orderOffer.serialize()).toString('hex'))
          ) {
            results.push(orderOffer);
          }
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findOrderOfferByNickAndMetadata(
    nick: string,
    orderMetadataId: Buffer,
  ): Promise<OrderOfferV0> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderMetadataV0Nick]),
      orderMetadataId,
      Buffer.from(nick),
    ]);
    const tempOrderId = await this._safeGet<Buffer>(key);
    if (!tempOrderId) return;

    return this.findOrderOffer(tempOrderId);
  }

  public async findOrderOffersByNickAndMetadata(
    nick: string,
    orderMetadataId: Buffer,
  ): Promise<OrderOfferV0[]> {
    const tempOrderIds = await this.findOrderOfferTempOrderIdsByNickAndMetadata(
      nick,
      orderMetadataId,
    );

    const results: OrderOfferV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.OrderOfferV0) {
          const orderOffer = OrderOfferV0.deserialize(value);

          if (
            tempOrderIds
              .map((orderId) => orderId.toString('hex'))
              .includes(sha256(orderOffer.serialize()).toString('hex'))
          ) {
            results.push(orderOffer);
          }
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
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

  public async saveOrderOfferByNick(
    orderOffer: OrderOfferV0,
    nick: string,
  ): Promise<void> {
    const value = orderOffer.serialize();
    const tempOrderId = sha256(value);
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderOfferV0]),
      tempOrderId,
    ]);
    await this._db.put(key, value);

    const key2 = Buffer.concat([
      Buffer.from([Prefix.OrderOfferV0Nick]),
      Buffer.from(nick),
      tempOrderId,
    ]);
    await this._db.put(key2, tempOrderId);

    await this.saveOrderOfferByMetadataAndNick(orderOffer, nick);
  }

  public async saveOrderOfferByMetadataAndNick(
    orderOffer: OrderOfferV0,
    nick: string,
  ): Promise<void> {
    if (orderOffer.metadata) {
      const value = orderOffer.serialize();
      const tempOrderId = sha256(value);

      const orderMetadata = orderOffer.metadata;
      const orderMetadataForId = new OrderMetadataV0();
      orderMetadataForId.offerId = (orderMetadata as OrderMetadataV0).offerId;
      const orderMetadataId = sha256(orderMetadataForId.serialize());
      const key = Buffer.concat([
        Buffer.from([Prefix.OrderMetadataV0Nick]),
        orderMetadataId,
        Buffer.from(nick),
      ]);
      await this._db.put(key, tempOrderId);
    }
  }

  public async deleteOrderOffer(tempOrderId: Buffer): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderOfferV0]),
      tempOrderId,
    ]);
    await this._db.del(key);
  }

  public async findOrderAccepts(): Promise<OrderAcceptV0[]> {
    const results: OrderAcceptV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.OrderAcceptV0) {
          results.push(OrderAcceptV0.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findOrderAcceptTempOrderIdsByNick(
    nick: string,
  ): Promise<Buffer[]> {
    const nickBuf = Buffer.from(nick);
    const results: Buffer[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (
          key[0] === Prefix.OrderAcceptV0Nick &&
          this.keyBufCompare(key.slice(1), nickBuf)
        ) {
          results.push(value);
        }
      }
    } finally {
      await iterator.close();
    }

    return results;
  }

  public async findOrderAcceptsByNick(nick: string): Promise<OrderAcceptV0[]> {
    const tempOrderIds = await this.findOrderAcceptTempOrderIdsByNick(nick);
    const results: OrderAcceptV0[] = [];
    const iterator = this._db.iterator();

    try {
      for await (const [key, value] of iterator) {
        if (key[0] === Prefix.OrderAcceptV0) {
          results.push(OrderAcceptV0.deserialize(value));
        }
      }
    } finally {
      await iterator.close();
    }

    return results.filter((orderAccept) => {
      return tempOrderIds
        .map((orderId) => orderId.toString('hex'))
        .includes(orderAccept.tempOrderId.toString('hex'));
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

  public async saveOrderAcceptByNick(
    orderAccept: OrderAcceptV0,
    nick: string,
  ): Promise<void> {
    const value = orderAccept.serialize();
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderAcceptV0]),
      orderAccept.tempOrderId,
    ]);
    await this._db.put(key, value);

    const key2 = Buffer.concat([
      Buffer.from([Prefix.OrderAcceptV0Nick]),
      Buffer.from(nick),
      orderAccept.tempOrderId,
    ]);
    await this._db.put(key2, orderAccept.tempOrderId);
  }

  public async deleteOrderAccept(tempOrderId: Buffer): Promise<void> {
    const key = Buffer.concat([
      Buffer.from([Prefix.OrderAcceptV0]),
      tempOrderId,
    ]);
    await this._db.del(key);
  }

  public keyBufCompare(key: Buffer, value: Buffer): boolean {
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== key[i]) return false;
    }
    return true;
  }
}
