import { expect } from 'chai';

import { IrcMessageV0 } from '../../lib/irc/IrcMessage';

describe('IrcMessageV0', () => {
  const data = Buffer.from(
    'f5320f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206fdd82efd033200000000000f06a5fda720450012fda72635000100fe000f06a50000fda72c1f010100000000fd3b9b000001010000010000000100000001feee6b28000000fe0003ffff000000fda72406000100fd01f4fda712fd02dbfdd824fd02d59a121c157514df82ea0c57d0d82c78105f6272fc4ebd26d0c8f2903f406759e38e77578edee940590b11b875bacdac30ce1f4b913089a7e4e95884edf6f3eb195d1bcfab252c6dd9edd7aea4c5eeeef138f7ff7346061ea40143a9f5ae80baa9fdd822fd026f0012d39fca86c2492977c0a2909583b2c154bb121834658d75502d41a0e3b719fb0cd80ea2438d18d049be2d3aa4f1a3096628614d7bdda32757fd9a206c8e8c25c514b68799e03bb713d542f6c35ffaa0917fe18646969c77d56f4d8aa0f0fb30b26d746cb0713e27a56f8aa56dc828120b523fee21b2f0bc9d3a4a6d9855c251fd6405bb7f6c1dfee97d24cfd7ad533c06162a22f4fc9fdd0e5c02e94201c239bb13753ab5c56881f55367321ebd44e302241b42c99aa67dffb2d229178701d71a756244c433d15f9b20d33628540da5c07face604980e5f709aa0bbfdb157b7a8abc8d946f9e5d67c1e91bf22d77f5c097e6b3a51a420a8d882a3cad98cb4f84ace075a8acee1ef4f229e1b2b403ffb9f43a825ca8410b7d803b91ae54959ecd630e824310749ed1ee54e0e40e0af49d9a11bfbdbf36146234063c00520ed4416a2dafe74f9c0542b2d58c58fa75e9bb5a95c291d934f4dd513c405e9ddc58543ab4a586bf0b9abf7a12aa272ff29429df38164e3e5d418b913c818c1858a3a8b19355a1ceaee7318a245bab2b09d94bf39f7b600665c3b8b8a655cf54f85c1b38ed41798968a0da05884d9f0e201b3e3be3a3740cf31439fd325248eed65fa9344390f5748bbbbbcab4b2f200b9fdd860a1fc813431e0aff174476f4d4d254c6ecbb4f8f31ba16858a95a4d138e206c8d96126a69b2b7ebb6b2ec9c3a37a9a128162aed19361e41b0fe4ff1504df2a0bd150d7c96860d08990f12eb65bf5e5dab79e0fe16db4e7a26d9817d7e50a2c37a8c44a330de349d2ce9e33b802aa0f97605d2400fdd80a11000200074254432d55534400000000001213446572696269742d4254432d32364d4152323100000000000ec33a0000000000000026605d4016605d4016',
    'hex',
  );

  const dataFirst = Buffer.from(
    'f5320f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206fdd82efd033200000000000f06a5fda720450012fda72635000100fe000f06a50000fda72c1f010100000000fd3b9b000001010000010000000100000001feee6b28000000fe0003ffff000000fda72406000100fd01f4fda712fd02dbfdd824fd02d59a121c157514df82ea0c57d0d82c78105f6272fc4ebd26d0c8f2903f406759e38e77578edee940590b11b875bacdac30ce1f4b913089a7e4e95884edf6f3eb195d1bcf',
    'hex',
  );

  const pubKey = Buffer.from(
    '026d8bec9093f96ccc42de166cb9a6c576c95fc24ee16b10e87c3baaa4e49684d9',
    'hex',
  );

  const signature = Buffer.from(
    'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9' + // announcement_signature_r
      '494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4', // announcement_signature_s
    'hex',
  );

  const checksum = 2796248467;

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new IrcMessageV0();

      instance.sequenceLength = BigInt(8);
      instance.sequenceNumber = BigInt(0);
      instance.checksum = checksum;
      instance.pubkey = pubKey;
      instance.signature = signature;
      instance.timestamp = 1623639619;
      instance.data = dataFirst;

      expect(instance.serialize().toString('hex')).to.equal(
        'fde7b2' + // type
          'fd0135' + // size
          '08' + // sequence_len
          '00' + // sequence_num
          'a6ab5d93' + // checksum
          'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9' + // signature_r
          '494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4' + // signature_s
          '026d8bec9093f96ccc42de166cb9a6c576c95fc24ee16b10e87c3baaa4e49684d9' + // pubkey
          '60c6c643' + // timestamp
          '00c8' + // data length
          'f5320f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206fdd82efd033200000000000f06a5fda720450012fda72635000100fe000f06a50000fda72c1f010100000000fd3b9b000001010000010000000100000001feee6b28000000fe0003ffff000000fda72406000100fd01f4fda712fd02dbfdd824fd02d59a121c157514df82ea0c57d0d82c78105f6272fc4ebd26d0c8f2903f406759e38e77578edee940590b11b875bacdac30ce1f4b913089a7e4e95884edf6f3eb195d1bcf', // data
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf = Buffer.from(
        'fde7b2' + // type
          'fd0135' + // size
          '08' + // sequence_len
          '00' + // sequence_num
          'a6ab5d93' + // checksum
          'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9' + // signature_r
          '494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4' + // signature_s
          '026d8bec9093f96ccc42de166cb9a6c576c95fc24ee16b10e87c3baaa4e49684d9' + // pubkey
          '60c6c643' + // timestamp
          '00c8' + // data length
          'f5320f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206fdd82efd033200000000000f06a5fda720450012fda72635000100fe000f06a50000fda72c1f010100000000fd3b9b000001010000010000000100000001feee6b28000000fe0003ffff000000fda72406000100fd01f4fda712fd02dbfdd824fd02d59a121c157514df82ea0c57d0d82c78105f6272fc4ebd26d0c8f2903f406759e38e77578edee940590b11b875bacdac30ce1f4b913089a7e4e95884edf6f3eb195d1bcf', // data
         'hex'
      ); // prettier-ignore

      const instance = IrcMessageV0.deserialize(buf);

      expect(Number(instance.length)).to.equal(309);
      expect(Number(instance.sequenceLength)).to.equal(8);
      expect(Number(instance.sequenceNumber)).to.equal(0);
      expect(instance.checksum).to.equal(checksum);
      expect(instance.signature).to.deep.equal(signature);
      expect(instance.pubkey).to.deep.equal(pubKey);
      expect(instance.data).to.deep.equal(dataFirst);
    });
  });

  describe('fromBuffer', () => {
    it('instantiates IrcMessages fromBuffer', async () => {
      const instances = IrcMessageV0.fromBuffer(data, pubKey);

      expect(instances.length).to.equal(5);
      expect(instances[0].checksum).to.equal(checksum);
    });
  });
});
