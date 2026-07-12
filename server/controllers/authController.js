import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const createToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  registerNumber: user.registerNumber,
  role: user.role,
  department: user.department,
  year: user.year,
  hostelBlock: user.hostelBlock,
  roomNumber: user.roomNumber,
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      registerNumber,
      department,
      hostelBlock,
      roomNumber,
      password,
      confirmPassword,
      role = 'Student',
    } = req.body;

    if (!name || !email || !registerNumber || !department || !hostelBlock || !roomNumber || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const validRoles = ['Student', 'HOD', 'Sister', 'Warden'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists.' });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      registerNumber,
      department,
      hostelBlock,
      roomNumber,
      password,
      role,
      year: role === 'Student' ? '1' : 'NA',
    });

    res.status(201).json({
      message: 'Registration successful.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    // MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = String(role).trim();

    // Find user by BOTH email and role (since the same email can have multiple roles)
    const user = await User.findOne({
      email: normalizedEmail,
      role: normalizedRole,
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email address or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email address or password.' });
    }

    const token = createToken(user._id, user.role);

    res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
};
