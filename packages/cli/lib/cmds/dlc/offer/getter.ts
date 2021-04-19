import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../../client/DlcdClient';
import { getLogger } from '../../../utils/config';
import { IArguments } from '../../../arguments';
import { Endpoint } from '@node-dlc/daemon';

export const command = 'getdlcoffer [tempcontractid]';

export const describe = 'Get DlcOffer';

export const builder = {
  apikey: {
    default: '',
  },
};

export async function handler(argv: IArguments): Promise<void> {
  const { host, port, apikey, loglevel, tempcontractid } = argv;
  const logger: Logger = getLogger(loglevel);
  const client = new DlcdClient(host, port, logger, apikey, 'api/v0');
  const response = await client.get(`${Endpoint.DlcOffer}/${tempcontractid}`);
  logger.log(response.hex);
}
