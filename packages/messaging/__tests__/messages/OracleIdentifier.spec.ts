import { expect } from 'chai';

import { OracleIdentifierV0 } from '../../lib/messages/OracleIdentifier';

describe('OracleIdentifier', () => {
  const oraclePubkey = Buffer.from(
    '5d1bcfab252c6dd9edd7aea4c5eeeef138f7ff7346061ea40143a9f5ae80baa9',
    'hex',
  );

  const oracleName = 'atomic';

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new OracleIdentifierV0();

      instance.oracleName = oracleName;
      instance.oraclePubkey = oraclePubkey;

      expect(instance.serialize().toString("hex")).to.equal(
        "fdf020" + // type oracle_identifier
        "06" + // oracle_name length
        "61746f6d6963" + // oracle_name
        "5d1bcfab252c6dd9edd7aea4c5eeeef138f7ff7346061ea40143a9f5ae80baa9" // oracle_pubkey
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf = Buffer.from(
        "fdf020" + // type oracle_identifier
        "06" + // oracle_name length
        "61746f6d6963" + // oracle_name
        "5d1bcfab252c6dd9edd7aea4c5eeeef138f7ff7346061ea40143a9f5ae80baa9" // oracle_pubkey
        , "hex"
      ); // prettier-ignore

      const instance = OracleIdentifierV0.deserialize(buf);

      expect(instance.oracleName).to.equal(oracleName);
      expect(instance.oraclePubkey).to.deep.equal(oraclePubkey);
    });
  });
});
