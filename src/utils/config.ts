import type { Secret } from "jsonwebtoken";

export const JWT_SECRET: Secret =
  process.env.NODE_ENV === "production" &&
  process.env.JWT_SECRET !== null &&
  process.env.JWT_SECRET !== undefined
    ? process.env.JWT_SECRET
    : "SuperSecretSalt";

export const DB_ADDRESS: string =
  process.env.NODE_ENV === "production" &&
  process.env.DB_ADDRESS !== null &&
  process.env.DB_ADDRESS !== undefined
    ? process.env.DB_ADDRESS
    : "mongodb://127.0.0.1:27017/coach-connection";
