import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(__dirname, "..", ".env"), // Lint askes to move it after all imports, but in this case I get error
  //from openAI, as it doesn't see it's env variable on time.
});
import { connect } from "mongoose";
import { type Response, type Request, type NextFunction } from "express";

import cors from "cors";
import limiter from "./utils/rateLimiter";
import bodyParser from "body-parser";
import helmet from "helmet";
import { errors } from "celebrate";
import routes from "./routes/index";
import type session from "express-session";
import initializeWebsocketServer from "./utils/websocket/websocket";
import express from "express";

import { requestLogger, errorLogger } from "./middleware/logger";
import { centralizedErrorHandler } from "./middleware/centralizedErrorHandler";
import { DB_ADDRESS } from "./utils/config";

// require("dotenv").config({
//   path: path.join(__dirname, "..", ".env"),
// });

const { PORT = 3001 } = process.env;

declare module "express" {
  interface Request {
    session: session.Session & Partial<session.SessionData>;
  }
}

export const userpicsPath = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "userpics"
);
console.log(userpicsPath);

const app = express();

app.use(helmet());

// app.use(limiter);

export const corsOptions: cors.CorsOptions = {
  origin: [
    "http://localhost:5173",
    "https://coachfind.me",
    "https://www.coachfind.me",
  ],
};

app.use(cors(corsOptions));

console.log(`The app is runnung in ${process.env.NODE_ENV} mode.`);

const connectToDatabase = async (): Promise<void> => {
  try {
    await connect(DB_ADDRESS);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

void connectToDatabase();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// app.use((req: Request, res: Response, next: NextFunction) => {
//   const timestamp = new Date().toISOString();
//   const requestInfo = {
//     method: req.method,
//     url: req.originalUrl,
//     ip: req.ip,
//     userAgent: req.headers["user-agent"], // Access user agent from headers
//   };

//   console.log(requestInfo);

//   next();
// });

app.use("/avatars", (req: Request, res: Response, next: NextFunction) => {
  res.set("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});
app.use("/avatars", express.static(userpicsPath));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use("/", routes);

app.use(requestLogger);

app.use("/", routes);

app.use(errorLogger);

app.use(errors());

app.use(centralizedErrorHandler);

const httpServer = app.listen(PORT, () => {
  console.log(`App listening to port ${PORT}`);
});

initializeWebsocketServer(httpServer);
