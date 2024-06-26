import { celebrate, Joi, Segments } from "celebrate";
import type { NextFunction, Request, Response } from "express";
import {
  baseUserCreationJoiValidationSchema,
  baseUserLoginJoiValidationSchema,
  baseUserModificationJoiValidationSchema,
  coachSpecificModificationJoiValidationSchema,
  idsJoiValidationSchema,
} from "./validationSchemas";

export const validateCreateUserData = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  celebrate({
    body: Joi.object().keys(baseUserCreationJoiValidationSchema).unknown(false),
  })(req, res, next);
};

export const validateModifyUserData = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.dir(req.body);
  celebrate({
    body: Joi.object().keys({
      ...baseUserModificationJoiValidationSchema,
      ...coachSpecificModificationJoiValidationSchema,
    }),
    // .unknown(true),
  })(req, res, next);
};

export const validateLoginData = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  celebrate({
    body: Joi.object().keys(baseUserLoginJoiValidationSchema).unknown(false),
  })(req, res, next);
};

export const validateIds = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  celebrate({
    [Segments.PARAMS]: Joi.object().custom(
      (value: Record<string, string>, helpers) => {
        const ids: string[] = [];
        for (const key in value) {
          if (key.includes("Id")) ids.push(value[key]);
        }
        // console.log(ids);
        const { error } = idsJoiValidationSchema.validate(ids);
        // console.dir(error);
        if (error !== undefined) {
          // Return validation error to the client
          return helpers.error("any.invalid", {
            message: error.details[0].message,
          });
        }

        return value;
      }
    ),
  })(req, res, next);
};
