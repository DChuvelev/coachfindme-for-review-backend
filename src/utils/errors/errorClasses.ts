import {
  BAD_REQUEST,
  CONFLICT,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  UNAUTHORIZED,
} from "./errorCodes";

export class BadRequestError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.status = BAD_REQUEST;
  }
}

export class ConflictError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.status = CONFLICT;
  }
}

export class ForbiddenError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.status = FORBIDDEN;
  }
}

export class InternalServerError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.status = INTERNAL_SERVER_ERROR;
  }
}

export class NotFoundError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.status = NOT_FOUND;
  }
}

export class UnauthorizedError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.status = UNAUTHORIZED;
  }
}
