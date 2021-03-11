import DlcdClient from '../client/dlcdClient'

export const command = 'getinfo'

export const describe = 'Return information related to active daemon.'

export const builder = {
  apikey: {
    default: ''
  }
}

export function handler(argv) {
  const { host, post, apiKey } = argv
  console.log('apiKey', apiKey)
  // check if apikey blank
  // if it is, generate it
  const client = new DlcdClient(host, post, apiKey)
  // client.post('/wallet/create', )
  console.log('create', argv)
}
