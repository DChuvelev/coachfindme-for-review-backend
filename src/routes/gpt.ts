import { Router } from "express";
import { chooseMeACoach, generateFeedback } from "../utils/askgpt";

export const gptRouter = Router();

gptRouter.post("/chooseMeACoach", chooseMeACoach);
gptRouter.post("/generateFeedback", generateFeedback);
