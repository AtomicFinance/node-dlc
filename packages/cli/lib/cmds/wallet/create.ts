import { Logger } from '@node-dlc/logger';
import bcrypto from 'bcrypto';
import DlcdClient from '../../client/DlcdClient';
import { getLogger } from '../../utils/config';

export const command = 'create';

export const describe = 'Create Wallet';

export const builder = {
  apiKey: {
    default: '',
  },
};

const cipherSeedMessageStart = `
!!!YOU MUST WRITE DOWN THIS SEED TO BE ABLE TO RESTORE THE WALLET!!!

- - - - - - - - - - - - BEGIN DLCD CIPHER SEED - - - - - - - - - - - -
`;

function formatMnemonic(mnemonic): string {
  let output = '';
  const mnemonicArray = mnemonic.split(' ');
  for (let i = 0; i < mnemonicArray.length; i++) {
    output += `  ${i < 9 ? ' ' : ''}${i + 1}. ${
      mnemonicArray[i]
    }   ${' '.repeat(Math.abs(mnemonicArray[i].length - 8))}${
      (i + 1) % 4 === 0 ? '\n' : ''
    }`;
  }
  return output;
}

const cipherSeedMessageEnd = `
- - - - - - - - - - - - - END DLCD CIPHER SEED - - - - - - - - - - - - -

!!!YOU MUST WRITE DOWN THIS SEED TO BE ABLE TO RESTORE THE WALLET!!!
`;

export async function handler(argv) {
  const { host, port, apiKey, loglevel } = argv;
  const logger: Logger = getLogger(loglevel);
  let _apiKey: string = apiKey;
  if (!apiKey) {
    // No API Key provided, generate one
    _apiKey = bcrypto.random.randomBytes(32).toString('hex');
  }
  const client = new DlcdClient(host, port, logger, _apiKey);
  const response = await client.post('/wallet/create', { apiKey: _apiKey });
  const { mnemonic } = response;
  logger.log(
    `${cipherSeedMessageStart}\n${formatMnemonic(
      mnemonic,
    )}\n${cipherSeedMessageEnd}`,
  );
}
