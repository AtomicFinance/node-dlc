import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../client/DlcdClient';
import { getLogger } from '../../utils/config';
import { IArguments } from '../../arguments';
import { Endpoint } from '@node-dlc/daemon';

export const command = 'newaddress';

export const describe = 'Get New Address';

export const builder = {
  apikey: {
    default: '',
  },
  change: {
    default: false,
  },
};

export async function handler(argv: IArguments): Promise<void> {
  const { host, port, apikey, loglevel, change } = argv;
  const logger: Logger = getLogger(loglevel);
  const client = new DlcdClient(host, port, logger, apikey);
  const response = await client.get(Endpoint.WalletNewAddress, { change });
  logger.log(response);
}
