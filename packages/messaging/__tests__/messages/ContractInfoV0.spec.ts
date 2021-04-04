import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ContractInfo, ContractInfoV0 } from '../../lib/messages/ContractInfo';
import { OracleInfoV0 } from '../../lib/messages/OracleInfoV0';
import {
  ContractDescriptor,
  ContractDescriptorV1,
} from '../../lib/messages/ContractDescriptor';
import { MessageType } from '../../lib/MessageType';
import { DigitDecompositionEventDescriptorV0 } from '../../lib/messages/EventDescriptor';
import { OracleEventV0 } from '../../lib/messages/OracleEventV0';
import { OracleAnnouncementV0 } from '../../lib/messages/OracleAnnouncementV0';
import { RoundingIntervalsV0 } from '../../lib/messages/RoundingIntervalsV0';
import { HyperbolaPayoutCurvePiece } from '../../lib/messages/PayoutCurvePiece';
import { PayoutFunctionV0 } from '../../lib/messages/PayoutFunction';

chai.use(chaiAsPromised);
const expect = chai.expect;

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

  describe('validate', () => {
    it('should throw Error if oracle numDigits does not match', async () => {
      const eventDescriptorNumDigits = 17;
      const contractDescriptorNumDigits = 18;

      const eventDescriptor = new DigitDecompositionEventDescriptorV0();
      eventDescriptor.base = 2;
      eventDescriptor.isSigned = false;
      eventDescriptor.unit = 'BTC-USD';
      eventDescriptor.precision = 0;
      eventDescriptor.nbDigits = eventDescriptorNumDigits;

      const oracleEvent = new OracleEventV0();
      oracleEvent.oracleNonces = [
        Buffer.from(
          '86abd0a6bfd4eb3c922942b2b9dc73bde7c9dd8c7aa99002a8163c2e4b38cd62',
          'hex',
        ),
        Buffer.from(
          '892bd4e9e6721212f7564d6852d61079ee91e6ec34be9ac82d372ab95a30843b',
          'hex',
        ),
        Buffer.from(
          '51803a36bc1f730c4c98d4c42670e4032dddd95a3c1652b2605b6da4a183b557',
          'hex',
        ),
        Buffer.from(
          'f2251ae87c0e2beb60c446a7bddb6a5fc2f8a40f4f6654debe1cfea1c10cda60',
          'hex',
        ),
        Buffer.from(
          '8241d2e6ee7c8461dc97819388f70194288d971bdd1fb33ceecc3b385231e109',
          'hex',
        ),
        Buffer.from(
          'f40acbd8eb1f991af7a6cdecfb4ee55bc0c0cc0b0e57fd25c0806f527090b9f0',
          'hex',
        ),
        Buffer.from(
          'd1e1a0bdf4b77e51cd3cdf48ddcd4eacfe470093cf5c6d4efc6378c2707768ba',
          'hex',
        ),
        Buffer.from(
          'db378b479adcc1e8a2d9529660de84a83f670f10a1b132802475ab25e930bfe1',
          'hex',
        ),
        Buffer.from(
          'cc464acf38acf689392e2a42a285293dbc1508fd068ff71773af1aa9ba745035',
          'hex',
        ),
        Buffer.from(
          '22b35d2f0c8c57e3a05b1b3302184c04a13d993182e3b16164cd8aec8654f2e2',
          'hex',
        ),
        Buffer.from(
          'b86687fbdde1916777de543456ad0ca8b1fd53bd8bb27c63c4f8f2b8515266e6',
          'hex',
        ),
        Buffer.from(
          '3c1557ff94451f7f39a8813b4745da1a96e6557bf342b3673af227b868fea945',
          'hex',
        ),
        Buffer.from(
          '42d08251205359fda89476e54b6ca32cd2ffbcf114ca0054e8c2d3c75937fd12',
          'hex',
        ),
        Buffer.from(
          '1775f577eb78fcd6a2473fcc924b38f0131771acc43e0372393385cb16e2bb7b',
          'hex',
        ),
        Buffer.from(
          '0757f00df962a4cad733650fe954c0435beed69f660a1b0ad94cdbbe0b832c34',
          'hex',
        ),
        Buffer.from(
          '726fd163999a9696eaac31bc1fb9c3a09111afe01e48f1426febb145a4880bb2',
          'hex',
        ),
        Buffer.from(
          'aef72be43d1b240db3b26fa668f3c28fe9d929cfa5183501ee2c4797029c39a6',
          'hex',
        ),
      ];
      oracleEvent.eventMaturityEpoch = 1617170572;
      oracleEvent.eventDescriptor = eventDescriptor;
      oracleEvent.eventId = 'btc/usd';

      const oracleAnnouncement = new OracleAnnouncementV0();
      oracleAnnouncement.announcementSig = Buffer.from(
        '86abd0a6bfd4eb3c922942b2b9dc73bde7c9dd8c7aa99002a8163c2e4b38cd62dec932dab7eaf0327464a70baa62af80e3a9f7338a2e99ef4ed8a5af264e36e2',
        'hex',
      );
      oracleAnnouncement.oraclePubkey = Buffer.from(
        'd2e95c66de1c365bfce6d8fcc31895bf3c2e77e7298c98e7ceadd0abaf8ee334',
        'hex',
      );
      oracleAnnouncement.oracleEvent = oracleEvent;

      const oracleInfo = new OracleInfoV0();
      oracleInfo.announcement = oracleAnnouncement;

      const hyperbolaPayoutCurvePiece = new HyperbolaPayoutCurvePiece();
      hyperbolaPayoutCurvePiece.usePositivePiece = true;
      hyperbolaPayoutCurvePiece.translateOutcomeSign = true;
      hyperbolaPayoutCurvePiece.translateOutcome = BigInt(0);
      hyperbolaPayoutCurvePiece.translateOutcomeExtraPrecision = 0;
      hyperbolaPayoutCurvePiece.translatePayoutSign = false;
      hyperbolaPayoutCurvePiece.translatePayout = BigInt(30518);
      hyperbolaPayoutCurvePiece.translatePayoutExtraPrecision = 0;
      hyperbolaPayoutCurvePiece.aSign = true;
      hyperbolaPayoutCurvePiece.a = BigInt(1);
      hyperbolaPayoutCurvePiece.aExtraPrecision = 0;
      hyperbolaPayoutCurvePiece.bSign = true;
      hyperbolaPayoutCurvePiece.b = BigInt(0);
      hyperbolaPayoutCurvePiece.bExtraPrecision = 0;
      hyperbolaPayoutCurvePiece.cSign = true;
      hyperbolaPayoutCurvePiece.c = BigInt(0);
      hyperbolaPayoutCurvePiece.cExtraPrecision = 0;
      hyperbolaPayoutCurvePiece.dSign = true;
      hyperbolaPayoutCurvePiece.d = BigInt(4000000000);
      hyperbolaPayoutCurvePiece.dExtraPrecision = 0;

      const payoutFunction = new PayoutFunctionV0();
      payoutFunction.endpoint0 = BigInt(0);
      payoutFunction.endpointPayout0 = BigInt(969482);
      payoutFunction.extraPrecision0 = 0;
      payoutFunction.pieces = [
        {
          payoutCurvePiece: hyperbolaPayoutCurvePiece,
          endpoint: BigInt(131071),
          endpointPayout: BigInt(0),
          extraPrecision: 0,
        },
      ];

      const roundingIntervals = new RoundingIntervalsV0();
      roundingIntervals.intervals = [
        {
          beginInterval: BigInt(0),
          roundingMod: BigInt(500),
        },
      ];

      const contractDescriptor = new ContractDescriptorV1();
      contractDescriptor.numDigits = contractDescriptorNumDigits;
      contractDescriptor.payoutFunction = payoutFunction;
      contractDescriptor.roundingIntervals = roundingIntervals;

      const contractInfo = new ContractInfoV0();
      contractInfo.totalCollateral = BigInt(969482);
      contractInfo.contractDescriptor = contractDescriptor;
      contractInfo.oracleInfo = oracleInfo;

      expect(function () {
        contractInfo.validate();
      }).to.throw(Error);
    });
  });
});
