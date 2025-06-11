const fs = require('fs');
const {DlcOffer} = require('./dist');

const testData = JSON.parse(fs.readFileSync('./test_vectors/dlcspecs/enum_single_oracle_test.json', 'utf8'));
const offer = DlcOffer.fromJSON(testData.offer_message.message);
const actualHex = offer.serialize().toString('hex');

console.log(actualHex); 