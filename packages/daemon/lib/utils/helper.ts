import { NextFunction, Request, Response } from 'express';

export const validApiKey = (str: string): boolean => {
  return str.match(/^[a-f0-9]{64}/i) !== null;
};

export const validPubKey = (str: string): boolean => {
  return str.match(/^[a-f0-9]{66}/i) !== null;
};

export const wrapAsync = (
  fn: (req: Request, res: Response, next?: NextFunction) => Promise<Response>,
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> => {
    return fn(req, res, next).catch(next);
  };
};
