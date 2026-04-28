import { body, param, validationResult } from "express-validator";

const validUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (error) {
    return false;
  }
};

const createMonitorValidate = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 chars"),

  body("url")
    .trim()
    .notEmpty()
    .withMessage("URL is required")
    .custom(validUrl)
    .withMessage("Enter Valid URL"),

  body("interval")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Interval must be between 1 and 100 mins"),

  body("timezone").optional().isString().withMessage("Time must be a string"),
];

const updateMonitorValidate = [
  param("id").isMongoId().withMessage("invalid monitor ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Monitor name must between 1 and 100 chars"),

  body("url")
    .optional()
    .trim()
    .custom(validUrl)
    .withMessage("Provide valid URL"),

  body("interval")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Interval must be between 1 to 100 mins"),
];

// validation middleware for getting id
const validateMonitorID = [
  param("id").isMongoId().withMessage("Invalid monitor id"),
];

export { createMonitorValidate, updateMonitorValidate, validateMonitorID };
