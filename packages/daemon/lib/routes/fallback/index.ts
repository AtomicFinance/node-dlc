import { Logger } from '@node-lightning/logger';
import { Application, Request, Response, NextFunction } from 'express';
import HttpException from '../handler/HttpException';

export class RoutesFallback {
  constructor(app: Application, logger: Logger) {
    app.use(
      (req: Request, res: Response, next: NextFunction): Response => {
        return res.status(404).send({
          status: 404,
          error: 'Not Found',
        });
      },
    );
    app.use(
      (
        err: HttpException,
        req: Request,
        res: Response,
        next: NextFunction,
      ): Response => {
        logger.error(err.message);
        return res.status(500).send({
          status: 500,
          error: err.message,
        });
      },
    );
  }
}
