import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../client/DlcdClient';
import { getLogger } from '../../utils/config';
import { IArguments } from '../../arguments';

export const command =
  'createdlcorderoffer [contractinfo] [collateral] [feerate] [locktime] [refundlocktime]';

export const describe = 'Create Dlc Order Offer';

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
  const client = new DlcdClient(host, port, logger, apiKey);
  const response = await client.post('/order/offer', {
    contractinfo,
    collateral,
    feerate,
    locktime,
    refundlocktime,
  });
  logger.log(response.hex);
}
