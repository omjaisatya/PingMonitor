import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.config.js";

// todo: refactor exists controller

const genToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "5d" });
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // fetching user if already register in db
    const existUser = await User.findOne({ email });
    if (existUser) {
      return res
        .status(400)
        .json({ message: "Email is already used, try signin" });
    }

    // hashing password (Encrypt)
    const hashPass = await bcrypt.hash(password, 12);

    // storing new user in db
    const newUser = await User.create({
      name,
      email,
      password: hashPass,
    });

    const token = genToken(newUser._id);

    res.status(201).json({
      message: "Successfully created account",
      token,
      newUser: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server Error, try again later", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid Credential, try signup" });
    }

    // matching user password from db
    const matchPass = await bcrypt.compare(password, user.password);
    if (!matchPass) {
      return res.status(401).json({ message: "Invalid Password" });
    }

    const token = genToken(user._id);

    res.status(200).json({
      message: "Successfully login",
      token,
      user: {
        id: user._id,
        email: user.email,
        password: user.password,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error, try again later", error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    // todo - i'll implementing real logout session
    // middleware already verified
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export { login, signup, logout };
