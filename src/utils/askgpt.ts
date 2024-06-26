import type { NextFunction, Request, Response } from "express";

import { communicateWithAssistant } from "./GptApi";
import { InternalServerError } from "./errors/errorClasses";
import {
  ASSISTANT_ID_CHOOSE_COACH,
  ASSISTANT_ID_GENERATE_FEEDBACK,
} from "./constants";

export const chooseMeACoach = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("Ask GPT start. Request message:");
  console.log(req.body.message);

  let respFromAssistant;
  try {
    respFromAssistant = await communicateWithAssistant({
      message: req.body.message,
      assistantId: ASSISTANT_ID_CHOOSE_COACH,
    });
    console.log(respFromAssistant);
    res.send(respFromAssistant);
  } catch (err) {
    if (err instanceof Error) {
      next(new InternalServerError(err.message));
    } else {
      next(new InternalServerError("Unknown error"));
    }
  }
};

export const generateFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("Ask GPT start. Request message:");
  console.log(req.body.message);

  let respFromAssistant;
  try {
    respFromAssistant = await communicateWithAssistant({
      message: req.body.message,
      assistantId: ASSISTANT_ID_GENERATE_FEEDBACK,
    });
    console.log(respFromAssistant);
    res.send(respFromAssistant);
  } catch (err) {
    if (err instanceof Error) {
      next(new InternalServerError(err.message));
    } else {
      next(new InternalServerError("Unknown error"));
    }
  }
};
