import { Value } from '@node-dlc/bitcoin';
import { expect } from 'chai';

import { HyperbolaPayoutCurvePiece } from '../../lib/messages/PayoutCurvePiece';
import { PayoutFunction } from '../../lib/messages/PayoutFunction';

describe('PayoutFunction', () => {
  describe('serialize', () => {
    it('serializes', () => {
      const instance = new PayoutFunction();

      const payoutCurvePiece = HyperbolaPayoutCurvePiece.deserialize(
        Buffer.from(
          '01010100000000000000000000000000000000001388000001000000000000000100000100000000000000000000010000000000000000000001000000012a05f2000000',
          'hex',
        ),
      );

      instance.pieces = [
        {
          payoutCurvePiece,
          endPoint: {
            eventOutcome: BigInt(50000),
            outcomePayout: Value.fromSats(100000),
            extraPrecision: 0,
          },
        },
      ];

      instance.lastEndpoint.eventOutcome = BigInt(999999);
      instance.lastEndpoint.outcomePayout = Value.fromSats(0);
      instance.lastEndpoint.extraPrecision = 0;

      console.log('instance.serialize()', instance.serialize().toString('hex'));

      expect(instance.serialize().toString("hex")).to.equal(
        '01' + // num_pieces
        '000000000000c350' + // endpoint_0
        '00000000000186a0' + // endpoint_payout_0
        '0000' + // extra_precision
        '01010100000000000000000000000000000000001388000001000000000000000100000100000000000000000000010000000000000000000001000000012a05f2000000' + // payout_curve_piece
        '00000000000f423f' + // endpoint_1
        '0000000000000000' + // endpoint_payout_1
        '0000' // extra_precision_1
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf =  Buffer.from(
        '01' + // num_pieces
        '000000000000c350' + // endpoint_0
        '00000000000186a0' + // endpoint_payout_0
        '0000' + // extra_precision
        '01010100000000000000000000000000000000001388000001000000000000000100000100000000000000000000010000000000000000000001000000012a05f2000000' + // payout_curve_piece
        '00000000000f423f' + // endpoint_1
        '0000000000000000' + // endpoint_payout_1
        '0000' // extra_precision_1
      , 'hex'); // prettier-ignore

      const instance = PayoutFunction.deserialize(buf);

      expect(instance.pieces.length).to.equal(1);
      expect(
        instance.pieces[0].payoutCurvePiece.serialize().toString('hex'),
      ).to.equal(
        '01010100000000000000000000000000000000001388000001000000000000000100000100000000000000000000010000000000000000000001000000012a05f2000000',
      );
      expect(instance.pieces[0].endPoint.eventOutcome).to.equal(BigInt(50000));
      expect(instance.pieces[0].endPoint.outcomePayout.sats).to.equal(
        BigInt(100000),
      );
      expect(instance.pieces[0].endPoint.extraPrecision).to.equal(0);
      expect(instance.lastEndpoint.eventOutcome).to.equal(BigInt(999999));
      expect(instance.lastEndpoint.outcomePayout.sats).to.equal(BigInt(0));
      expect(instance.lastEndpoint.extraPrecision).to.equal(0);
    });
  });
});
