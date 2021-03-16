import { expect } from 'chai';
import { ContractInfo, ContractInfoV0 } from '../../lib/messages/ContractInfo';
import { OracleInfoV0 } from '../../lib/messages/OracleInfoV0';
import { ContractDescriptor } from '../../lib/messages/ContractDescriptor';
import { MessageType } from '../../lib/MessageType';

describe('OracleInfoV0', () => {
  describe('serialize', () => {
    it('serializes', () => {
      const instance = new ContractInfoV0();

      instance.length = BigInt(305);
      instance.totalCollateral = BigInt(200000000);
      instance.contractDescriptor = ContractDescriptor.deserialize(
        Buffer.from(
          'fda710' + // type contract_descriptor
            '79' + // length
            '03' + // num_outcomes
            'c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722' + // outcome_1
            '0000000000000000' + // payout_1
            'adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead' + // outcome_2
            '00000000092363a3' + // payout_2
            '6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288' + // outcome_3
            '000000000bebc200', // payout_3
          'hex',
        ),
      );
      instance.oracleInfo = OracleInfoV0.deserialize(
        Buffer.from(
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
        ),
      );

      expect(instance.serialize().toString("hex")).to.equal(
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
        "64756d6d79" // event_id
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf = Buffer.from(
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
        "64756d6d79" // event_id
        , "hex"
      ); // prettier-ignore

      const unknownInstance = ContractInfo.deserialize(buf);

      if (unknownInstance.type === MessageType.ContractInfoV0) {
        const instance = unknownInstance as ContractInfoV0;

        expect(instance.length).to.deep.equal(BigInt(305));
        expect(Number(instance.totalCollateral)).to.equal(200000000);
        expect(
          instance.contractDescriptor.serialize().toString('hex'),
        ).to.equal(
          'fda710' + // type contract_descriptor
            '79' + // length
            '03' + // num_outcomes
            'c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722' + // outcome_1
            '0000000000000000' + // payout_1
            'adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead' + // outcome_2
            '00000000092363a3' + // payout_2
            '6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288' + // outcome_3
            '000000000bebc200', // payout_3
        );
        expect(instance.oracleInfo.serialize().toString('hex')).to.equal(
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
        );
      }
    });
  });
});
