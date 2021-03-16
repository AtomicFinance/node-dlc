import { Response } from "express";
import BaseRoute from "../v1/base";

export function routeErrorHandler(route: BaseRoute, res: Response, status: number, msg: string) {
  route.logger.error(`${route.constructor.name} Error: ${msg}`);
  return res.status(status).send({ msg });
}
