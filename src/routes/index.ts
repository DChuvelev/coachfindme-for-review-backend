import { Router } from "express";
import { gptRouter } from "./gpt";
import { auth } from "../middleware/auth";
import { userpicsRouter } from "./userpics";
import { usersRouter } from "./users";
import { chatsRouter } from "./chats";
import type { Response, Request, NextFunction } from "express";
import { NotFoundError } from "../utils/errors/errorClasses";

const routes = Router();

routes.use("/askGpt", auth, gptRouter);
routes.use("/users", usersRouter);
routes.use("/userpics", auth, userpicsRouter);
routes.use("/chats", auth, chatsRouter);
routes.use("*", (req: Request, res: Response, next: NextFunction): void => {
  console.log(`Requested URL was ${req.originalUrl}`);
  next(new NotFoundError("Page not found"));
});

export default routes;
