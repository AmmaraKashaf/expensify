import { Request, Response, NextFunction, RequestHandler } from "express";

export function asyncHandler<TReq extends Request = Request>(
  fn: (req: TReq, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req as TReq, res, next).catch(next);
  };
}
