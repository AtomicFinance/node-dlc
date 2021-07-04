import BitcoinNetworks from '@liquality/bitcoin-networks';
import { expect } from 'chai';

import { AddressCache, IAddressCache } from '../../lib/messages/AddressCache';

describe('AddressCache', () => {
  const network = BitcoinNetworks.bitcoin_regtest;

  const addressCache: IAddressCache[] = [];
  addressCache['bcrt1qe8y4pn4ed4ps89x0etf2vjcr85ch3vvfe74s2k'] = true;
  addressCache['bcrt1qtc6s584j37797hss9e384e2q8rn0mhzufer4lg'] = true;

  const cacheSPKs: Buffer[] = [
    Buffer.from('0014c9c950ceb96d430394cfcad2a64b033d3178b189', 'hex'),
    Buffer.from('00145e350a1eb28fbc5f5e102e627ae54038e6fddc5c', 'hex'),
  ];

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new AddressCache();

      instance.cacheSPKs = cacheSPKs;

      expect(instance.serialize().toString('hex')).to.equal(
        "fe6c" + // type address_cache
        "02" + // num_cache_spks
        "16" + // cache_spk_1_len
        "0014c9c950ceb96d430394cfcad2a64b033d3178b189" + // cache_spk_1
        "16" + // cache_spk_2_len
        "00145e350a1eb28fbc5f5e102e627ae54038e6fddc5c" // cache_spk_2
      ); // prettier-ignore
    });
  });

  describe('toAddressCache', () => {
    it('toAddressCache', () => {
      const instance = new AddressCache();

      instance.cacheSPKs = cacheSPKs;

      const addressCache: IAddressCache[] = instance.toAddressCache(network);

      expect(
        addressCache['bcrt1qe8y4pn4ed4ps89x0etf2vjcr85ch3vvfe74s2k'],
      ).to.equal(true);
      expect(
        addressCache['bcrt1qtc6s584j37797hss9e384e2q8rn0mhzufer4lg'],
      ).to.equal(true);
    });
  });

  describe('deserializes', () => {
    it('deserializes', () => {
      const instance = AddressCache.deserialize(
        Buffer.from(
          'fe6c' + // type address_cache
            '02' + // num_cache_spks
            '16' + // cache_spk_1_len
            '0014c9c950ceb96d430394cfcad2a64b033d3178b189' + // cache_spk_1
            '16' + // cache_spk_2_len
            '00145e350a1eb28fbc5f5e102e627ae54038e6fddc5c', // cache_spk_2
          'hex',
        ),
      );

      expect(instance.cacheSPKs[0]).to.deep.equal(cacheSPKs[0]);
      expect(instance.cacheSPKs[1]).to.deep.equal(cacheSPKs[1]);
    });
  });

  describe('fromAddressCache', () => {
    it('fromAddressCache', () => {
      const instance = AddressCache.fromAddressCache(addressCache, network);

      expect(instance.cacheSPKs[0]).to.deep.equal(cacheSPKs[0]);
      expect(instance.cacheSPKs[1]).to.deep.equal(cacheSPKs[1]);
    });
  });
});
