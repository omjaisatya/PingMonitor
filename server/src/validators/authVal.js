import { body, validationResult } from "express-validator";

// used in routes/auth

const signUpValidator = [
  body("name").notEmpty().withMessage("Name is required"),

  body("email")
    .isEmail()
    .withMessage("Invalid email")
    .notEmpty()
    .withMessage("Email Required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6 characters long")
    .notEmpty()
    .withMessage("Password is required"),
];

const loginValidator = [
  body("email")
    .isEmail()
    .withMessage("Invalid Email")
    .notEmpty()
    .withMessage("Email is required"),

  body("password").notEmpty().withMessage("password is required"),
];

export { signUpValidator, loginValidator };
