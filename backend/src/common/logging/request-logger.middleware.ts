import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";

const logger = pinoHttp({
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    'res.headers["set-cookie"]',
    "req.body.password",
    "req.body.current_password",
    "req.body.new_password",
    "req.body.token",
  ],
  genReqId: (req, res) => {
    const requestId = req.headers["x-request-id"]?.toString() ?? randomUUID();
    res.setHeader("x-request-id", requestId);
    return requestId;
  },
});

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    logger(req, res);
    next();
  }
}
