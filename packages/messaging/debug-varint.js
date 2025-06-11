const fs = require('fs');
const { DlcOffer } = require('./dist');

// Test VarInt encoding directly
function testVarIntEncoding() {
  console.log('🔍 Testing VarInt encoding for common script lengths:\n');

  const testLengths = [0, 1, 94, 252, 253, 254, 255, 256, 65535];
  
  testLengths.forEach(length => {
    console.log(`Length ${length}:`);
    
    // Expected encoding based on Bitcoin VarInt rules
    let expectedBytes;
    if (length < 0xfd) {
      expectedBytes = [length];
    } else if (length <= 0xffff) {
      expectedBytes = [0xfd, length & 0xff, (length >> 8) & 0xff];
    } else if (length <= 0xffffffff) {
      expectedBytes = [0xfe, 
        length & 0xff, 
        (length >> 8) & 0xff, 
        (length >> 16) & 0xff, 
        (length >> 24) & 0xff
      ];
    }
    
    const expectedHex = expectedBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`  Expected: ${expectedHex} (${expectedBytes.length} bytes)`);
    
    // u16 big-endian (old method)
    const u16Hex = length.toString(16).padStart(4, '0');
    console.log(`  u16 BE:   ${u16Hex} (2 bytes)`);
    
    console.log('');
  });
}

// Test redeem script from enum_single_oracle_test.json
function testRedeemScriptFromTestVector() {
  console.log('🔍 Testing redeem script from enum_single_oracle_test.json:\n');
  
  const testVectorPath = './test_vectors/dlcspecs/enum_single_oracle_test.json';
  if (!fs.existsSync(testVectorPath)) {
    console.log('❌ Test vector file not found');
    return;
  }
  
  const testVector = JSON.parse(fs.readFileSync(testVectorPath, 'utf-8'));
  const fundingInputs = testVector.fundingInputs || testVector.funding_inputs || [];
  
  if (fundingInputs.length === 0) {
    console.log('❌ No funding inputs found in test vector');
    return;
  }
  
  fundingInputs.forEach((input, i) => {
    const redeemScript = input.redeemScript || input.redeem_script || '';
    const redeemScriptBuffer = Buffer.from(redeemScript, 'hex');
    const length = redeemScriptBuffer.length;
    
    console.log(`Funding Input ${i}:`);
    console.log(`  Redeem script hex: ${redeemScript}`);
    console.log(`  Length: ${length} bytes`);
    
    // VarInt encoding for this length
    if (length < 0xfd) {
      console.log(`  VarInt: ${length.toString(16).padStart(2, '0')} (1 byte)`);
    } else if (length <= 0xffff) {
      const varInt = [0xfd, length & 0xff, (length >> 8) & 0xff];
      const varIntHex = varInt.map(b => b.toString(16).padStart(2, '0')).join('');
      console.log(`  VarInt: ${varIntHex} (3 bytes)`);
    }
    
    // u16 big-endian (old method)
    console.log(`  u16 BE: ${length.toString(16).padStart(4, '0')} (2 bytes)`);
    console.log('');
  });
}

// Test actual serialization
function testActualSerialization() {
  console.log('🔍 Testing actual DlcOffer serialization:\n');
  
  const testVectorPath = './test_vectors/dlcspecs/enum_single_oracle_test.json';
  if (!fs.existsSync(testVectorPath)) {
    console.log('❌ Test vector file not found');
    return;
  }
  
  try {
    const testVector = JSON.parse(fs.readFileSync(testVectorPath, 'utf-8'));
    const offer = DlcOffer.fromJSON(testVector);
    const serialized = offer.serialize().toString('hex');
    
    console.log(`Serialized length: ${serialized.length / 2} bytes`);
    console.log(`Expected length: ${testVector.hex ? testVector.hex.length / 2 : 'N/A'} bytes`);
    
    // Look for redeem script patterns in serialized data
    const fundingInputs = testVector.fundingInputs || testVector.funding_inputs || [];
    if (fundingInputs.length > 0) {
      const redeemScript = fundingInputs[0].redeemScript || fundingInputs[0].redeem_script;
      if (redeemScript) {
        const scriptIndex = serialized.indexOf(redeemScript.toLowerCase());
        if (scriptIndex !== -1) {
          const beforeScript = serialized.substring(Math.max(0, scriptIndex - 10), scriptIndex);
          console.log(`\nRedeem script found at position ${scriptIndex / 2}`);
          console.log(`Bytes before script: ${beforeScript}`);
          console.log(`Script: ${redeemScript.toLowerCase()}`);
        } else {
          console.log(`\n❌ Redeem script not found in serialized data`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

function main() {
  testVarIntEncoding();
  testRedeemScriptFromTestVector();
  testActualSerialization();
}

if (require.main === module) {
  main();
} 