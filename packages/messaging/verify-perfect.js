const fs = require('fs');
const path = require('path');

// Load our classes
const { DlcOffer } = require('./dist');

console.log('🔍 Verifying "Perfect" Tests');
console.log('');

const perfectTests = ['enum_3_of_3_test.json', 'enum_3_of_5_test.json'];

perfectTests.forEach(filename => {
  console.log(`📄 ${filename}:`);
  
  const testData = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_vectors/dlcspecs', filename), 'utf8'));
  const offerMessage = testData.offer_message.message;
  const expectedHex = testData.offer_message.serialized;

  // Parse and serialize
  const offer = DlcOffer.fromJSON(offerMessage);
  const actualHex = offer.serialize().toString('hex');
  
  console.log('Expected length:', expectedHex.length);
  console.log('Actual length:  ', actualHex.length);
  console.log('Exact match:    ', expectedHex === actualHex);
  
  if (expectedHex !== actualHex) {
    // Find first difference
    let firstDiff = -1;
    const minLength = Math.min(expectedHex.length, actualHex.length);
    for (let i = 0; i < minLength; i++) {
      if (expectedHex[i] !== actualHex[i]) {
        firstDiff = i;
        break;
      }
    }
    
    if (firstDiff >= 0) {
      console.log('First diff at:   position', firstDiff);
      const start = Math.max(0, firstDiff - 10);
      const end = Math.min(expectedHex.length, firstDiff + 20);
      console.log('Expected context:', expectedHex.substring(start, end));
      console.log('Actual context:  ', actualHex.substring(start, Math.min(actualHex.length, end)));
    }
  } else {
    console.log('🎉 PERFECT MATCH! Serialization is 100% correct!');
  }
  
  console.log('');
}); 