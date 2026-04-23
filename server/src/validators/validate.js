import { validationResult } from "express-validator";

// reusable validate middleware

const validate = (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }

  next();
};

export default validate;
