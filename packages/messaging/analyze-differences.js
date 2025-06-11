const fs = require('fs');
const path = require('path');

// Load our classes from the compiled JS
const { DlcOffer } = require('./dist');

// Test files to analyze
const testFiles = [
  'enum_single_oracle_test.json',
  'enum_3_of_3_test.json', 
  'numerical_with_single_oracle_test.json'
];

console.log('🔍 Multi-File Hex Difference Analysis');
console.log('');

testFiles.forEach(filename => {
  try {
    console.log(`📄 ${filename}:`);
    
    const testData = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_vectors/dlcspecs', filename), 'utf8'));
    const offerMessage = testData.offer_message.message;
    const expectedHex = testData.offer_message.serialized;

    // Parse and serialize
    const offer = DlcOffer.fromJSON(offerMessage);
    const actualHex = offer.serialize().toString('hex');
    
    // Find first difference
    let firstDiff = -1;
    const minLength = Math.min(expectedHex.length, actualHex.length);
    for (let i = 0; i < minLength; i++) {
      if (expectedHex[i] !== actualHex[i]) {
        firstDiff = i;
        break;
      }
    }
    
    const byteDiff = Math.floor(firstDiff / 2);
    const lengthDiff = (actualHex.length - expectedHex.length) / 2;
    
    console.log(`  Expected length: ${expectedHex.length} chars (${expectedHex.length/2} bytes)`);
    console.log(`  Actual length:   ${actualHex.length} chars (${actualHex.length/2} bytes)`);
    console.log(`  Length diff:     ${lengthDiff} bytes`);
    
    if (firstDiff >= 0) {
      console.log(`  First diff at:   position ${firstDiff} (byte ${byteDiff})`);
      
      // Show context around difference
      const start = Math.max(0, firstDiff - 20);
      const end = Math.min(expectedHex.length, firstDiff + 40);
      console.log(`  Expected: ...${expectedHex.substring(start, end)}...`);
      console.log(`  Actual:   ...${actualHex.substring(start, Math.min(actualHex.length, end))}...`);
    }
    
    console.log('');
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    console.log('');
  }
});

console.log('🔄 Pattern Analysis:');
console.log('Looking for common patterns in the differences...'); 