import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const createToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    // Prevent self-registration as admin
    const safeRole = role === "recruiter" ? "recruiter" : "candidate";

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Recruiters start as inactive until admin approves them
    const isActive = safeRole === "recruiter" ? false : true;

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: safeRole,
      isActive
    });

    // Recruiters cannot log in until approved — return message without token
    if (safeRole === "recruiter") {
      return res.status(201).json({
        message: "Registration successful. Please wait for admin approval before logging in."
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Recruiters must be approved by admin
    if (user.role === "recruiter" && !user.isActive) {
      return res.status(403).json({
        message: "Your recruiter account is pending admin approval. Please wait."
      });
    }

    // Any other blocked account
    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been disabled." });
    }

    res.status(200).json({
      message: "Login successful",
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
