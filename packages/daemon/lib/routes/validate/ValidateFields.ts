import BaseRoute from '../base';
import { Response } from 'express';
import { routeErrorHandler } from '../handler/ErrorHandler';
import { DlcMessage } from '@node-dlc/messaging';
import * as core from 'express-serve-static-core';

export const validateString = (
  value: string | core.Query | string[] | core.Query[],
  fieldName: string,
  route: BaseRoute,
  res: Response,
): void | Response => {
  if (!value)
    return routeErrorHandler(route, res, 401, `Missing ${fieldName} field`);

  if (!(typeof value === 'string'))
    return routeErrorHandler(route, res, 400, `Invalid ${fieldName}`);
};

export const validateNumber = (
  value: number,
  fieldName: string,
  route: BaseRoute,
  res: Response,
): void | Response => {
  try {
    Number(value);
  } catch (e) {
    return routeErrorHandler(
      route,
      res,
      400,
      `${value} is not a valid number for ${fieldName}.`,
    );
  }
};

export const validateBigInt = (
  value: number,
  fieldName: string,
  route: BaseRoute,
  res: Response,
): void | Response => {
  try {
    BigInt(value);
  } catch (e) {
    return routeErrorHandler(
      route,
      res,
      400,
      `${value} is not a valid bigint for ${fieldName}.`,
    );
  }
};

export const validateBuffer = (
  value: string,
  fieldName: string,
  route: BaseRoute,
  res: Response,
): void | Response => {
  try {
    Buffer.from(value, 'hex');
  } catch (e) {
    return routeErrorHandler(
      route,
      res,
      400,
      `Invalid hex for ${fieldName} provided.`,
    );
  }
};

export const validateType = <T extends typeof DlcMessage>(
  value: string,
  className: string,
  dlcMessage: T,
  route: BaseRoute,
  res: Response,
): void | Response => {
  let valueBuf: Buffer;
  try {
    valueBuf = Buffer.from(value as string, 'hex');
  } catch (e) {
    return routeErrorHandler(
      route,
      res,
      400,
      `Invalid hex for ${className} provided.`,
    );
  }

  let _dlcMessage: DlcMessage;
  try {
    _dlcMessage = dlcMessage.deserialize(valueBuf);
  } catch (e) {
    return routeErrorHandler(
      route,
      res,
      400,
      `Deserialization of ${className} failed. Hex: ${value}`,
    );
  }

  // try {
  //   dlcMessage.validate();
  // } catch (e) {
  //   return routeErrorHandler(
  //     route,
  //     res,
  //     400,
  //     `Validation failed for ${className}. Error: ${e}`,
  //   );
  // }

  if (Buffer.compare(_dlcMessage.serialize(), valueBuf) !== 0)
    return routeErrorHandler(
      route,
      res,
      400,
      `Serialized ${className} does not equal provided ${className}. \n
      Provided: ${value}\n
      Actual: ${_dlcMessage.serialize().toString('hex')}`,
    );
};
