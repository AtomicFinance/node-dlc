import { OutPoint } from '@node-lightning/bitcoin';
import { expect } from 'chai';

import { CloseTLV } from '../../lib/messages/CloseTLV';
import { MessageType } from '../../lib/MessageType';

describe('CloseTLV', () => {
  let instance: CloseTLV;

  const type = Buffer.from('fdff98', 'hex');

  const length = Buffer.from('4c', 'hex');

  const contractId = Buffer.from(
    'c1c79e1e9e2fa2840b2514902ea244f39eb3001a4037a52ea43c797d4f841269',
    'hex',
  );

  const offerPayoutSatoshis = Buffer.from('0000000005f5e100', 'hex');

  const outpoint = Buffer.from(
    '000000000000000000000000000000000000000000000000000000000000000000000000',
    'hex',
  );

  const closeHex = Buffer.concat([
    type,
    length,
    contractId,
    offerPayoutSatoshis,
    outpoint,
  ]);

  beforeEach(() => {
    instance = new CloseTLV();
    instance.contractId = contractId;
    instance.offerPayoutSatoshis = BigInt(100000000);
    instance.outpoint = OutPoint.fromString(
      '0000000000000000000000000000000000000000000000000000000000000000:0',
    );
  });

  describe('deserialize', () => {
    it('has correct type', () => {
      expect(CloseTLV.deserialize(instance.serialize()).type).to.equal(
        instance.type,
      );
    });
  });

  describe('DlcCloseV0', () => {
    describe('serialize', () => {
      it('serializes', () => {
        expect(instance.serialize().toString('hex')).to.equal(
          closeHex.toString('hex'),
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        const instance = CloseTLV.deserialize(closeHex);
        expect(instance.contractId).to.deep.equal(contractId);
        expect(Number(instance.offerPayoutSatoshis)).to.equal(100000000);
        expect(instance.outpoint.toString()).to.equal(
          '0000000000000000000000000000000000000000000000000000000000000000:0',
        );
      });

      it('has correct type', () => {
        expect(CloseTLV.deserialize(closeHex).type).to.equal(
          MessageType.CloseTLV,
        );
      });
    });

    describe('toJSON', () => {
      it('convert to JSON', async () => {
        const json = instance.toJSON();
        expect(json.contractId).to.equal(contractId.toString('hex'));
      });
    });
  });
});
