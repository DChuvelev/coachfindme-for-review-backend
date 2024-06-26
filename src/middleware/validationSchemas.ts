import { Joi } from "celebrate";

export const baseUserCreationJoiValidationSchema = {
  name: Joi.string().required().min(2).max(30).messages({
    "string.min": "Name should be at least 2 characters long",
    "string.max": "Name should be no longer then 30 characters",
    "string.empty": "The 'Name' field is empty",
  }),
  password: Joi.string().required().messages({
    "string.required": "Password field is required",
  }),
  email: Joi.string().required().email().messages({
    "string.email": "Email not valid",
  }),
  role: Joi.string().required().max(10).messages({
    "string.required": "Role field is required",
    "string.max": "Role field should not be longer then 5 chars",
  }),
};

export const baseUserModificationJoiValidationSchema = {
  name: Joi.string().min(2).max(30).messages({
    "string.min": "Name should be at least 2 characters long",
    "string.max": "Name should be no longer then 30 characters",
    "string.empty": "The 'Name' field is empty",
  }),
  email: Joi.string().required().email().messages({
    "string.email": "Email not valid",
  }),
  languages: Joi.array().items(Joi.string().min(2).max(5)).messages({
    "array.base": "Languages should be array of string",
    "string.max": "Language identifier should not be longer then 5 chars",
    "string.min": "Language identifier should not be shorter then 2 chars",
  }),
  about: Joi.string().empty("").max(4000).messages({
    "string.max": "About should be no longer then 4000 characters",
  }),
  birthDate: Joi.string().empty("").isoDate().messages({
    "string.isoDate": "Date must be in ISO 8601 format (YYYY-MM-DD)",
  }),
  gender: Joi.string().allow(null).max(10).messages({
    "string.max": "Gender should be no longer then 10 characters",
  }),
};

export const coachSpecificModificationJoiValidationSchema = {
  skills: Joi.array().items(Joi.string().min(2).max(20)).messages({
    "array.base": "Skills should be array of string",
    "string.max": "Skill identifier should not be longer then 5 chars",
    "string.min": "Skill identifier should not be shorter then 2 chars",
  }),
  sertification: Joi.string().max(20).messages({
    "string.max": "Sertification should be no longer then 20 characters",
    "string.empty": "The 'Sertification' field can't be empty",
  }),
  sertificationLevel: Joi.array().items(Joi.string().min(2).max(20)).messages({
    "array.base": "SertLevel should be array of string",
    "string.max": "SertLevel identifier should not be longer then 20 chars",
    "string.min": "SertLevel identifier should not be shorter then 2 chars",
  }),
  status: Joi.string().max(20).messages({
    "string.max": "Status should be no longer then 20 characters",
    "string.empty": "The 'Status' field can't be empty",
  }),
  avatar: Joi.string().empty("").max(40).messages({
    "string.max": "Avatar filename should be no longer then 40 characters",
  }),
  paymentOptions: Joi.array().items(Joi.string().min(2).max(12)).messages({
    "array.base": "PaymentOptions should be array of string",
    "string.max":
      "PaymentOptions identifier should not be longer then 12 chars",
    "string.min":
      "PaymentOptions identifier should not be shorter then 2 chars",
  }),
  paymentScheme: Joi.string().empty("").max(500).messages({
    "string.max": "PaymentScheme should be no longer then 500 characters",
  }),
};

export const baseUserLoginJoiValidationSchema = {
  password: Joi.string().required().messages({
    "string.required": "Password field is required",
  }),
  email: Joi.string().required().email().messages({
    "string.email": "Email not valid",
  }),
  role: Joi.string().required().max(10).messages({
    "string.required": "Role field is required",
    "string.max": "Role field should not be longer then 5 chars",
  }),
};

export const idsJoiValidationSchema = Joi.array()
  .items(Joi.string().allow(null, "undefined").hex().length(24))
  .messages({
    "string.hex": "Wrong ID format",
    "string.length": "ID should be 24 characters long",
  });
