const fs = require('fs');
const { DlcOffer } = require('./dist');

// Helper function to decode bigsize
function decodeBigSize(hex, offset = 0) {
  const firstByte = parseInt(hex.substr(offset, 2), 16);
  if (firstByte < 0xfd) {
    return { value: firstByte, length: 1, nextOffset: offset + 2 };
  } else if (firstByte === 0xfd) {
    const value = parseInt(hex.substr(offset + 2, 4), 16);
    return { value, length: 3, nextOffset: offset + 6 };
  } else if (firstByte === 0xfe) {
    const value = parseInt(hex.substr(offset + 2, 8), 16);
    return { value, length: 5, nextOffset: offset + 10 };
  } else {
    const value = parseInt(hex.substr(offset + 2, 16), 16);
    return { value, length: 9, nextOffset: offset + 18 };
  }
}

// Compare rust-dlc and node-dlc serialization patterns
function analyzeSerializationDifferences() {
  console.log('\n=== RUST-DLC vs NODE-DLC SERIALIZATION ANALYSIS ===\n');

  console.log('🔍 Key differences identified:');
  console.log('');

  console.log('1. FundingInput.prev_tx length encoding:');
  console.log('   - rust-dlc: (prev_tx, vec) → uses BigSize for length');
  console.log('   - node-dlc: writeUInt16BE(this.prevTx.serialize().length) → uses u16 for length');
  console.log('   ⚠️  MISMATCH: This could cause 1-3 byte difference depending on tx size');
  console.log('');

  console.log('2. FundingInput.redeem_script length encoding:');
  console.log('   - rust-dlc: (redeem_script, writeable) → ScriptBuf uses compact size');
  console.log('   - node-dlc: writeUInt16BE(this.redeemScript.length) → uses u16 for length');
  console.log('   ⚠️  MISMATCH: ScriptBuf likely uses VarInt/CompactSize, not u16');
  console.log('');

  console.log('3. BigSize encoding differences:');
  console.log('   - rust-dlc: Consistent BigSize usage for all vector lengths');
  console.log('   - node-dlc: Mixed usage of BigSize and u16');
  console.log('');

  console.log('4. Vector serialization patterns:');
  console.log('   - rust-dlc impl_dlc_writeable!(FundingInput, {');
  console.log('       (input_serial_id, writeable),     // u64');
  console.log('       (prev_tx, vec),                   // BigSize length + data');
  console.log('       (prev_tx_vout, writeable),        // u32');
  console.log('       (sequence, writeable),            // u32');
  console.log('       (max_witness_len, writeable),     // u16');
  console.log('       (redeem_script, writeable)        // ScriptBuf (compact size)');
  console.log('     });');
  console.log('');
  console.log('   - node-dlc serializeBody():');
  console.log('       writer.writeUInt64BE(this.inputSerialId);');
  console.log('       writer.writeUInt16BE(this.prevTx.serialize().length);  // ❌ Should be BigSize');
  console.log('       writer.writeBytes(this.prevTx.serialize());');
  console.log('       writer.writeUInt32BE(this.prevTxVout);');
  console.log('       writer.writeUInt32BE(this.sequence.value);');
  console.log('       writer.writeUInt16BE(this.maxWitnessLen);');
  console.log('       writer.writeUInt16BE(this.redeemScript.length);        // ❌ Should be compact size');
  console.log('       writer.writeBytes(this.redeemScript);');
  console.log('');

  console.log('🎯 RECOMMENDED FIXES:');
  console.log('');
  console.log('1. Fix FundingInput.serializeBody() to match rust-dlc:');
  console.log('   - Change writeUInt16BE(prevTx.length) → writeBigSize(prevTx.length)');
  console.log('   - Change writeUInt16BE(redeemScript.length) → write script with compact size');
  console.log('');

  console.log('2. Test with a minimal funding input to isolate the difference');
  console.log('');

  return {
    prevTxLengthMismatch: true,
    redeemScriptLengthMismatch: true,
    bigSizeMismatch: true
  };
}

// Test specific encoding differences
function testEncodingDifferences() {
  console.log('\n=== ENCODING TESTS ===\n');

  // Test BigSize vs u16 for small values
  console.log('BigSize vs u16 encoding for common values:');
  
  const testValues = [0, 1, 252, 253, 254, 255, 256, 65535, 65536];
  
  testValues.forEach(value => {
    // BigSize encoding
    let bigSizeBytes;
    if (value < 253) {
      bigSizeBytes = 1;
    } else if (value < 65536) {
      bigSizeBytes = 3; // 0xFD + 2 bytes
    } else if (value < 4294967296) {
      bigSizeBytes = 5; // 0xFE + 4 bytes
    } else {
      bigSizeBytes = 9; // 0xFF + 8 bytes
    }

    // u16 encoding is always 2 bytes
    const u16Bytes = 2;

    const difference = bigSizeBytes - u16Bytes;
    if (difference !== 0) {
      console.log(`  Value ${value}: BigSize=${bigSizeBytes} bytes, u16=${u16Bytes} bytes, diff=${difference}`);
    }
  });

  console.log('');
  console.log('For typical transaction sizes (200-1000 bytes):');
  console.log('  - BigSize: 3 bytes (0xFD + 2 bytes)');
  console.log('  - u16: 2 bytes');
  console.log('  - Difference: +1 byte for BigSize');
  console.log('');
  console.log('👆 This explains the 1-byte difference!');
}

// Main analysis
function main() {
  const differences = analyzeSerializationDifferences();
  testEncodingDifferences();

  console.log('\n=== CONCLUSION ===\n');
  console.log('The 1-byte difference is most likely caused by:');
  console.log('  1. FundingInput.prev_tx length using u16 (2 bytes) instead of BigSize (3 bytes for typical tx)');
  console.log('  2. This creates exactly +1 byte difference that we\'re seeing');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Update FundingInput.serializeBody() to use BigSize for prev_tx length');
  console.log('  2. Update redeem_script to use proper compact size encoding');
  console.log('  3. Test with a simple case to verify the fix');
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeSerializationDifferences,
  testEncodingDifferences,
  decodeBigSize
}; 