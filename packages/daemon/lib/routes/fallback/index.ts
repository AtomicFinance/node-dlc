import { Logger } from '@node-lightning/logger';
import { Application, Request, Response, NextFunction } from 'express';
import HttpException from '../handler/HttpException';

export class RoutesFallback {
  constructor(app: Application, logger: Logger) {
    app.use(
      (req: Request, res: Response, next: NextFunction): Response => {
        const ip =
          req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress;

        logger.error(
          `${ip} tried to ${req.method} invalid endpoint ${req.url}`,
        );

        return res.status(404).send({
          status: 404,
          error: `Invalid endpoint: ${req.method} ${req.url}`,
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
        const ip =
          req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress;

        logger.error(`Error: ${err.message}`);
        logger.error(`Failed: ${req.method} ${req.url} from ${ip}`);
        logger.trace(err.stack);
        if (!res.headersSent) {
          return res.status(500).send({
            status: 500,
            error: err.message,
          });
        }
      },
    );
  }
}
