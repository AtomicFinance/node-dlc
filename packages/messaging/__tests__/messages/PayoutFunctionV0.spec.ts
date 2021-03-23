import { expect } from 'chai';
import { HyperbolaPayoutCurvePiece } from '../../lib/messages/PayoutCurvePiece';
import { PayoutFunctionV0 } from '../../lib/messages/PayoutFunction';

describe.only('PayoutFunctionV0', () => {
  describe('serialize', () => {
    it('serializes', () => {
      const instance = new PayoutFunctionV0();

      instance.endpoint0 = 50000n;
      instance.endpointPayout0 = 100000n;
      instance.extraPrecision0 = 0;

      const payoutCurvePiece = HyperbolaPayoutCurvePiece.deserialize(
        Buffer.from(
          'fda72c23010100000000fd1388000001010000010000000100000001ff000000012a05f2000000',
          'hex',
        ),
      );

      instance.pieces = [
        {
          payoutCurvePiece,
          endpoint: 999999n,
          endpointPayout: 0n,
          extraPrecision: 0,
        },
      ];

      expect(instance.serialize().toString("hex")).to.equal(
        'fda726' + // type
        '3b' + // length
        '0001' + // num_pieces
        'fdc350' + // endpoint_0
        'fe000186a0' + // endpoint_payout_0        
        '0000' + // extra_precision
        'fda72c23010100000000fd1388000001010000010000000100000001ff000000012a05f2000000' + // payout_curve_piece
        'fe000f423f' + // endpoint_1
        '00' + // endpoint_payout_1
        '0000' // extra_precision_1
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf =  Buffer.from(
        'fda726' + // type
        '3b' + // length
        '0001' + // num_pieces
        'fdc350' + // endpoint_0
        'fe000186a0' + // endpoint_payout_0        
        '0000' + // extra_precision
        'fda72c23010100000000fd1388000001010000010000000100000001ff000000012a05f2000000' + // payout_curve_piece
        'fe000f423f' + // endpoint_1
        '00' + // endpoint_payout_1
        '0000' // extra_precision_1
      , 'hex'); // prettier-ignore

      const instance = PayoutFunctionV0.deserialize(buf);

      expect(instance.endpoint0).to.equal(50000n);
      expect(instance.endpointPayout0).to.equal(100000n);
      expect(instance.extraPrecision0).to.equal(0);

      expect(instance.pieces.length).to.equal(1);
      expect(
        instance.pieces[0].payoutCurvePiece.serialize().toString('hex'),
      ).to.equal(
        'fda72c23010100000000fd1388000001010000010000000100000001ff000000012a05f2000000',
      );
      expect(instance.pieces[0].endpoint).to.equal(999999n);
      expect(instance.pieces[0].endpointPayout).to.equal(0n);
      expect(instance.pieces[0].extraPrecision).to.equal(0);
    });
  });
});
