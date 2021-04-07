import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../../client/DlcdClient';
import { getLogger } from '../../../utils/config';
import { IArguments } from '../../../arguments';
import { Endpoint } from '@node-dlc/daemon';

export const command = 'createdlcorderaccept [orderoffer]';

export const describe = 'Create Dlc Order Accept';

export const builder = {
  apiKey: {
    default: '',
  },
};

export async function handler(argv: IArguments): Promise<void> {
  const {
    host,
    port,
    apiKey,
    loglevel,
    contractinfo,
    collateral,
    feerate,
    locktime,
    refundlocktime,
  } = argv;
  const logger: Logger = getLogger(loglevel);
  const client = new DlcdClient(host, port, logger, apiKey, 'api/v0');
  const response = await client.post(Endpoint.OrderAccept, {
    contractinfo,
    collateral,
    feerate,
    locktime,
    refundlocktime,
  });
  logger.log(response.hex);
}
