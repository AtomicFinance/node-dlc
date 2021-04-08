import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../../client/DlcdClient';
import { getLogger } from '../../../utils/config';
import { IArguments } from '../../../arguments';
import { Endpoint } from '@node-dlc/daemon';

export const command =
  'createdlcorderoffer [contractinfo] [collateral] [feerate] [locktime] [refundlocktime]';

export const describe = 'Create Dlc Order Offer';

export const builder = {
  apikey: {
    default: '',
  },
};

export async function handler(argv: IArguments): Promise<void> {
  const {
    host,
    port,
    apikey,
    loglevel,
    contractinfo,
    collateral,
    feerate,
    locktime,
    refundlocktime,
  } = argv;
  const logger: Logger = getLogger(loglevel);
  const client = new DlcdClient(host, port, logger, apikey, 'api/v0');
  const response = await client.post(Endpoint.OrderOffer, {
    contractinfo,
    collateral,
    feerate,
    locktime,
    refundlocktime,
  });
  logger.log(response.hex);
}
