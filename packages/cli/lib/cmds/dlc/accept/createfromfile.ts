import { Logger } from '@node-dlc/logger';
import DlcdClient from '../../../client/DlcdClient';
import { getLogger } from '../../../utils/config';
import { IArguments } from '../../../arguments';
import { Endpoint } from '@node-dlc/daemon';
import fs from 'fs';

export const command = 'acceptdlcofferfromfile [filepath]';

export const describe = 'Accept DlcOffer From File';

export const builder = {
  apikey: {
    default: '',
  },
};

export async function handler(argv: IArguments): Promise<void> {
  const { host, port, apikey, loglevel, filepath } = argv;
  const logger: Logger = getLogger(loglevel);
  const client = new DlcdClient(host, port, logger, apikey, 'api/v0');
  const dlcoffer = fs.readFileSync(filepath, 'utf8');
  const response = await client.post(Endpoint.DlcAccept, {
    dlcoffer,
  });
  logger.log(response.hex);
}
