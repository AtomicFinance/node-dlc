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

export const diffError = (
  className: string,
  expected: string,
  actual: string,
): string => {
  return `Serialized ${className} does not equal provided ${className}.\n
Provided: ${longVal(expected)}\n
Actual: ${longVal(actual)}`;
};

export const longVal = (val: string): string => {
  return val.length > 100 ? `${val.substring(0, 100)}...` : val;
};
