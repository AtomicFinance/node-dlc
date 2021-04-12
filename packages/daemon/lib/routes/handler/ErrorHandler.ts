import { Response } from 'express';
import BaseRoute from '../base';

export const routeErrorHandler = (
  route: BaseRoute,
  res: Response,
  status: number,
  error: string,
): Response => {
  route.logger.error(`${route.constructor.name} Error: ${error}`);
  return res.status(status).send({ status, error });
};
