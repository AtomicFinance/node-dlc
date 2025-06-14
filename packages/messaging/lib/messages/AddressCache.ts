import { BufferReader, BufferWriter } from '@node-dlc/bufio';
import { BitcoinNetwork } from 'bitcoin-networks';
import { address } from 'bitcoinjs-lib';

import { MessageType } from '../MessageType';

export class AddressCache {
  public static type = MessageType.AddressCache;

  public static fromAddressCache(
    addressesBlacklist: IAddressCache[],
    network: BitcoinNetwork,
  ): AddressCache {
    const instance = new AddressCache();

    for (const blacklistAddress of Object.keys(addressesBlacklist)) {
      instance.cacheSPKs.push(
        address.toOutputScript(blacklistAddress, network),
      );
    }

    return instance;
  }

  public static deserialize(buf: Buffer): AddressCache {
    const instance = new AddressCache();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type
    reader.readBigSize(); // num_cache_spks

    while (!reader.eof) {
      const cacheSPKLen = reader.readBigSize();
      const cacheSPK = reader.readBytes(Number(cacheSPKLen));

      instance.cacheSPKs.push(cacheSPK);
    }

    return instance;
  }

  public type = AddressCache.type;

  public cacheSPKs: Buffer[] = [];

  public toAddressCache(network: BitcoinNetwork): IAddressCache[] {
    const addressCache: IAddressCache[] = [];

    for (const cacheSPK of this.cacheSPKs) {
      addressCache[address.fromOutputScript(cacheSPK, network)] = true;
    }

    return addressCache;
  }

  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeUInt16BE(this.type);

    writer.writeBigSize(this.cacheSPKs.length);

    for (const cacheSPK of this.cacheSPKs) {
      writer.writeBigSize(cacheSPK.length);
      writer.writeBytes(cacheSPK);
    }

    return writer.toBuffer();
  }
}

export interface IAddressCache {
  [x: string]: boolean;
}
