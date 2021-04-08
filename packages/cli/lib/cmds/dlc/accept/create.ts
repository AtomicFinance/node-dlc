import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../../client/DlcdClient';
import { getLogger } from '../../../utils/config';
import { IArguments } from '../../../arguments';
import { Endpoint } from '@node-dlc/daemon';

export const command = 'acceptdlcoffer [dlcoffer]';

export const describe = 'Accept Dlc Offer';

export const builder = {
  apikey: {
    default: '',
  },
};

export async function handler(argv: IArguments): Promise<void> {
  const { host, port, apikey, loglevel, dlcoffer } = argv;
  const logger: Logger = getLogger(loglevel);
  const client = new DlcdClient(host, port, logger, apikey, 'api/v0');
  const response = await client.post(Endpoint.DlcAccept, {
    dlcoffer,
  });
  logger.log(response.hex);
}
