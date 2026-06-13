import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodSchema } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Middleware factory that validates and parses `req[part]` against the
 * given Zod schema, replacing it with the parsed value on success or
 * forwarding a ZodError to the global error handler on failure.
 */
export function validate(schema: ZodSchema, part: RequestPart = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[part]);
      if (part === 'body') {
        // req.body is a plain writable property set by the JSON body parser.
        req.body = parsed;
      } else {
        // req.query/req.params are getter-only in Express 4 — mutate in place instead.
        Object.assign(req[part], parsed);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
