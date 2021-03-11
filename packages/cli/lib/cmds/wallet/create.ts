import DlcdClient from '../../client/dlcdClient'
import bcrypto from 'bcrypto'

export const command = 'create'

export const describe = 'Create Wallet'

// export const builder = (yargs) => {
//   return yargs
//     .option('apikey', {
//       type: 'string'
//     })
// }

export const builder = {
  apiKey: {
    default: ''
  }
}

// exports.builder = function (yargs) {
//   return yargs
//     .option('banana', {
//       default: 'cool',
//     })
//     .option('batman', {
//       default: 'sad',
//     });
// };

export async function handler(argv) {
  const { host, port, apiKey } = argv
  let apiKey_: string = apiKey
  if (!apiKey) {
    // No API Key provided, generate one
    apiKey_ = bcrypto.random.randomBytes(32).toString('hex')
  }
  const client = new DlcdClient(host, port, apiKey_)
  const response = await client.post('/wallet/create', { apiKey: apiKey_ })
  console.log('response', response)
}
