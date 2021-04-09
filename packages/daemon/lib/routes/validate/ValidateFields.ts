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
  value: string | core.Query | string[] | core.Query[],
  fieldName: string,
  route: BaseRoute,
  res: Response,
): void | Response => {
  const validateRes = validateString(value, fieldName, route, res);
  if (validateRes) return validateRes;

  try {
    Number(value as string);
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
  value: string | core.Query | string[] | core.Query[],
  fieldName: string,
  route: BaseRoute,
  res: Response,
): void | Response => {
  const validateRes = validateString(value, fieldName, route, res);
  if (validateRes) return validateRes;

  try {
    BigInt(value as string);
  } catch (e) {
    return routeErrorHandler(
      route,
      res,
      400,
      `${value} is not a valid bigint for ${fieldName}.`,
    );
  }
};

export const validateType = <T extends typeof DlcMessage>(
  value: string | core.Query | string[] | core.Query[],
  className: string,
  dlcMessage: T,
  route: BaseRoute,
  res: Response,
): void | Response => {
  const validateRes = validateString(value, dlcMessage.name, route, res);
  if (validateRes) return validateRes;

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

  if (_dlcMessage.serialize().toString('hex') !== value)
    return routeErrorHandler(
      route,
      res,
      400,
      `Serialized ${className} does not equal provided ${className}. \n
      Provided: ${value}\n
      Actual: ${_dlcMessage.serialize().toString('hex')}`,
    );
};
