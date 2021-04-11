import { Logger } from '@node-dlc/logger';
import bcrypto from 'bcrypto';
import DlcdClient from '../../client/DlcdClient';
import { getLogger } from '../../utils/config';
import { IArguments } from '../../arguments';
import { Endpoint } from '@node-dlc/daemon';

export const command = 'create';

export const describe = 'Create Wallet';

export const builder = {
  apikey: {
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

export async function handler(argv: IArguments): Promise<void> {
  const { host, port, apikey, loglevel } = argv;
  const logger: Logger = getLogger(loglevel);
  let _apikey: string = apikey;
  let noApiKey = false;
  if (!_apikey) {
    // No API Key provided, generate one
    _apikey = bcrypto.random.randomBytes(32).toString('hex');
    noApiKey = true;
  }
  const client = new DlcdClient(host, port, logger, _apikey);
  const response = await client.post(Endpoint.WalletCreate);
  const { mnemonic } = response;
  logger.log(
    `${cipherSeedMessageStart}\n${formatMnemonic(
      mnemonic,
    )}\n${cipherSeedMessageEnd}`,
  );
  if (noApiKey) {
    logger.log(`Generated API KEY: ${_apikey}`);
  }
}
