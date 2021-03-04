import { expect } from "chai";
import { OfferDlcV0 } from "../../lib/messages/OfferDlcV0";
import { ContractInfo } from "../../lib/messages/ContractInfo"
import { FundingInputV0 } from "../../lib/messages/FundingInputV0"

describe("EnumEventDescriptorV0", () => {
  const contractFlags = Buffer.from(
    "00",
    "hex"
  )

  const chainHash = Buffer.from(
    "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f",
    "hex"
  )

  const fundingPubKey = Buffer.from(
    "0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3",
    "hex"
  )

  const payoutSPK = Buffer.from(
    "00142bbdec425007dc360523b0294d2c64d2213af498",
    "hex"
  )

  const changeSPK = Buffer.from(
    "0014afa16f949f3055f38bd3a73312bed00b61558884",
    "hex"
  )

  describe("serialize", () => {
    it("serializes", () => {
      const instance = new OfferDlcV0();

      instance.contractFlags = contractFlags
      instance.chainHash = chainHash

      instance.contractInfo = ContractInfo.deserialize(
        Buffer.from(
          "fdd82e" + // type contract_info
          "fd0131" + // length
          "000000000bebc200" + // total_collateral
          "fda710" + // type contract_descriptor
          "79" + // length
          "03" + // num_outcomes
          "c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722" + // outcome_1
          "0000000000000000" + // payout_1
          "adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead" + // outcome_2
          "00000000092363a3" + // payout_2
          "6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288" + // outcome_3
          "000000000bebc200" + // payout_3
          "fda712" + // type oracle_info
          "a8" + // length
          "fdd824" + // type oracle_announcement
          "a4" + // length
          "fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9" + // announcement_signature_r
          "494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4" + // announcement_signature_s
          "da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b" + // oracle_public_key
          "fdd822" + // type oracle_event
          "40" + // length
          "0001" + // nb_nonces
          "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
          "00000000" + // event_maturity_epoch
          "fdd806" + // type enum_event_descriptor
          "10" + // length
          "0002" + // num_outcomes
          "06" + // outcome_1_len
          "64756d6d7931" + // outcome_1
          "06" + // outcome_2_len
          "64756d6d7932" + // outcome_2
          "05" + // event_id_length
          "64756d6d79", // event_id
          "hex"
        )
      )

      instance.fundingPubKey = fundingPubKey
      instance.payoutSPK = payoutSPK
      instance.totalCollateralSatoshis = BigInt(100000000)
      instance.fundingInputs = [
        FundingInputV0.deserialize(
          Buffer.from(
            "fda714" + 
            "39" + // length
            "000000000000fa51" + // input_serial_id
            "0029" + // prevtx_len
            "02000000000100c2eb0b00000000160014369d63a82ed846f4d47ad55045e594ab95539d6000000000" + // prevtx
            "00000000" + // prevtx_vout
            "ffffffff" + // sequence
            "006b" + // max_witness_len
            "0000", // redeemscript_len
            "hex"
          )
        )
      ]
      instance.changeSPK = changeSPK
      instance.feeRate = BigInt(1)
      instance.contractMaturityBound = 100
      instance.contractTimeout = 200

      expect(instance.serialize().toString("hex")).to.equal(
        "a71a" + // type
        "00" + // contract_flags
        "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash

        "fdd82e" + // type contract_info
        "fd0131" + // length
        "000000000bebc200" + // total_collateral
        "fda710" + // type contract_descriptor
        "79" + // length
        "03" + // num_outcomes
        "c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722" + // outcome_1
        "0000000000000000" + // payout_1
        "adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead" + // outcome_2
        "00000000092363a3" + // payout_2
        "6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288" + // outcome_3
        "000000000bebc200" + // payout_3
        "fda712" + // type oracle_info
        "a8" + // length
        "fdd824" + // type oracle_announcement
        "a4" + // length
        "fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9" + // announcement_signature_r
        "494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4" + // announcement_signature_s
        "da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b" + // oracle_public_key
        "fdd822" + // type oracle_event
        "40" + // length
        "0001" + // nb_nonces
        "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
        "00000000" + // event_maturity_epoch
        "fdd806" + // type enum_event_descriptor
        "10" + // length
        "0002" + // num_outcomes
        "06" + // outcome_1_len
        "64756d6d7931" + // outcome_1
        "06" + // outcome_2_len
        "64756d6d7932" + // outcome_2
        "05" + // event_id_length
        "64756d6d79" + // event_id

        "0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3" + // funding_pubkey

        "0016" + // payout_spk_len
        "00142bbdec425007dc360523b0294d2c64d2213af498" + // payout_spk

        "0000000005f5e100" + // total_collateral_satoshis

        "0001" + // funding_inputs_len
        
        "fda714" + // type funding_input
        "39" + // length
        "000000000000fa51" + // input_serial_id
        "0029" + // prevtx_len
        "02000000000100c2eb0b00000000160014369d63a82ed846f4d47ad55045e594ab95539d6000000000" + // prevtx
        "00000000" + // prevtx_vout
        "ffffffff" + // sequence
        "006b" + // max_witness_len
        "0000" + // redeemscript_len

        "0016" + // change_spk_len
        "0014afa16f949f3055f38bd3a73312bed00b61558884" + // change_spk

        "0000000000000001" + // fee_rate

        "00000064" + // contract_maturity_bound
        "000000c8" // contract_timeout
      ); // prettier-ignore
    });
  });

  describe("deserialize", () => {
    it("deserializes", () => {
      const buf = Buffer.from(
        "a71a" + // type
        "00" + // contract_flags
        "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash

        "fdd82e" + // type contract_info
        "fd0131" + // length
        "000000000bebc200" + // total_collateral
        "fda710" + // type contract_descriptor
        "79" + // length
        "03" + // num_outcomes
        "c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722" + // outcome_1
        "0000000000000000" + // payout_1
        "adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead" + // outcome_2
        "00000000092363a3" + // payout_2
        "6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288" + // outcome_3
        "000000000bebc200" + // payout_3
        "fda712" + // type oracle_info
        "a8" + // length
        "fdd824" + // type oracle_announcement
        "a4" + // length
        "fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9" + // announcement_signature_r
        "494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4" + // announcement_signature_s
        "da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b" + // oracle_public_key
        "fdd822" + // type oracle_event
        "40" + // length
        "0001" + // nb_nonces
        "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
        "00000000" + // event_maturity_epoch
        "fdd806" + // type enum_event_descriptor
        "10" + // length
        "0002" + // num_outcomes
        "06" + // outcome_1_len
        "64756d6d7931" + // outcome_1
        "06" + // outcome_2_len
        "64756d6d7932" + // outcome_2
        "05" + // event_id_length
        "64756d6d79" + // event_id

        "0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3" + // funding_pubkey

        "0016" + // payout_spk_len
        "00142bbdec425007dc360523b0294d2c64d2213af498" + // payout_spk

        "0000000005f5e100" + // total_collateral_satoshis

        "0001" + // funding_inputs_len
        
        "fda714" + // type funding_input
        "3f" + // length
        "000000000000fa51" + // input_serial_id
        "0029" + // prevtx_len
        "02000000000100c2eb0b00000000160014369d63a82ed846f4d47ad55045e594ab95539d6000000000" + // prevtx
        "00000000" + // prevtx_vout
        "ffffffff" + // sequence
        "006b" + // max_witness_len
        "0000" + // redeemscript_len

        "0016" + // change_spk_len
        "0014afa16f949f3055f38bd3a73312bed00b61558884" + // change_spk

        "0000000000000001" + // fee_rate

        "00000064" + // contract_maturity_bound
        "000000c8" // contract_timeout
        , "hex"
      ); // prettier-ignore

      const instance = OfferDlcV0.deserialize(buf);

      expect(instance.contractFlags).to.deep.equal(contractFlags)
      expect(instance.chainHash).to.deep.equal(chainHash)
      expect(instance.contractInfo.serialize().toString('hex')).to.equal(
        "fdd82e" + // type contract_info
        "fd0131" + // length
        "000000000bebc200" + // total_collateral
        "fda710" + // type contract_descriptor
        "79" + // length
        "03" + // num_outcomes
        "c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722" + // outcome_1
        "0000000000000000" + // payout_1
        "adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead" + // outcome_2
        "00000000092363a3" + // payout_2
        "6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288" + // outcome_3
        "000000000bebc200" + // payout_3
        "fda712" + // type oracle_info
        "a8" + // length
        "fdd824" + // type oracle_announcement
        "a4" + // length
        "fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9" + // announcement_signature_r
        "494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4" + // announcement_signature_s
        "da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b" + // oracle_public_key
        "fdd822" + // type oracle_event
        "40" + // length
        "0001" + // nb_nonces
        "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
        "00000000" + // event_maturity_epoch
        "fdd806" + // type enum_event_descriptor
        "10" + // length
        "0002" + // num_outcomes
        "06" + // outcome_1_len
        "64756d6d7931" + // outcome_1
        "06" + // outcome_2_len
        "64756d6d7932" + // outcome_2
        "05" + // event_id_length
        "64756d6d79", // event_id
      )
      expect(instance.fundingPubKey).to.deep.equal(fundingPubKey)
      expect(instance.payoutSPK).to.deep.equal(payoutSPK)
      expect(Number(instance.totalCollateralSatoshis)).to.equal(100000000)
      expect(instance.fundingInputs[0].serialize().toString('hex')).to.equal(
        "fda714" + 
        "3f" + // length
        "000000000000fa51" + // input_serial_id
        "0029" + // prevtx_len
        "02000000000100c2eb0b00000000160014369d63a82ed846f4d47ad55045e594ab95539d6000000000" + // prevtx
        "00000000" + // prevtx_vout
        "ffffffff" + // sequence
        "006b" + // max_witness_len
        "0000" // redeemscript_len
      )
      expect(instance.changeSPK).to.deep.equal(changeSPK)
      expect(Number(instance.feeRate)).to.equal(1)
      expect(instance.contractMaturityBound).to.equal(100)
      expect(instance.contractTimeout).to.equal(200)
    });
  });
});
