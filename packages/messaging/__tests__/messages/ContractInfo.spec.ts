import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  EnumeratedDescriptor,
  NumericalDescriptor,
} from '../../lib/messages/ContractDescriptor';
import {
  ContractInfo,
  SingleContractInfo,
} from '../../lib/messages/ContractInfo';
import {
  DigitDecompositionEventDescriptor,
  EnumEventDescriptor,
} from '../../lib/messages/EventDescriptor';
import { OracleAnnouncement } from '../../lib/messages/OracleAnnouncement';
import { OracleEvent } from '../../lib/messages/OracleEvent';
import { SingleOracleInfo } from '../../lib/messages/OracleInfo';
import { HyperbolaPayoutCurvePiece } from '../../lib/messages/PayoutCurvePiece';
import { PayoutFunction } from '../../lib/messages/PayoutFunction';
import { RoundingIntervals } from '../../lib/messages/RoundingIntervals';
import { F64 } from '../../lib/serialize/F64';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('ContractInfo', () => {
  describe('SingleContractInfo', () => {
    describe('serialize', () => {
      it('serializes with enumerated contract descriptor', () => {
        const instance = new SingleContractInfo();
        instance.totalCollateral = BigInt(200000000);

        // Create contract descriptor programmatically to match new format
        const contractDescriptor = new EnumeratedDescriptor();
        contractDescriptor.outcomes = [
          { outcome: 'outcome1', localPayout: BigInt(0) },
          { outcome: 'outcome2', localPayout: BigInt(150000000) },
          { outcome: 'outcome3', localPayout: BigInt(200000000) },
        ];
        instance.contractDescriptor = contractDescriptor;

        // Create oracle info programmatically to match new format
        const oracleAnnouncement = new OracleAnnouncement();
        oracleAnnouncement.announcementSig = Buffer.from(
          'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4',
          'hex',
        );
        oracleAnnouncement.oraclePubkey = Buffer.from(
          'da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b',
          'hex',
        );

        const oracleEvent = new OracleEvent();
        oracleEvent.oracleNonces = [
          Buffer.from(
            '3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b',
            'hex',
          ),
        ];
        oracleEvent.eventMaturityEpoch = 0;

        const eventDescriptor = new EnumEventDescriptor();
        eventDescriptor.outcomes = ['dummy1', 'dummy2'];
        oracleEvent.eventDescriptor = eventDescriptor;
        oracleEvent.eventId = 'dummy';

        oracleAnnouncement.oracleEvent = oracleEvent;

        const oracleInfo = new SingleOracleInfo();
        oracleInfo.announcement = oracleAnnouncement;
        instance.oracleInfo = oracleInfo;

        // Test that it serializes without errors
        const serialized = instance.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);
      });

      it('serializes with numerical contract descriptor', () => {
        const instance = new SingleContractInfo();
        instance.totalCollateral = BigInt(969482);

        // Create numerical contract descriptor with payout function
        const contractDescriptor = new NumericalDescriptor();
        contractDescriptor.numDigits = 18;

        // Create a proper PayoutFunction with the new structure
        const payoutFunction = new PayoutFunction();

        // Create hyperbola payout curve piece
        const hyperbolaPayoutCurvePiece = new HyperbolaPayoutCurvePiece();
        hyperbolaPayoutCurvePiece.usePositivePiece = true;
        hyperbolaPayoutCurvePiece.translateOutcome = F64.fromNumber(0);
        hyperbolaPayoutCurvePiece.translatePayout = F64.fromNumber(30518);
        hyperbolaPayoutCurvePiece.a = F64.fromNumber(1);
        hyperbolaPayoutCurvePiece.b = F64.fromNumber(0);
        hyperbolaPayoutCurvePiece.c = F64.fromNumber(0);
        hyperbolaPayoutCurvePiece.d = F64.fromNumber(4000000000);

        payoutFunction.payoutFunctionPieces = [
          {
            endPoint: {
              eventOutcome: BigInt(131071),
              outcomePayout: BigInt(0),
              extraPrecision: 0,
            },
            payoutCurvePiece: hyperbolaPayoutCurvePiece,
          },
        ];

        payoutFunction.lastEndpoint = {
          eventOutcome: BigInt(0),
          outcomePayout: BigInt(969482),
          extraPrecision: 0,
        };

        contractDescriptor.payoutFunction = payoutFunction;

        // Create rounding intervals
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(0),
            roundingMod: BigInt(500),
          },
        ];
        contractDescriptor.roundingIntervals = roundingIntervals;

        instance.contractDescriptor = contractDescriptor;

        // Create oracle info for numerical contract
        const eventDescriptor = new DigitDecompositionEventDescriptor();
        eventDescriptor.base = 2;
        eventDescriptor.isSigned = false;
        eventDescriptor.unit = 'BTCUSD';
        eventDescriptor.precision = 0;
        eventDescriptor.nbDigits = 18;

        const oracleEvent = new OracleEvent();
        oracleEvent.oracleNonces = [
          'c3347aa29db9f5e619483a92e746be91982bc66127e856bee62daeb91148cb92',
          'fbdffe731b410c1d735ad7ce868f40d5b4a44c29131b0feca0f9c28f3a5c2fee',
          '4326fc9c19013d4ca30f9f5dc184a6dab417acd4486528f14dbae2d2279bd29e',
          'dd88db0628df7e17ddcafe3a274518d0a4f6baa100308b5522ad099b27305b5b',
          '448774d5544b0151f112dd6f1cfc28df0e575e38bb8acb5c164357ebdb8bd364',
          '5b8dd47e80fe9c12741190a515ff7d8a801911ab64f8c6117303cf0f065ae055',
          '4b1f14efbba6e3bf7e5f4c40d5735ff126f23ac9a41659a05bebdd3596eb8d56',
          'd8d7524476c8f5e014a536cf513de7136fac9d3925d1f479c2f68b09ea3f43cd',
          '3719a5d31121084fd9f25f77bf042d2da23075102acf59e3e592e8a3a2220940',
          '64cf5b50bbc405c14078f82240aa38403fafcbee3c74c3e8ca361e60001cbc74',
          '149631c02f1f26ead45f9560ffe6cb1684c8c068d6eb1f03fdd655827b9f2531',
          '2669158073d4c5ebe4855e724b6650f8214697b17eeac1ef33a582d4efb73c90',
          '6abaac5f261322a5097115aaadaeca025e4eae0cdfb26fc591bc05820606929e',
          'b437c474dff5ed40fb7dcf298f5a1a70e95658135cb72008c3fbd515d86e59c3',
          'f85acb02775200421eda2c99c4a12975c9ac0d460ae7c9340e814745df4ebb54',
          '5a719fe0b7e44bab56448a4007f40a09f3adc57fcee18089d6334655c407a63a',
          '27540f4887299b36646b7c2202aef86bb0e7e68efc508583039f74c41cb57d66',
          'ed5b9a675d77506b71f597dc59e6777cbba054c82d3ba139e82d74ca717b0d0c',
        ].map((hex) => Buffer.from(hex, 'hex'));

        oracleEvent.eventMaturityEpoch = 1635321600;
        oracleEvent.eventDescriptor = eventDescriptor;
        oracleEvent.eventId = 'Deribit-BTC-27OCT21';

        const oracleAnnouncement = new OracleAnnouncement();
        oracleAnnouncement.announcementSig = Buffer.from(
          'c3347aa29db9f5e619483a92e746be91982bc66127e856bee62daeb91148cb92a1074a802a481c008ba44143c752e519c28d906658e5257d9d82e80ef66cbf0f',
          'hex',
        );
        oracleAnnouncement.oraclePubkey = Buffer.from(
          '4f15b5e4b8000c33a8e5bbdbc6802375a7d6e7cefcfbf098aa51ce7da0f910c1',
          'hex',
        );
        oracleAnnouncement.oracleEvent = oracleEvent;

        const oracleInfo = new SingleOracleInfo();
        oracleInfo.announcement = oracleAnnouncement;
        instance.oracleInfo = oracleInfo;

        // Test that it serializes without errors
        const serialized = instance.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);
      });
    });

    describe('deserialize', () => {
      it('deserializes enumerated contract', () => {
        // Create a test instance and serialize it first
        const originalInstance = new SingleContractInfo();
        originalInstance.totalCollateral = BigInt(200000000);

        // Create contract descriptor
        const contractDescriptor = new EnumeratedDescriptor();
        contractDescriptor.outcomes = [
          { outcome: 'outcome1', localPayout: BigInt(0) },
          { outcome: 'outcome2', localPayout: BigInt(100000000) },
          { outcome: 'outcome3', localPayout: BigInt(200000000) },
        ];
        originalInstance.contractDescriptor = contractDescriptor;

        // Create oracle info
        const oracleAnnouncement = new OracleAnnouncement();
        oracleAnnouncement.announcementSig = Buffer.from(
          'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4',
          'hex',
        );
        oracleAnnouncement.oraclePubkey = Buffer.from(
          'da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b',
          'hex',
        );

        const oracleEvent = new OracleEvent();
        oracleEvent.oracleNonces = [
          Buffer.from(
            '3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b',
            'hex',
          ),
        ];
        oracleEvent.eventMaturityEpoch = 0;

        const eventDescriptor = new EnumEventDescriptor();
        eventDescriptor.outcomes = ['dummy1', 'dummy2'];
        oracleEvent.eventDescriptor = eventDescriptor;
        oracleEvent.eventId = 'dummy';

        oracleAnnouncement.oracleEvent = oracleEvent;

        const oracleInfo = new SingleOracleInfo();
        oracleInfo.announcement = oracleAnnouncement;
        originalInstance.oracleInfo = oracleInfo;

        // Serialize and then deserialize to ensure round-trip consistency
        const serialized = originalInstance.serialize();
        const unknownInstance = ContractInfo.deserialize(serialized);

        if (unknownInstance instanceof SingleContractInfo) {
          const instance = unknownInstance as SingleContractInfo;

          expect(Number(instance.totalCollateral)).to.equal(200000000);
          expect(instance.contractDescriptor).to.be.instanceof(
            EnumeratedDescriptor,
          );
          expect(instance.oracleInfo).to.be.instanceof(SingleOracleInfo);

          // Verify the contract descriptor was properly deserialized
          const enumDescriptor = instance.contractDescriptor as EnumeratedDescriptor;
          expect(enumDescriptor.outcomes.length).to.equal(3);
          expect(enumDescriptor.outcomes[0].outcome).to.equal('outcome1');
          expect(enumDescriptor.outcomes[1].outcome).to.equal('outcome2');
          expect(enumDescriptor.outcomes[2].outcome).to.equal('outcome3');
        }
      });
    });

    describe('validate', () => {
      let eventDescriptorNumDigits;
      let contractDescriptorNumDigits;
      let oracleInfo: SingleOracleInfo;
      let oracleAnnouncement: OracleAnnouncement;
      let hyperbolaPayoutCurvePiece: HyperbolaPayoutCurvePiece;
      let payoutFunction: PayoutFunction;

      beforeEach(() => {
        eventDescriptorNumDigits = 18;
        contractDescriptorNumDigits = 18;

        const eventDescriptor = new DigitDecompositionEventDescriptor();
        eventDescriptor.base = 2;
        eventDescriptor.isSigned = false;
        eventDescriptor.unit = 'BTCUSD';
        eventDescriptor.precision = 0;
        eventDescriptor.nbDigits = eventDescriptorNumDigits;

        const oracleEvent = new OracleEvent();
        oracleEvent.oracleNonces = [
          'c3347aa29db9f5e619483a92e746be91982bc66127e856bee62daeb91148cb92',
          'fbdffe731b410c1d735ad7ce868f40d5b4a44c29131b0feca0f9c28f3a5c2fee',
          '4326fc9c19013d4ca30f9f5dc184a6dab417acd4486528f14dbae2d2279bd29e',
          'dd88db0628df7e17ddcafe3a274518d0a4f6baa100308b5522ad099b27305b5b',
          '448774d5544b0151f112dd6f1cfc28df0e575e38bb8acb5c164357ebdb8bd364',
          '5b8dd47e80fe9c12741190a515ff7d8a801911ab64f8c6117303cf0f065ae055',
          '4b1f14efbba6e3bf7e5f4c40d5735ff126f23ac9a41659a05bebdd3596eb8d56',
          'd8d7524476c8f5e014a536cf513de7136fac9d3925d1f479c2f68b09ea3f43cd',
          '3719a5d31121084fd9f25f77bf042d2da23075102acf59e3e592e8a3a2220940',
          '64cf5b50bbc405c14078f82240aa38403fafcbee3c74c3e8ca361e60001cbc74',
          '149631c02f1f26ead45f9560ffe6cb1684c8c068d6eb1f03fdd655827b9f2531',
          '2669158073d4c5ebe4855e724b6650f8214697b17eeac1ef33a582d4efb73c90',
          '6abaac5f261322a5097115aaadaeca025e4eae0cdfb26fc591bc05820606929e',
          'b437c474dff5ed40fb7dcf298f5a1a70e95658135cb72008c3fbd515d86e59c3',
          'f85acb02775200421eda2c99c4a12975c9ac0d460ae7c9340e814745df4ebb54',
          '5a719fe0b7e44bab56448a4007f40a09f3adc57fcee18089d6334655c407a63a',
          '27540f4887299b36646b7c2202aef86bb0e7e68efc508583039f74c41cb57d66',
          'ed5b9a675d77506b71f597dc59e6777cbba054c82d3ba139e82d74ca717b0d0c',
        ].map((hex) => Buffer.from(hex, 'hex'));

        oracleEvent.eventMaturityEpoch = 1635321600;
        oracleEvent.eventDescriptor = eventDescriptor;
        oracleEvent.eventId = 'Deribit-BTC-27OCT21';

        oracleAnnouncement = new OracleAnnouncement();
        oracleAnnouncement.announcementSig = Buffer.from(
          'c3347aa29db9f5e619483a92e746be91982bc66127e856bee62daeb91148cb92a1074a802a481c008ba44143c752e519c28d906658e5257d9d82e80ef66cbf0f',
          'hex',
        );
        oracleAnnouncement.oraclePubkey = Buffer.from(
          '4f15b5e4b8000c33a8e5bbdbc6802375a7d6e7cefcfbf098aa51ce7da0f910c1',
          'hex',
        );
        oracleAnnouncement.oracleEvent = oracleEvent;

        oracleInfo = new SingleOracleInfo();
        oracleInfo.announcement = oracleAnnouncement;

        // Create PayoutFunction with new structure
        hyperbolaPayoutCurvePiece = new HyperbolaPayoutCurvePiece();
        hyperbolaPayoutCurvePiece.usePositivePiece = true;
        hyperbolaPayoutCurvePiece.translateOutcome = F64.fromNumber(0);
        hyperbolaPayoutCurvePiece.translatePayout = F64.fromNumber(30518);
        hyperbolaPayoutCurvePiece.a = F64.fromNumber(1);
        hyperbolaPayoutCurvePiece.b = F64.fromNumber(0);
        hyperbolaPayoutCurvePiece.c = F64.fromNumber(0);
        hyperbolaPayoutCurvePiece.d = F64.fromNumber(4000000000);

        payoutFunction = new PayoutFunction();
        payoutFunction.lastEndpoint = {
          eventOutcome: BigInt(0),
          outcomePayout: BigInt(969482),
          extraPrecision: 0,
        };
        payoutFunction.payoutFunctionPieces = [
          {
            endPoint: {
              eventOutcome: BigInt(131071),
              outcomePayout: BigInt(0),
              extraPrecision: 0,
            },
            payoutCurvePiece: hyperbolaPayoutCurvePiece,
          },
        ];
      });

      it('should throw Error if oracle nonces length different than nbDigits', () => {
        oracleInfo.announcement.oracleEvent.oracleNonces.pop();

        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(0),
            roundingMod: BigInt(500),
          },
        ];

        const contractDescriptor = new NumericalDescriptor();
        contractDescriptor.numDigits = contractDescriptorNumDigits;
        contractDescriptor.payoutFunction = payoutFunction;
        contractDescriptor.roundingIntervals = roundingIntervals;

        const contractInfo = new SingleContractInfo();
        contractInfo.totalCollateral = BigInt(969482);
        contractInfo.contractDescriptor = contractDescriptor;
        contractInfo.oracleInfo = oracleInfo;

        expect(function () {
          contractInfo.validate();
        }).to.throw('OracleEvent nonce count mismatch');
      });

      it('should validate successfully with correct oracle nonces count', () => {
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(0),
            roundingMod: BigInt(500),
          },
        ];

        const contractDescriptor = new NumericalDescriptor();
        contractDescriptor.numDigits = contractDescriptorNumDigits;
        contractDescriptor.payoutFunction = payoutFunction;
        contractDescriptor.roundingIntervals = roundingIntervals;

        const contractInfo = new SingleContractInfo();
        contractInfo.totalCollateral = BigInt(969482);
        contractInfo.contractDescriptor = contractDescriptor;
        contractInfo.oracleInfo = oracleInfo;

        // Should not throw an error when oracle nonces match nbDigits
        expect(function () {
          contractInfo.validate();
        }).to.not.throw();
      });

      it('should create and serialize PayoutFunction with HyperbolaPayoutCurvePiece', () => {
        // Test that we can create and serialize the payout function structure
        expect(payoutFunction.payoutFunctionPieces.length).to.equal(1);
        expect(
          payoutFunction.payoutFunctionPieces[0].payoutCurvePiece,
        ).to.be.instanceof(HyperbolaPayoutCurvePiece);

        const serialized = payoutFunction.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);

        // Test round-trip serialization
        const deserialized = PayoutFunction.deserialize(serialized);
        expect(deserialized.payoutFunctionPieces.length).to.equal(1);
        expect(
          deserialized.payoutFunctionPieces[0].payoutCurvePiece,
        ).to.be.instanceof(HyperbolaPayoutCurvePiece);
        expect(deserialized.lastEndpoint.eventOutcome).to.equal(BigInt(0));
        expect(deserialized.lastEndpoint.outcomePayout).to.equal(
          BigInt(969482),
        );
      });
    });
  });
});
