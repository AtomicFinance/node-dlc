import { expect } from 'chai';
import { FundingInputV0 } from '../../lib/messages/FundingInput';
import { DlcAcceptV0 } from '../../lib/messages/DlcAccept';
import { CetAdaptorSignaturesV0 } from '../../lib/messages/CetAdaptorSignaturesV0';
import { NegotiationFields } from '../../lib/messages/NegotiationFields';

describe('DlcAcceptV0', () => {
  const tempContractId = Buffer.from(
    '960fb5f7960382ac7e76f3e24eb6b00059b1e68632a946843c22e1f65fdf216a',
    'hex',
  );

  const fundingPubKey = Buffer.from(
    '026d8bec9093f96ccc42de166cb9a6c576c95fc24ee16b10e87c3baaa4e49684d9',
    'hex',
  );

  const payoutSPK = Buffer.from(
    '001436054fa379f7564b5e458371db643666365c8fb3',
    'hex',
  );

  const changeSPK = Buffer.from(
    '0014074c82dbe058212905bacc61814456b7415012ed',
    'hex',
  );

  const refundSignature = Buffer.from(
    '7c8ad6de287b62a1ed1d74ed9116a5158abc7f97376d201caa88e0f9daad68fcda4c271cc003512e768f403a57e5242bd1f6aa1750d7f3597598094a43b1c7bb',
    'hex',
  );

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new DlcAcceptV0();

      instance.tempContractId = tempContractId;
      instance.acceptCollateralSatoshis = BigInt(100000000);
      instance.fundingPubKey = fundingPubKey;
      instance.payoutSPK = payoutSPK;
      instance.payoutSerialId = BigInt(1594186);
      instance.fundingInputs = [
        FundingInputV0.deserialize(
          Buffer.from(
            'fda714' + // type funding_input_v0
              '3f' + // length
              '000000000000dae8' + // input_serial_id
              '0029' + // prevtx_len
              '02000000000100c2eb0b000000001600149ea3bf2d6eb9c2ffa35e36f41e117403ed7fafe900000000' + // prevtx
              '00000000' + // prevtx_vout
              'ffffffff' + // sequence
              '006b' + // max_witness_len
              '0000', // redeem_script_len
            'hex',
          ),
        ),
      ];
      instance.changeSPK = changeSPK;
      instance.changeSerialId = BigInt(885015);
      instance.cetSignatures = CetAdaptorSignaturesV0.deserialize(
        Buffer.from(
          'fda716' + // type cet_adaptor_signatures_v0
            'fd01e7' + // length
            '03' + // nb_signatures
            '016292f1b5c67b675aea69c95ec81e8462ab5bb9b7a01f810f6d1a7d1d886893b3605fe7fcb75a14b1b1de917917d37e9efac6437d7a080da53fb6dbbcfbfbe7a8' + // ecdsa_adaptor_signature_1
            '01efbecb2bce89556e1fb4d31622628830e02a6d04c487f67aca20e9f60fb127f985293541cd14e2bf04e4777d50953531e169dd37c65eb3cc17d6b5e4dbe58487f9fae1f68f603fe014a699a346b14a63048c26c9b31236d83a7e369a2b29a292' + // dleq_proof_1
            '00e52fe05d832bcce4538d9c27f3537a0f2086b265b6498f30cf667f77ff2fa87606574bc9a915ef57f7546ebb6852a490ad0547bdc52b19791d2d0f0cc0acabab' + // ecdsa_adaptor_signature_2
            '01f32459001a28850fa8ee4278111deb0494a8175f02e31a1c18b39bd82ec64026a6f341bcd5ba169d67b855030e36bdc65feecc0397a07d3bc514da69811ec5485f5553aebda782bc5ac9b47e8e11d701a38ef2c2b7d8af3906dd8dfc759754ce' + // dleq_proof_2
            '006f769592c744141a5ddface6e98f756a9df1bb75ad41508ea013bdfee133b396d85be51f870bf2e0ae836bfa984109dab96cc6f4ab2a7f118bc6b0b25a4c70d4' + // ecdsa_adaptor_signature_3
            '01c768c1d677c6ff0b7ea69fdf29aff1000794227db368dff16e838d1f44c4afe9e952ee63d603f7b14de13c1d73b363cc2b1740d0b688e73d8e71cddf40f8e7e912df413903779c4e5d6644c504c8609baec8fdcb90d6d341cf316748f5d7945f', // dleq_proof_3
          'hex',
        ),
      );
      instance.refundSignature = refundSignature;
      instance.negotiationFields = NegotiationFields.deserialize(
        Buffer.from('fdd82600', 'hex'),
      );

      expect(instance.serialize().toString("hex")).to.equal(
        "a71c" + // type accept_dlc_v0
        "960fb5f7960382ac7e76f3e24eb6b00059b1e68632a946843c22e1f65fdf216a" + // temp_contract_id
        "0000000005f5e100" + // total_collateral_satoshis
        "026d8bec9093f96ccc42de166cb9a6c576c95fc24ee16b10e87c3baaa4e49684d9" + // funding_pubkey
        "0016" + // payout_spk_len
        "001436054fa379f7564b5e458371db643666365c8fb3" + // payout_spk
        "000000000018534a" + // payout_serial_id
        "0001" + // funding_inputs_len
        "fda714" + // type funding_input_v0
        "3f" + // length
        "000000000000dae8" + // input_serial_id
        "0029" + // prevtx_len
        "02000000000100c2eb0b000000001600149ea3bf2d6eb9c2ffa35e36f41e117403ed7fafe900000000" + // prevtx
        "00000000" + // prevtx_vout
        "ffffffff" + // sequence
        "006b" + // max_witness_len
        "0000" + // redeem_script_len
        "0016" + // change_spk_len
        "0014074c82dbe058212905bacc61814456b7415012ed" + // change_spk
        "00000000000d8117" + // change_serial_id
        "fda716" + // type cet_adaptor_signatures_v0
        "fd01e7" + // length
        "03" + // nb_signatures
        "016292f1b5c67b675aea69c95ec81e8462ab5bb9b7a01f810f6d1a7d1d886893b3605fe7fcb75a14b1b1de917917d37e9efac6437d7a080da53fb6dbbcfbfbe7a8" + // ecdsa_adaptor_signature_1
        "01efbecb2bce89556e1fb4d31622628830e02a6d04c487f67aca20e9f60fb127f985293541cd14e2bf04e4777d50953531e169dd37c65eb3cc17d6b5e4dbe58487f9fae1f68f603fe014a699a346b14a63048c26c9b31236d83a7e369a2b29a292" + // dleq_proof_1
        "00e52fe05d832bcce4538d9c27f3537a0f2086b265b6498f30cf667f77ff2fa87606574bc9a915ef57f7546ebb6852a490ad0547bdc52b19791d2d0f0cc0acabab" + // ecdsa_adaptor_signature_2
        "01f32459001a28850fa8ee4278111deb0494a8175f02e31a1c18b39bd82ec64026a6f341bcd5ba169d67b855030e36bdc65feecc0397a07d3bc514da69811ec5485f5553aebda782bc5ac9b47e8e11d701a38ef2c2b7d8af3906dd8dfc759754ce" + // dleq_proof_2
        "006f769592c744141a5ddface6e98f756a9df1bb75ad41508ea013bdfee133b396d85be51f870bf2e0ae836bfa984109dab96cc6f4ab2a7f118bc6b0b25a4c70d4" + // ecdsa_adaptor_signature_3
        "01c768c1d677c6ff0b7ea69fdf29aff1000794227db368dff16e838d1f44c4afe9e952ee63d603f7b14de13c1d73b363cc2b1740d0b688e73d8e71cddf40f8e7e912df413903779c4e5d6644c504c8609baec8fdcb90d6d341cf316748f5d7945f" +
        "7c8ad6de287b62a1ed1d74ed9116a5158abc7f97376d201caa88e0f9daad68fcda4c271cc003512e768f403a57e5242bd1f6aa1750d7f3597598094a43b1c7bb" + // refund_signature
        "fdd82600" // negotiation_fields
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf = Buffer.from(
        "a71c" + // type accept_dlc_v0
        "960fb5f7960382ac7e76f3e24eb6b00059b1e68632a946843c22e1f65fdf216a" + // temp_contract_id
        "0000000005f5e100" + // total_collateral_satoshis
        "026d8bec9093f96ccc42de166cb9a6c576c95fc24ee16b10e87c3baaa4e49684d9" + // funding_pubkey
        "0016" + // payout_spk_len
        "001436054fa379f7564b5e458371db643666365c8fb3" + // payout_spk
        "000000000018534a" + // payout_serial_id
        "0001" + // funding_inputs_len
        "fda714" + // type funding_input_v0
        "3f" + // length
        "000000000000dae8" + // input_serial_id
        "0029" + // prevtx_len
        "02000000000100c2eb0b000000001600149ea3bf2d6eb9c2ffa35e36f41e117403ed7fafe900000000" + // prevtx
        "00000000" + // prevtx_vout
        "ffffffff" + // sequence
        "006b" + // max_witness_len
        "0000" + // redeem_script_len
        "0016" + // change_spk_len
        "0014074c82dbe058212905bacc61814456b7415012ed" + // change_spk
        "00000000000d8117" + // change_serial_id
        "fda716" + // type cet_adaptor_signatures_v0
        "fd01e7" + // length
        "03" + // nb_signatures
        "016292f1b5c67b675aea69c95ec81e8462ab5bb9b7a01f810f6d1a7d1d886893b3605fe7fcb75a14b1b1de917917d37e9efac6437d7a080da53fb6dbbcfbfbe7a8" + // ecdsa_adaptor_signature_1
        "01efbecb2bce89556e1fb4d31622628830e02a6d04c487f67aca20e9f60fb127f985293541cd14e2bf04e4777d50953531e169dd37c65eb3cc17d6b5e4dbe58487f9fae1f68f603fe014a699a346b14a63048c26c9b31236d83a7e369a2b29a292" + // dleq_proof_1
        "00e52fe05d832bcce4538d9c27f3537a0f2086b265b6498f30cf667f77ff2fa87606574bc9a915ef57f7546ebb6852a490ad0547bdc52b19791d2d0f0cc0acabab" + // ecdsa_adaptor_signature_2
        "01f32459001a28850fa8ee4278111deb0494a8175f02e31a1c18b39bd82ec64026a6f341bcd5ba169d67b855030e36bdc65feecc0397a07d3bc514da69811ec5485f5553aebda782bc5ac9b47e8e11d701a38ef2c2b7d8af3906dd8dfc759754ce" + // dleq_proof_2
        "006f769592c744141a5ddface6e98f756a9df1bb75ad41508ea013bdfee133b396d85be51f870bf2e0ae836bfa984109dab96cc6f4ab2a7f118bc6b0b25a4c70d4" + // ecdsa_adaptor_signature_3
        "01c768c1d677c6ff0b7ea69fdf29aff1000794227db368dff16e838d1f44c4afe9e952ee63d603f7b14de13c1d73b363cc2b1740d0b688e73d8e71cddf40f8e7e912df413903779c4e5d6644c504c8609baec8fdcb90d6d341cf316748f5d7945f" +
        "7c8ad6de287b62a1ed1d74ed9116a5158abc7f97376d201caa88e0f9daad68fcda4c271cc003512e768f403a57e5242bd1f6aa1750d7f3597598094a43b1c7bb" + // refund_signature
        "fdd82600" // negotiation_fields
        , "hex"
      ); // prettier-ignore

      const instance = DlcAcceptV0.deserialize(buf);

      expect(instance.tempContractId).to.deep.equal(tempContractId);
      expect(Number(instance.acceptCollateralSatoshis)).to.equal(100000000);
      expect(instance.fundingPubKey).to.deep.equal(fundingPubKey);
      expect(instance.payoutSPK).to.deep.equal(payoutSPK);
      expect(Number(instance.payoutSerialId)).to.equal(1594186);
      expect(instance.fundingInputs[0].serialize().toString('hex')).to.equal(
        'fda714' + // type funding_input_v0
          '3f' + // length
          '000000000000dae8' + // input_serial_id
          '0029' + // prevtx_len
          '02000000000100c2eb0b000000001600149ea3bf2d6eb9c2ffa35e36f41e117403ed7fafe900000000' + // prevtx
          '00000000' + // prevtx_vout
          'ffffffff' + // sequence
          '006b' + // max_witness_len
          '0000', // redeem_script_len
      );
      expect(instance.changeSPK).to.deep.equal(changeSPK);
      expect(Number(instance.changeSerialId)).to.equal(885015);
      expect(instance.cetSignatures.serialize().toString('hex')).to.equal(
        'fda716' + // type cet_adaptor_signatures_v0
          'fd01e7' + // length
          '03' + // nb_signatures
          '016292f1b5c67b675aea69c95ec81e8462ab5bb9b7a01f810f6d1a7d1d886893b3605fe7fcb75a14b1b1de917917d37e9efac6437d7a080da53fb6dbbcfbfbe7a8' + // ecdsa_adaptor_signature_1
          '01efbecb2bce89556e1fb4d31622628830e02a6d04c487f67aca20e9f60fb127f985293541cd14e2bf04e4777d50953531e169dd37c65eb3cc17d6b5e4dbe58487f9fae1f68f603fe014a699a346b14a63048c26c9b31236d83a7e369a2b29a292' + // dleq_proof_1
          '00e52fe05d832bcce4538d9c27f3537a0f2086b265b6498f30cf667f77ff2fa87606574bc9a915ef57f7546ebb6852a490ad0547bdc52b19791d2d0f0cc0acabab' + // ecdsa_adaptor_signature_2
          '01f32459001a28850fa8ee4278111deb0494a8175f02e31a1c18b39bd82ec64026a6f341bcd5ba169d67b855030e36bdc65feecc0397a07d3bc514da69811ec5485f5553aebda782bc5ac9b47e8e11d701a38ef2c2b7d8af3906dd8dfc759754ce' + // dleq_proof_2
          '006f769592c744141a5ddface6e98f756a9df1bb75ad41508ea013bdfee133b396d85be51f870bf2e0ae836bfa984109dab96cc6f4ab2a7f118bc6b0b25a4c70d4' + // ecdsa_adaptor_signature_3
          '01c768c1d677c6ff0b7ea69fdf29aff1000794227db368dff16e838d1f44c4afe9e952ee63d603f7b14de13c1d73b363cc2b1740d0b688e73d8e71cddf40f8e7e912df413903779c4e5d6644c504c8609baec8fdcb90d6d341cf316748f5d7945f', // dleq_proof_3
      );
      expect(instance.refundSignature).to.deep.equal(refundSignature);
      expect(instance.negotiationFields.serialize().toString('hex')).to.equal(
        'fdd82600',
      );
    });
  });
});
