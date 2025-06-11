const fs = require('fs');
const path = require('path');

// Load our classes from the compiled JS
const { DlcOffer } = require('./dist');

// Helper function to decode bigsize
function decodeBigSize(hex, offset = 0) {
  const firstByte = parseInt(hex.substr(offset, 2), 16);
  if (firstByte < 0xfd) {
    return { value: firstByte, length: 1, nextOffset: offset + 2 };
  } else if (firstByte === 0xfd) {
    // 2-byte value (big endian)
    const value = parseInt(hex.substr(offset + 2, 2) + hex.substr(offset + 4, 2), 16);
    return { value, length: 3, nextOffset: offset + 6 };
  } else if (firstByte === 0xfe) {
    // 4-byte value (big endian)
    const value = parseInt(hex.substr(offset + 2, 2) + hex.substr(offset + 4, 2) + hex.substr(offset + 6, 2) + hex.substr(offset + 8, 2), 16);
    return { value, length: 5, nextOffset: offset + 10 };
  } else {
    // 8-byte value (big endian) - not implemented for now
    return { value: 'TOO_LARGE', length: 9, nextOffset: offset + 18 };
  }
}

// Get test vector filename from command line argument
const testVectorFile = process.argv[2] || 'enum_single_oracle_test.json';

// Load a test vector
const testData = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_vectors/dlcspecs', testVectorFile), 'utf8'));
const offerMessage = testData.offer_message.message;
const expectedHex = testData.offer_message.serialized;

console.log(`🔍 Detailed Hex Analysis for ${testVectorFile}`);
console.log('');

try {
  // Parse using our fromJSON
  const offer = DlcOffer.fromJSON(offerMessage);
  console.log('✅ DlcOffer.fromJSON succeeded');
  
  // Serialize using our methods
  const actualHex = offer.serialize().toString('hex');
  console.log('✅ DlcOffer.serialize succeeded');
  
  console.log('');
  console.log('📏 Length Comparison:');
  console.log('Expected length:', expectedHex.length);
  console.log('Actual length:  ', actualHex.length);
  console.log('Extra bytes:    ', (actualHex.length - expectedHex.length) / 2);
  console.log('');
  
  // Find where they diverge
  let firstDiff = -1;
  const minLength = Math.min(expectedHex.length, actualHex.length);
  for (let i = 0; i < minLength; i++) {
    if (expectedHex[i] !== actualHex[i]) {
      firstDiff = i;
      break;
    }
  }
  
  if (firstDiff >= 0) {
    console.log('🚨 First difference at position:', firstDiff, '(byte', Math.floor(firstDiff/2) + ')');
    console.log('');
    
    // Show larger context for better understanding
    console.log('📍 Extended Context (±50 chars):');
    const start = Math.max(0, firstDiff - 50);
    const end = Math.min(expectedHex.length, firstDiff + 100);
    
    console.log('Expected:', expectedHex.substring(start, end));
    console.log('Actual:  ', actualHex.substring(start, Math.min(actualHex.length, end)));
    console.log('Diff at: ', ' '.repeat(firstDiff - start) + '↑');
    console.log('');
    
    // Analyze the structure around the difference
    console.log('🔬 Structure Analysis:');
    const contextSize = 20;
    const diffStart = Math.max(0, firstDiff - contextSize);
    const diffEnd = Math.min(expectedHex.length, firstDiff + contextSize * 2);
    
    console.log('Expected hex at diff:');
    for (let i = diffStart; i < diffEnd; i += 32) {
      const chunk = expectedHex.substring(i, Math.min(i + 32, diffEnd));
      const pos = i.toString(16).padStart(4, '0');
      console.log(`  ${pos}: ${chunk}`);
    }
    
    console.log('');
    console.log('Actual hex at diff:');
    for (let i = diffStart; i < Math.min(actualHex.length, diffEnd); i += 32) {
      const chunk = actualHex.substring(i, Math.min(i + 32, Math.min(actualHex.length, diffEnd)));
      const pos = i.toString(16).padStart(4, '0');
      console.log(`  ${pos}: ${chunk}`);
    }
    
    // Try to identify what component we're in based on position
    console.log('');
    console.log('💡 Component Analysis:');
    const bytePos = Math.floor(firstDiff / 2);
    if (bytePos < 100) {
      console.log('Position suggests: DLC message header or early fields');
    } else if (bytePos < 300) {
      console.log('Position suggests: Contract info or oracle info section');
    } else if (bytePos < 600) {
      console.log('Position suggests: Funding inputs or payout info section');
    } else {
      console.log('Position suggests: Later fields (funding inputs, change, fee, locktime)');
    }
    
    // Show funding inputs structure from JSON for comparison
    console.log('');
    console.log('📋 Funding Inputs from JSON:');
    console.log(JSON.stringify(offerMessage.fundingInputs, null, 2));
  }
  
} catch (error) {
  console.log('❌ Error in hex analysis:');
  console.log('Error message:', error.message);
  console.log('Stack trace:', error.stack);
} 