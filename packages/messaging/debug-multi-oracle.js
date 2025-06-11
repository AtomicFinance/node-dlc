const fs = require('fs');
const { DlcOffer } = require('./dist');

// Load the multi-oracle test vector
const testData = JSON.parse(fs.readFileSync('./test_vectors/dlcspecs/enum_3_of_3_test.json', 'utf8'));
const offerMessage = testData.offer_message.message;

console.log('🔍 Multi-Oracle Serialization Debug');
console.log('');

try {
  // Parse the offer
  const offer = DlcOffer.fromJSON(offerMessage);
  
  console.log('✅ Parsed DlcOffer successfully');
  console.log('');
  
  // Get the oracle info
  const oracleInfo = offer.contractInfo.oracleInfo;
  console.log('Oracle info type:', oracleInfo.constructor.name);
  
  if (oracleInfo.constructor.name === 'MultiOracleInfo') {
    console.log('Threshold:', oracleInfo.threshold);
    console.log('Announcements count:', oracleInfo.announcements.length);
    console.log('');
    
    // Test serializeBody() method
    const serializedBody = oracleInfo.serializeBody();
    const hex = serializedBody.toString('hex');
    
    console.log('Serialized body hex (first 40 chars):', hex.substring(0, 40));
    console.log('');
    
    console.log('Breaking down the serialization:');
    
    // Threshold (2 bytes, big endian)
    const thresholdHex = hex.substring(0, 4);
    const threshold = parseInt(thresholdHex, 16);
    console.log('- Threshold bytes:', thresholdHex, '→', threshold);
    
    // Announcements count (1 byte)
    const countHex = hex.substring(4, 6);
    const count = parseInt(countHex, 16);
    console.log('- Announcements count byte:', countHex, '→', count);
    console.log('- Expected count:', oracleInfo.announcements.length);
    
    if (count !== oracleInfo.announcements.length) {
      console.log('❌ COUNT MISMATCH! Expected', oracleInfo.announcements.length, 'but got', count);
    } else {
      console.log('✅ Count matches');
    }
    
    console.log('');
    console.log('Rest of hex:', hex.substring(6, 50));
  }
  
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log(error.stack);
} 