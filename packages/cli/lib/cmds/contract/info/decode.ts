import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../../client/DlcdClient';
import { getLogger } from '../../../utils/config';
import { IArguments } from '../../../arguments';
import { Endpoint } from '@node-dlc/daemon';

export const command = 'decoderawcontractinfo [contractinfo]';

export const describe = 'Decode Raw ContractInfo';

export const builder = {
  apiKey: {
    default: '',
  },
};

export async function handler(argv: IArguments): Promise<void> {
  const { host, port, apiKey, loglevel } = argv;
  const logger: Logger = getLogger(loglevel);
  const client = new DlcdClient(host, port, logger, apiKey);
  const response = await client.post(`${Endpoint.ContractInfo}/decode`, {
    contractinfo: argv.contractinfo,
  });
  logger.log(JSON.stringify(response, null, 2));
}
