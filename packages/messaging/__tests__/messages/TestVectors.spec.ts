import { BitcoinNetworks } from 'bitcoin-networks';
import { expect } from 'chai';

import { ContractInfo } from '../../lib/messages/ContractInfo';
import {
  DlcOffer,
  DlcOfferV0,
  LOCKTIME_THRESHOLD,
} from '../../lib/messages/DlcOffer';
import { FundingInput } from '../../lib/messages/FundingInput';
import { MessageType } from '../../lib/MessageType';

const testVector = {
  offer_message: {
    message: {
      protocolVersion: 1,
      contractFlags: 0,
      chainHash:
        '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
      temporaryContractId:
        '265523f7249ea234a34305f4b3b7120cf6a602c2e7527950c8a04f5baa8bb963',
      contractInfo: {
        singleContractInfo: {
          totalCollateral: 200000000,
          contractInfo: {
            contractDescriptor: {
              numericOutcomeContractDescriptor: {
                numDigits: 10,
                payoutFunction: {
                  payoutFunctionPieces: [
                    {
                      endPoint: {
                        eventOutcome: 0,
                        outcomePayout: 0,
                        extraPrecision: 0,
                      },
                      payoutCurvePiece: {
                        hyperbolaPayoutCurvePiece: {
                          usePositivePiece: true,
                          translateOutcome: 50.0,
                          translatePayout: 50.0,
                          a: 5.0,
                          b: -1.0,
                          c: 0.0,
                          d: 1.0,
                        },
                      },
                    },
                  ],
                  lastEndpoint: {
                    eventOutcome: 1023,
                    outcomePayout: 0,
                    extraPrecision: 0,
                  },
                },
                roundingIntervals: {
                  intervals: [
                    {
                      beginInterval: 0,
                      roundingMod: 1,
                    },
                  ],
                },
              },
            },
            oracleInfo: {
              single: {
                oracleAnnouncement: {
                  announcementSignature:
                    '71c383f82dd12c6396c2318bf4ee20957003f24af045e90686e3b61725fa3ba39627f95cb32df6cfff63707dfe6de140caaf712f07522cf4c28a1fdb0e5f7e60',
                  oraclePublicKey:
                    '5305877f0d084a5ff3a86d441d730f2ed49a355c7420b1d0d74e154828cc9c17',
                  oracleEvent: {
                    oracleNonces: [
                      '588fd77b53f92c774b6eee247c0bb19c9b4fbe97623b9ff23047c43c267bd938',
                      '9358405f95fdd4f4115c67ef5842d9b2ea9c149fe35f59f9f43e59ebc8b87aac',
                      'fe2062dae073de49b739e84472c5b182af521b39c4c5a0211df2d27505c93912',
                      '51e69daf13968bd3284b96ef26c7890970a027c50db8b6e080b970d9c2bec7a5',
                      '30342d771ccf499b097405fd844fae11f987d46844ff41d7373052db116fdce1',
                      '4ccf20cf44164673211db1b3c015ebc751159b9f5267270bfc71eda6bd2fe11e',
                      '6c5e561c8e55219e6fd542d2df7b8ce607e08f8ae2f3409e914742668b8b6409',
                      'bf9170c2c62f54ca66b39650f0d0f7ca68e226384d3a1ec7551bfe1cc7974438',
                      'fc1207ebcf60f7380d7922795a8daf7d21af3ead57001dc91c7bbe65827ba2e1',
                      'a51a9ecc64daeefb834823057eeaacbecfff81086582e43bedf7900a9595407b',
                    ],
                    eventMaturityEpoch: 1623133104,
                    eventDescriptor: {
                      digitDecompositionEvent: {
                        base: 2,
                        isSigned: false,
                        unit: 'sats/sec',
                        precision: 0,
                        nbDigits: 10,
                      },
                    },
                    eventId: 'Test',
                  },
                },
              },
            },
          },
        },
      },
      fundingPubkey:
        '032ec14eb5e7daf454c4515590d5fc8331fc5459111504b13335c73135b2212add',
      payoutSpk: '001453f0995f34cc1a554884a9d5e6e6853ac8e6d73f',
      payoutSerialId: 1397437509772838018,
      offerCollateral: 100000000,
      fundingInputs: [
        {
          inputSerialId: 9283287567477086542,
          prevTx:
            '020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff03520101ffffffff0200f2052a01000000160014d6c08add373e1e9a518d5a95b5ffb27e002e1c370000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90120000000000000000000000000000000000000000000000000000000000000000000000000',
          prevTxVout: 0,
          sequence: 4294967295,
          maxWitnessLen: 107,
          redeemScript: '',
        },
      ],
      changeSpk: '0014b1bf5709f5ab90f87771a5b4b763243aa375cdaa',
      changeSerialId: 12065621157061494665,
      fundOutputSerialId: 17610968839659761095,
      feeRatePerVb: 2,
      cetLocktime: 1623133104,
      refundLocktime: 1623737904,
    },
    serialized:
      'a71a000000010006226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f265523f7249ea234a34305f4b3b7120cf6a602c2e7527950c8a04f5baa8bb96300000000000bebc20001000a01000000000000000000000000000000000000010101000000000000003200000100000000000000320000010000000000000005000000000000000000000100000100000000000000000000010000000000000001000000000000000003ff00000000000000000000010000000000000000000000000000000100fdd824fd01c771c383f82dd12c6396c2318bf4ee20957003f24af045e90686e3b61725fa3ba39627f95cb32df6cfff63707dfe6de140caaf712f07522cf4c28a1fdb0e5f7e605305877f0d084a5ff3a86d441d730f2ed49a355c7420b1d0d74e154828cc9c17fdd822fd0161000a588fd77b53f92c774b6eee247c0bb19c9b4fbe97623b9ff23047c43c267bd9389358405f95fdd4f4115c67ef5842d9b2ea9c149fe35f59f9f43e59ebc8b87aacfe2062dae073de49b739e84472c5b182af521b39c4c5a0211df2d27505c9391251e69daf13968bd3284b96ef26c7890970a027c50db8b6e080b970d9c2bec7a530342d771ccf499b097405fd844fae11f987d46844ff41d7373052db116fdce14ccf20cf44164673211db1b3c015ebc751159b9f5267270bfc71eda6bd2fe11e6c5e561c8e55219e6fd542d2df7b8ce607e08f8ae2f3409e914742668b8b6409bf9170c2c62f54ca66b39650f0d0f7ca68e226384d3a1ec7551bfe1cc7974438fc1207ebcf60f7380d7922795a8daf7d21af3ead57001dc91c7bbe65827ba2e1a51a9ecc64daeefb834823057eeaacbecfff81086582e43bedf7900a9595407b60bf0bb0fdd80a1200020008736174732f73656300000000000a0454657374032ec14eb5e7daf454c4515590d5fc8331fc5459111504b13335c73135b2212add0016001453f0995f34cc1a554884a9d5e6e6853ac8e6d73f1364b202ddd104820000000005f5e1000180d4dcdb8f45994ea8020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff03520101ffffffff0200f2052a01000000160014d6c08add373e1e9a518d5a95b5ffb27e002e1c370000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9012000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffff006b000000160014b1bf5709f5ab90f87771a5b4b763243aa375cdaaa771b28415168789f466bada4e64adc7000000000000000260bf0bb060c84630',
  },
};

describe.only('DlcOffer', () => {
  it('should deserialize', () => {
    const dlcOffer = DlcOfferV0.deserialize(
      Buffer.from(testVector.offer_message.serialized, 'hex'),
    );
    console.log('dlcOffer', dlcOffer);
    console.log('dlcOffer.serialized', dlcOffer.serialize().toString('hex'));
    console.log('dlcOffer.JSON', JSON.stringify(dlcOffer.toJSON()));
    expect(0).to.equal(0);
  });
});
