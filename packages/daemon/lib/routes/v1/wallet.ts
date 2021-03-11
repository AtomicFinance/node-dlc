import { Router, Request, Response, NextFunction } from 'express';
// import CourseRepo from './../repositories/CoursesRepo';
// import { apiErrorHandler } from './../handlers/errorHandler';

import { generateMnemonic } from 'bip39'

import { responseError } from '../handler/ResponseError'

export default class WalletRoutes {
  constructor() {}

  postCreate(req: Request, res: Response, next: NextFunction) {
    console.log('req.query', req.query)
    console.log('req.params', req.params)
    // console.log('res', res)
    // apiKey should be defined
    const { apiKey } = req.query

    if (!apiKey) return next(responseError(400, 'Api Key Required'))

    // check if wallet is already created

    res.json({ test: 'test' })
  }
}
