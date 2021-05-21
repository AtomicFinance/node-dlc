// tslint:disable: no-unused-expression

import { OracleEventContainerV0 } from '@node-dlc/messaging';
import { expect } from 'chai';
import { RocksdbOracleStore } from '../lib/rocksdb-oracle-store';
import * as util from './rocksdb';
import { sha256 } from '@node-lightning/crypto';

describe('RocksdbOracleStore', () => {
  let sut: RocksdbOracleStore;

  const oracleEventContainerHex = Buffer.from(
    'fdf0c0' + // type oracle_event_container
      'fd0139' + // length
      '0641746f6d6963' + // oracle_name
      '00' + // uri
      'fdd824' + // type oracle_announcement
        'a4' + // length
        'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9' + // announcement_signature_r
        '494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4' + // announcement_signature_s
        'da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b' + // oracle_public_key
        'fdd822' + // type oracle_event
        '40' + // length
        '0001' + // nb_nonces
        '3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b' + // oracle_nonces
        '00000000' + // event_maturity_epoch
        'fdd806' + // type enum_event_descriptor
        '10' + // length
        '0002' + // num_outcomes
        '06' + // outcome_1_len
        '64756d6d7931' + // outcome_1
        '06' + // outcome_2_len
        '64756d6d7932' + // outcome_2
        '05' + // event_id_length
        '64756d6d79' + // event_id
      'fdd868' + // type oracle_attestation_v0
        '7f' + // length
        '19' + // event_id_len
        '4254432d5553442d4f5645522d35304b2d434f494e42415345' + // event_id
        '1d5dcdba2e64cb116cc0c375a0856298f0058b778f46bfe625ac6576204889e4' + // pubkey
        '0001' + // nb_signatures
        '424c11a44c2e522f90bbe4abab6ec1bc8ab44c9b29316ce6e1d0d7d08385a474' + // signature_r
        'de6b75f1da183a2a4f9ad144b48bf1026cee9687221df58f04128db79ca17e2a' + // signature_s
        '02' + // outcome_len
        '4e4f' + // outcome
      '053435333534', // outcome
      'hex'
  ); // prettier-ignore

  const oracleEventContainer = OracleEventContainerV0.deserialize(
    oracleEventContainerHex,
  );

  before(async () => {
    util.rmdir('.testdb');
    sut = new RocksdbOracleStore('./.testdb/nested/dir');
    await sut.open();
  });

  after(async () => {
    await sut.close();
    util.rmdir('.testdb');
  });

  describe('save oracle_event_container', () => {
    it('should save order_offer', async () => {
      await sut.saveOracleEventContainer(oracleEventContainer);
    });
  });

  describe('find oracle_event_container', () => {
    it('should return the order_offer object', async () => {
      const announcementId = sha256(
        oracleEventContainer.announcement.serialize(),
      );
      const actual = await sut.findOracleEventContainer(announcementId);

      expect(actual.serialize()).to.deep.equal(
        oracleEventContainer.serialize(),
      );
    });
  });

  describe('delete oracle_event_container', () => {
    it('should delete order_offer', async () => {
      const announcementId = sha256(
        oracleEventContainer.announcement.serialize(),
      );

      await sut.deleteOracleEventContainer(announcementId);

      const actual = await sut.findOracleEventContainer(announcementId);
      expect(actual).to.be.undefined;
    });
  });
});
