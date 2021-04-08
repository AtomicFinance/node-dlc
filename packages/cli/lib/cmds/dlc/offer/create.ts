import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../../client/DlcdClient';
import { getLogger } from '../../../utils/config';
import { IArguments } from '../../../arguments';
import { Endpoint } from '@node-dlc/daemon';

export const command =
  'createdlcoffer [contractinfo] [collateral] [feerate] [locktime] [refundlocktime]';

export const describe = 'Create Dlc Offer';

export const builder = {
  apikey: {
    default: '',
  },
};

export async function handler(argv: IArguments): Promise<void> {
  console.log('argv', argv);
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
  const response = await client.post(Endpoint.DlcOffer, {
    contractinfo,
    collateral,
    feerate,
    locktime,
    refundlocktime,
  });
  logger.log(response.hex);
}
