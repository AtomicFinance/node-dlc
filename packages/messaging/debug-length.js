const fs = require('fs');
const {DlcOffer} = require('./dist');

const testData = JSON.parse(fs.readFileSync('./test_vectors/dlcspecs/enum_single_oracle_test.json', 'utf8'));

// Parse and serialize our version
const offer = DlcOffer.fromJSON(testData.offer_message.message);
const actualHex = offer.serialize().toString('hex');
const expectedHex = testData.offer_message.serialized;

console.log('=== LENGTH ANALYSIS ===');
console.log('Expected length:', expectedHex.length / 2, 'bytes');
console.log('Actual length:', actualHex.length / 2, 'bytes');
console.log('Difference:', (actualHex.length - expectedHex.length) / 2, 'bytes');

console.log('');
console.log('=== HEX DIFFERENCE AROUND BYTE 348 ===');
const pos = 696; // byte 348 * 2
console.log('Expected around diff:', expectedHex.substring(pos-20, pos+20));
console.log('Actual around diff:  ', actualHex.substring(pos-20, pos+20));
console.log('');

// Let's look at the funding input serialization specifically
console.log('=== FUNDING INPUT ANALYSIS ===');
const fundingInput = offer.fundingInputs[0];
const fiBody = fundingInput.serializeBody();
console.log('FI body length:', fiBody.length, 'bytes');
console.log('FI body hex (first 40 chars):', fiBody.toString('hex').substring(0, 40));

console.log('');
console.log('=== DETAILED BREAKDOWN ===');
console.log('FI inputSerialId:', fundingInput.inputSerialId.toString(16));
console.log('FI prevTx length:', fundingInput.prevTx.serialize().length, 'bytes');
console.log('FI redeemScript length:', fundingInput.redeemScript.length, 'bytes');
console.log('FI maxWitnessLen:', fundingInput.maxWitnessLen);
console.log('FI sequence:', fundingInput.sequence.value.toString(16)); 