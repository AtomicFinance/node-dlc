import BitcoinNetworks from '@liquality/bitcoin-networks';
import { expect } from 'chai';
import { ContractInfo } from '../../lib/messages/ContractInfo';
import { DlcOffer, DlcOfferV0 } from '../../lib/messages/DlcOffer';
import { FundingInputV0 } from '../../lib/messages/FundingInput';
import { MessageType } from '../../lib/MessageType';

describe('DlcOfferV0', () => {
  const type = Buffer.from('a71a', 'hex');
  const contractFlags = Buffer.from('00', 'hex');
  const chainHash = Buffer.from(
    '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
    'hex',
  );
  const contractInfo = Buffer.from(
    'fdd82e' + // type contract_info
      'fd0131' + // length
      '000000000bebc200' + // total_collateral
      'fda710' + // type contract_descriptor
      '79' + // length
      '03' + // num_outcomes
      'c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722' + // outcome_1
      '0000000000000000' + // payout_1
      'adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead' + // outcome_2
      '00000000092363a3' + // payout_2
      '6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288' + // outcome_3
      '000000000bebc200' + // payout_3
      'fda712' + // type oracle_info
      'a8' + // length
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
      '64756d6d79', // event_id
    'hex',
  );

  const fundingPubKey = Buffer.from(
    '0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3',
    'hex',
  );

  const payoutSPKLen = Buffer.from('0016', 'hex');
  const payoutSPK = Buffer.from(
    '00142bbdec425007dc360523b0294d2c64d2213af498',
    'hex',
  );

  const payoutSerialID = Buffer.from('0000000000b051dc', 'hex');
  const totalCollateralSatoshis = Buffer.from('0000000005f5e100', 'hex'); // 100000000
  const fundingInputsLen = Buffer.from('0001', 'hex');

  const fundingInputV0 = Buffer.from(
    'fda714' +
      '3f' + // length
      '000000000000fa51' + // input_serial_id
      '0029' + // prevtx_len
      '02000000000100c2eb0b00000000160014369d63a82ed846f4d47ad55045e594ab95539d6000000000' + // prevtx
      '00000000' + // prevtx_vout
      'ffffffff' + // sequence
      '006b' + // max_witness_len
      '0000', // redeemscript_len
    'hex',
  );

  const changeSPKLen = Buffer.from('0016', 'hex');
  const changeSPK = Buffer.from(
    '0014afa16f949f3055f38bd3a73312bed00b61558884',
    'hex',
  );

  const changeSerialID = Buffer.from('00000000001ea3ed', 'hex');
  const fundOutputSerialID = Buffer.from('000000000052947a', 'hex');
  const feeRatePerVb = Buffer.from('0000000000000001', 'hex');
  const cetLocktime = Buffer.from('00000064', 'hex');
  const refundLocktime = Buffer.from('000000c8', 'hex');

  const dlcOfferHex = Buffer.from(
    Buffer.concat([
      type,
      contractFlags,
      chainHash,
      contractInfo,
      fundingPubKey,
      payoutSPKLen,
      payoutSPK,
      payoutSerialID,
      totalCollateralSatoshis,
      fundingInputsLen,
      fundingInputV0,
      changeSPKLen,
      changeSPK,
      changeSerialID,
      fundOutputSerialID,
      feeRatePerVb,
      cetLocktime,
      refundLocktime,
    ]),
  );

  const bitcoinNetwork = BitcoinNetworks.bitcoin_regtest;

  // const dlcOfferHex2 = Buffer.from(
  //   "a71a" + // type
  //   "00" + // contract_flags
  //   "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash

  //   "fdd82e" + // type contract_info
  //   "fd0131" + // length
  //   "000000000bebc200" + // total_collateral
  //   "fda710" + // type contract_descriptor
  //   "79" + // length
  //   "03" + // num_outcomes
  //   "c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722" + // outcome_1
  //   "0000000000000000" + // payout_1
  //   "adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead" + // outcome_2
  //   "00000000092363a3" + // payout_2
  //   "6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288" + // outcome_3
  //   "000000000bebc200" + // payout_3
  //   "fda712" + // type oracle_info
  //   "a8" + // length
  //   "fdd824" + // type oracle_announcement
  //   "a4" + // length
  //   "fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9" + // announcement_signature_r
  //   "494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4" + // announcement_signature_s
  //   "da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b" + // oracle_public_key
  //   "fdd822" + // type oracle_event
  //   "40" + // length
  //   "0001" + // nb_nonces
  //   "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
  //   "00000000" + // event_maturity_epoch
  //   "fdd806" + // type enum_event_descriptor
  //   "10" + // length
  //   "0002" + // num_outcomes
  //   "06" + // outcome_1_len
  //   "64756d6d7931" + // outcome_1
  //   "06" + // outcome_2_len
  //   "64756d6d7932" + // outcome_2
  //   "05" + // event_id_length
  //   "64756d6d79" + // event_id

  //   "0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3" + // funding_pubkey

  //   "0016" + // payout_spk_len
  //   "00142bbdec425007dc360523b0294d2c64d2213af498" + // payout_spk

  //   "0000000000b051dc" + // payout_serial_id

  //   "0000000005f5e100" + // total_collateral_satoshis

  //   "0001" + // funding_inputs_len

  //   "fda714" + // type funding_input
  //   "3f" + // length
  //   "000000000000fa51" + // input_serial_id
  //   "0029" + // prevtx_len
  //   "02000000000100c2eb0b00000000160014369d63a82ed846f4d47ad55045e594ab95539d6000000000" + // prevtx
  //   "00000000" + // prevtx_vout
  //   "ffffffff" + // sequence
  //   "006b" + // max_witness_len
  //   "0000" + // redeemscript_len

  //   "0016" + // change_spk_len
  //   "0014afa16f949f3055f38bd3a73312bed00b61558884" + // change_spk

  //   "00000000001ea3ed" + // change_serial_id
  //   "000000000052947a" + // funding_output_serial_id

  //   "0000000000000001" + // fee_rate_per_vb

  //   "00000064" + // cet_locktime
  //   "000000c8" // refund_locktime
  //   , "hex"
  // ); // prettier-ignore

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new DlcOfferV0();

      instance.contractFlags = contractFlags;
      instance.chainHash = chainHash;

      instance.contractInfo = ContractInfo.deserialize(contractInfo);

      instance.fundingPubKey = fundingPubKey;
      instance.payoutSPK = payoutSPK;
      instance.payoutSerialId = BigInt(11555292);
      instance.offerCollateralSatoshis = BigInt(100000000);
      instance.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];
      instance.changeSPK = changeSPK;
      instance.changeSerialId = BigInt(2008045);
      instance.fundOutputSerialId = BigInt(5411962);
      instance.feeRatePerVb = BigInt(1);
      instance.cetLocktime = 100;
      instance.refundLocktime = 200;

      expect(instance.serialize().toString('hex')).to.equal(
        dlcOfferHex.toString('hex'),
      );
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const unknownInstance = DlcOffer.deserialize(dlcOfferHex);

      if (unknownInstance.type === MessageType.DlcOfferV0) {
        const instance = unknownInstance as DlcOfferV0;

        expect(instance.contractFlags).to.deep.equal(contractFlags);
        expect(instance.chainHash).to.deep.equal(chainHash);
        expect(instance.contractInfo.serialize().toString('hex')).to.equal(
          contractInfo.toString('hex'),
        );
        expect(instance.fundingPubKey).to.deep.equal(fundingPubKey);
        expect(instance.payoutSPK).to.deep.equal(payoutSPK);
        expect(Number(instance.payoutSerialId)).to.equal(11555292);
        expect(Number(instance.offerCollateralSatoshis)).to.equal(100000000);
        expect(instance.fundingInputs[0].serialize().toString('hex')).to.equal(
          fundingInputV0.toString('hex'),
        );
        expect(instance.changeSPK).to.deep.equal(changeSPK);
        expect(Number(instance.changeSerialId)).to.equal(2008045);
        expect(Number(instance.fundOutputSerialId)).to.equal(5411962);
        expect(Number(instance.feeRatePerVb)).to.equal(1);
        expect(instance.cetLocktime).to.equal(100);
        expect(instance.refundLocktime).to.equal(200);
      } else {
        throw Error('DlcOffer Incorrect type');
      }
    });
  });

  describe('getAddresses', () => {
    it('should get addresses', async () => {
      const expectedFundingAddress =
        'bcrt1qayylp95g2tzq2a60x2l7f8mclnx5y2jxm0yt09';
      const expectedChangeAddress =
        'bcrt1q47skl9ylxp2l8z7n5ue390kspds4tzyy5jdxs8';
      const expectedPayoutAddress =
        'bcrt1q9w77csjsqlwrvpfrkq556try6gsn4ayc2kn0kl';

      const unknownInstance = DlcOffer.deserialize(dlcOfferHex);

      if (unknownInstance.type === MessageType.DlcOfferV0) {
        const instance = unknownInstance as DlcOfferV0;

        const {
          fundingAddress,
          changeAddress,
          payoutAddress,
        } = await instance.getAddresses(bitcoinNetwork);

        expect(fundingAddress).to.equal(expectedFundingAddress);
        expect(changeAddress).to.equal(expectedChangeAddress);
        expect(payoutAddress).to.equal(expectedPayoutAddress);
      } else {
        throw Error('DlcOffer Incorrect type');
      }
    });
  });

  describe('validate', () => {
    it('should throw Error if payout_spk is invalid', () => {
      const instance = new DlcOfferV0();

      instance.contractFlags = contractFlags;
      instance.chainHash = chainHash;

      instance.contractInfo = ContractInfo.deserialize(contractInfo);

      instance.fundingPubKey = fundingPubKey;
      instance.payoutSPK = Buffer.from('ggggggg', 'hex'); // Set incorrect payoutSPK
      instance.payoutSerialId = BigInt(11555292);
      instance.offerCollateralSatoshis = BigInt(100000000);
      instance.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];
      instance.changeSPK = changeSPK;
      instance.changeSerialId = BigInt(2008045);
      instance.fundOutputSerialId = BigInt(5411962);
      instance.feeRatePerVb = BigInt(1);
      instance.cetLocktime = 100;
      instance.refundLocktime = 200;

      expect(function () {
        instance.validate();
      }).to.throw(Error);
    });
    it('should throw Error if total collateral less than offer collateral', () => {
      const instance = new DlcOfferV0();

      instance.contractFlags = contractFlags;
      instance.chainHash = chainHash;

      instance.contractInfo = ContractInfo.deserialize(contractInfo);

      instance.fundingPubKey = fundingPubKey;
      instance.payoutSPK = payoutSPK;
      instance.payoutSerialId = BigInt(11555292);
      instance.offerCollateralSatoshis = BigInt(10000000000); // Set offer collateral > total collateral
      instance.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];
      instance.changeSPK = changeSPK;
      instance.changeSerialId = BigInt(2008045);
      instance.fundOutputSerialId = BigInt(5411962);
      instance.feeRatePerVb = BigInt(1);
      instance.cetLocktime = 100;
      instance.refundLocktime = 200;

      expect(function () {
        instance.validate();
      }).to.throw(Error);
    });
  });
});
