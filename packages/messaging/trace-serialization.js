const fs = require('fs');
const {DlcOffer} = require('./dist');

console.log('=== DLCOFFER SERIALIZATION TRACE ===');
console.log('Target: Find what field is at byte position 348');
console.log('');

// Load test data and parse
const testData = JSON.parse(fs.readFileSync('./test_vectors/dlcspecs/enum_single_oracle_test.json', 'utf8'));
const offer = DlcOffer.fromJSON(testData.offer_message.message);

let currentPos = 0;

function logField(name, bytes) {
  const startPos = currentPos;
  const endPos = currentPos + bytes - 1;
  console.log(`${name} (${bytes} bytes): ${startPos} - ${endPos}`);
  currentPos += bytes;
  
  if (startPos <= 348 && endPos >= 348) {
    console.log(`*** BYTE 348 IS IN: ${name} ***`);
    console.log(`Offset within field: ${348 - startPos}`);
    return true;
  }
  return false;
}

// Message type
logField('Message type', 2);

// Protocol version 
logField('Protocol version', 4);

// Contract flags
logField('Contract flags', 1);

// Chain hash
logField('Chain hash', 32);

// Temporary contract ID
logField('Temporary contract ID', 32);

// Contract info
const contractInfoBytes = offer.contractInfo.serialize();
if (logField('Contract info', contractInfoBytes.length)) {
  console.log('*** CONTRACT INFO CONTAINS BYTE 348 ***');
}

// Funding pubkey
logField('Funding pubkey', 33);

// Payout SPK
const payoutSpkBytes = offer.payoutSpk.serialize();
logField('Payout SPK', payoutSpkBytes.length);

// Payout serial ID
logField('Payout serial ID', 8);

// Offer collateral
logField('Offer collateral', 8);

// Funding inputs count
const fundingInputsCount = offer.fundingInputs.length;
const countBytes = fundingInputsCount < 0xfd ? 1 : 3;
logField('Funding inputs count', countBytes);

// Funding inputs
for (let i = 0; i < offer.fundingInputs.length; i++) {
  const fundingInput = offer.fundingInputs[i];
  const fiBytes = fundingInput.serializeBody();
  
  if (logField(`Funding Input ${i}`, fiBytes.length)) {
    console.log('*** FUNDING INPUT', i, 'CONTAINS BYTE 348 ***');
    const offset = 348 - (currentPos - fiBytes.length);
    
    console.log('Analyzing funding input fields:');
    let fiPos = 0;
    
    // Input serial ID
    console.log(`  Input serial ID: ${fiPos}-${fiPos+7}`);
    if (offset >= fiPos && offset <= fiPos+7) console.log('  *** BYTE 348 IS IN INPUT SERIAL ID ***');
    fiPos += 8;
    
    // Prev tx length
    const prevTxLen = fundingInput.prevTx.serialize().length;
    console.log(`  Prev tx length: ${fiPos} (value: ${prevTxLen})`);
    if (offset === fiPos) console.log('  *** BYTE 348 IS PREV TX LENGTH FIELD ***');
    fiPos += 1; // BigSize for 168 bytes is 1 byte
    
    // Prev tx data
    console.log(`  Prev tx data: ${fiPos}-${fiPos+prevTxLen-1}`);
    if (offset >= fiPos && offset <= fiPos+prevTxLen-1) console.log('  *** BYTE 348 IS IN PREV TX DATA ***');
    fiPos += prevTxLen;
    
    // Continue with other fields...
    console.log(`  Remaining offset to analyze: ${offset}, current fiPos: ${fiPos}`);
    break;
  }
} 