const fs = require('fs');
const {DlcOffer} = require('./dist');

const testData = JSON.parse(fs.readFileSync('./test_vectors/dlcspecs/enum_single_oracle_test.json', 'utf8'));
const offer = DlcOffer.fromJSON(testData.offer_message.message);

console.log('BYTE 348 ANALYSIS');
console.log('================');
console.log('Difference found: Expected 5e, Actual 00');
console.log('Position: Byte 348 in DlcOffer serialization');
console.log('');

const fundingInput = offer.fundingInputs[0];
console.log('Funding Input 0:');
console.log('- maxWitnessLen:', fundingInput.maxWitnessLen);
console.log('- Expected: 0x5e =', parseInt('5e', 16));
console.log('');

if (fundingInput.maxWitnessLen === 107) {
  console.log('*** FOUND THE ISSUE ***');
  console.log('maxWitnessLen should be 107 but we are writing 0');
  console.log('107 decimal = 0x6b, but expected is 0x5e = 94');
  console.log('');
  console.log('FILE: node-dlc/packages/messaging/lib/messages/FundingInput.ts');
  console.log('FIELD: maxWitnessLen serialization');
  console.log('ISSUE: Incorrect value being written to this field');
} else {
  console.log('Value mismatch - need to investigate further');
} 