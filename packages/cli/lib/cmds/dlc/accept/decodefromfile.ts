import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../../client/DlcdClient';
import { getLogger } from '../../../utils/config';
import { IArguments } from '../../../arguments';
import { Endpoint } from '@node-dlc/daemon';
import fs from 'fs';

export const command = 'decoderawdlcacceptfromfile [filepath]';

export const describe = 'Decode Raw DlcAccept From File';

export const builder = {
  apikey: {
    default: '',
  },
};

export async function handler(argv: IArguments): Promise<void> {
  const { host, port, apikey, loglevel, filepath } = argv;
  const logger: Logger = getLogger(loglevel);
  const client = new DlcdClient(host, port, logger, apikey, 'api/v0');
  const dlcaccept = fs.readFileSync(filepath, 'utf8');
  const response = await client.post(`${Endpoint.DlcAccept}/decode`, {
    dlcaccept,
  });
  logger.log(JSON.stringify(response, null, 2));
}
