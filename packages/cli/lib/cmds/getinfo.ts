import { Logger } from '@node-dlc/logger';
import DlcdClient from '../client/DlcdClient';
import { getLogger } from '../utils/config';

export const command = 'getinfo';

export const describe = 'Return information related to active daemon.';

export const builder = {
  apikey: {
    default: '',
  },
};

export async function handler(argv) {
  const { host, port, loglevel } = argv;
  const logger: Logger = getLogger(loglevel);
  const client = new DlcdClient(host, port, logger);
  const response = await client.get('/getinfo');
  logger.log(response);
}
