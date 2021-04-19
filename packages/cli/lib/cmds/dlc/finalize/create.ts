import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../../client/DlcdClient';
import { getLogger } from '../../../utils/config';
import { IArguments } from '../../../arguments';
import { Endpoint } from '@node-dlc/daemon';

export const command = 'finalizedlcsign [dlcsign]';

export const describe = 'Finalize Dlc Sign';

export const builder = {
  apikey: {
    default: '',
  },
};

export async function handler(argv: IArguments): Promise<void> {
  const { host, port, apikey, loglevel, dlcsign } = argv;
  const logger: Logger = getLogger(loglevel);
  const client = new DlcdClient(host, port, logger, apikey, 'api/v0');
  const response = await client.post(Endpoint.DlcFinalize, {
    dlcsign,
  });
  logger.log(response.contractid);
}
