import { OrderAcceptV0, OrderOfferV0 } from '@node-dlc/messaging';
import { sha256 } from '@node-lightning/crypto';
import { RocksdbBase } from '@node-lightning/gossip-rocksdb';

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

  public async findOrderOfferTempOrderIdsByNick(
    nick: string,
  ): Promise<Buffer[]> {
    const nickBuf = Buffer.from(nick);
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: Buffer[] = [];
      stream.on('data', (data) => {
        if (
          data.key[0] === Prefix.OrderOfferV0Nick &&
          this.keyBufCompare(data.key.slice(1), nickBuf)
        ) {
          results.push(data.value);
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findOrderOfferTempOrderIdsByNickAndMetadata(
    nick: string,
    orderMetadataId: Buffer,
  ): Promise<Buffer[]> {
    const nickBuf = Buffer.from(nick);
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: Buffer[] = [];
      stream.on('data', (data) => {
        if (
          data.key[0] === Prefix.OrderMetadataV0Nick &&
          this.keyBufCompare(data.key.slice(1, 33), orderMetadataId) &&
          this.keyBufCompare(data.key.slice(33), nickBuf)
        ) {
          results.push(data.value);
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findOrderOffersByNick(nick: string): Promise<OrderOfferV0[]> {
    const tempOrderIds = await this.findOrderOfferTempOrderIdsByNick(nick);

    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: OrderOfferV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.OrderOfferV0) {
          results.push(OrderOfferV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(
          results.filter((orderOffer) => {
            return tempOrderIds
              .map((orderId) => orderId.toString('hex'))
              .includes(sha256(orderOffer.serialize()).toString('hex'));
          }),
        );
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findOrderOffersByNickAndMetadata(
    nick: string,
    orderMetadataId: Buffer,
  ): Promise<OrderOfferV0[]> {
    const tempOrderIds = await this.findOrderOfferTempOrderIdsByNickAndMetadata(
      nick,
      orderMetadataId,
    );

    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: OrderOfferV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.OrderOfferV0) {
          results.push(OrderOfferV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(
          results.filter((orderOffer) => {
            return tempOrderIds
              .map((orderId) => orderId.toString('hex'))
              .includes(sha256(orderOffer.serialize()).toString('hex'));
          }),
        );
      });
      stream.on('error', (err) => reject(err));
    });
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
      const orderMetadataId = sha256(orderMetadata.serialize());
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

  public async findOrderAcceptTempOrderIdsByNick(
    nick: string,
  ): Promise<Buffer[]> {
    const nickBuf = Buffer.from(nick);
    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: Buffer[] = [];
      stream.on('data', (data) => {
        if (
          data.key[0] === Prefix.OrderAcceptV0Nick &&
          this.keyBufCompare(data.key.slice(1), nickBuf)
        ) {
          results.push(data.value);
        }
      });
      stream.on('end', () => {
        resolve(results);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async findOrderAcceptsByNick(nick: string): Promise<OrderAcceptV0[]> {
    const tempOrderIds = await this.findOrderAcceptTempOrderIdsByNick(nick);

    return new Promise((resolve, reject) => {
      const stream = this._db.createReadStream();
      const results: OrderAcceptV0[] = [];
      stream.on('data', (data) => {
        if (data.key[0] === Prefix.OrderAcceptV0) {
          results.push(OrderAcceptV0.deserialize(data.value));
        }
      });
      stream.on('end', () => {
        resolve(
          results.filter((orderAccept) => {
            return tempOrderIds
              .map((orderId) => orderId.toString('hex'))
              .includes(orderAccept.tempOrderId.toString('hex'));
          }),
        );
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
