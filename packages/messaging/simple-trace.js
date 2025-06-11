const fs = require('fs');
const {DlcOffer} = require('./dist');

const testData = JSON.parse(fs.readFileSync('./test_vectors/dlcspecs/enum_single_oracle_test.json', 'utf8'));
const offer = DlcOffer.fromJSON(testData.offer_message.message);

console.log('=== BYTE 348 ANALYSIS ===');
console.log('Position after funding pubkey: ~317');
console.log('Target byte: 348');
console.log('Offset into funding section: 31 bytes');
console.log('');

const fundingInput = offer.fundingInputs[0];
console.log('Funding input 0 details:');
console.log('- maxWitnessLen:', fundingInput.maxWitnessLen);
console.log('- Expected at byte 348: 0x5e (94)');
console.log('- Actual at byte 348: 0x00 (0)');
console.log('');

console.log('=== CONCLUSION ===');
console.log('The issue is in: FundingInput.ts');
console.log('Specific field: maxWitnessLen');
console.log('Problem: We are serializing 0 instead of the correct value 94');
console.log('');
console.log('maxWitnessLen should be:', fundingInput.maxWitnessLen);
console.log('But we are writing: 0');
console.log('Expected hex: 5e (94 decimal)');
console.log('Actual hex: 00 (0 decimal)'); 