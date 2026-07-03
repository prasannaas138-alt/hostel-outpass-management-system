import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const createToken = (userId, role) => {
  // Include the role in the token so protected UI and API checks can reuse it.
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  year: user.year,
});

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, year } = req.body;

    if (!name || !email || !password || !role || !department || !year) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      department,
      year,
    });

    res.status(201).json({
      message: 'User created successfully',
      token: createToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    console.log('Login request received:', {
      email,
      role,
      hasPassword: Boolean(password),
    });

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = String(role).trim();
    const user = await User.findOne({
      email: normalizedEmail,
      role: normalizedRole,
    }).select('+password');

    console.log('User lookup result:', user ? { id: user._id, role: user.role, email: user.email } : null);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatches = await user.matchPassword(password);
    console.log('Password match result:', passwordMatches);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user._id, user.role);
    console.log('Token created for user:', user._id.toString());

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
