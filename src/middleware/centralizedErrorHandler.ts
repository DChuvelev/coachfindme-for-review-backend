import { type Response, type Request, type NextFunction } from "express";
import { type InternalServerError } from "../utils/errors/errorClasses";

export const centralizedErrorHandler = (
  err: InternalServerError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log(`${err.message}. Error status: ${err.status}`);
  const { status = 500, message } = err;
  res.status(status).send({
    message: status === 500 ? "Internal server error" : message,
  });
};
