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
import enum3of3 from './TestVectors/enum_3_of_3_test.json';
import enum3of5 from './TestVectors/enum_3_of_5_test.json';
import enumAndNumerical3of5 from './TestVectors/enum_and_numerical_3_of_5_test.json';
import enumAndNumerical5of5 from './TestVectors/enum_and_numerical_5_of_5_test.json';
import enumAndNumericalWithDiff3of5 from './TestVectors/enum_and_numerical_with_diff_3_of_5_test.json';
import enumAndNumericalWithDiff5of5 from './TestVectors/enum_and_numerical_with_diff_5_of_5_test.json';
import enumSingleOracle from './TestVectors/enum_single_oracle_test.json';
import singleOracleNumericalHyperbola from './TestVectors/single_oracle_numerical_hyperbola_test.json';
import singleOracleNumerical from './TestVectors/single_oracle_numerical_test.json';
import threeOfFiveOracleNumericalWithDiff from './TestVectors/three_of_five_oracle_numerical_with_diff_test.json';
import threeOfThreeOracleNumerical from './TestVectors/three_of_three_oracle_numerical_test.json';
import threeOfThreeOracleNumericalWithDiff from './TestVectors/three_of_three_oracle_numerical_with_diff_test.json';
import twoOfFiveOracleNumerical from './TestVectors/two_of_five_oracle_numerical_test.json';
import twoOfFiveOracleNumericalWithDiff from './TestVectors/two_of_five_oracle_numerical_with_diff_test.json';

const testVectors = {
  enum3of3,
  enum3of5,
  enumAndNumerical3of5,
  enumAndNumerical5of5,
  enumAndNumericalWithDiff3of5,
  enumAndNumericalWithDiff5of5,
  enumSingleOracle,
  singleOracleNumericalHyperbola,
  singleOracleNumerical,
  threeOfFiveOracleNumericalWithDiff,
  threeOfThreeOracleNumerical,
  threeOfThreeOracleNumericalWithDiff,
  twoOfFiveOracleNumerical,
  twoOfFiveOracleNumericalWithDiff,
};

describe.only('DlcOffer', () => {
  for (const [testName, testVector] of Object.entries(testVectors)) {
    it(`should deserialize ${camelToUnderscore(testName)}`, () => {
      const dlcOffer = DlcOfferV0.deserialize(
        Buffer.from(testVector.offer_message.serialized, 'hex'),
      );
      console.log('dlcOffer', dlcOffer);
      console.log('dlcOffer.serialized', dlcOffer.serialize().toString('hex'));
      console.log('dlcOffer.JSON', JSON.stringify(dlcOffer.toJSON()));
      const serializedDlcOffer = dlcOffer.serialize();
      expect(serializedDlcOffer.toString('hex')).to.equal(
        testVector.offer_message.serialized,
      );
      expect(JSON.stringify(dlcOffer.toJSON())).to.equal(
        JSON.stringify(testVector.offer_message),
      );
    });
  }
});

function camelToUnderscore(key) {
  const result = key.replace(/([A-Z0-9])/g, ' $1').replace(/(of)/g, ' $1');
  return result.split(' ').join('_').toLowerCase();
}
