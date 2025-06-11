const fs = require('fs');
const testData = JSON.parse(fs.readFileSync('./test_vectors/dlcspecs/enum_single_oracle_test.json', 'utf8'));
console.log(testData.offer_message.serialized); 