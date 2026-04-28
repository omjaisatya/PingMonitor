import { validationResult } from "express-validator";

// reusable validate middleware

const validate = (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      error: error.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }

  next();
};

export default validate;
