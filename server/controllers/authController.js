import jwt from 'jsonwebtoken';
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
  role: user.role,
  department: user.department,
  year: user.year,
});

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, year } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password and role are required' });
    }

    const validRoles = ['Student', 'HOD', 'Sister', 'Warden'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be Student, HOD, Sister, or Warden' });
    }

    // Check if this exact (email + role) combination already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
      role,
    });

    if (existingUser) {
      return res.status(400).json({
        message: `An account with this email already exists for the role: ${role}`,
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      department: department || (role === 'Student' ? '' : 'General'),
      year: year || (role === 'Student' ? '1' : 'NA'),
    });

    res.status(201).json({
      message: 'Account created successfully',
      token: createToken(user._id, user.role),
      user: sanitizeUser(user),
    });
  } catch (error) {
    // MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An account with this email and role combination already exists',
      });
    }
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    console.log('Login attempt:', { email, role });

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = String(role).trim();

    // Find user by BOTH email and role (since the same email can have multiple roles)
    const user = await User.findOne({
      email: normalizedEmail,
      role: normalizedRole,
    }).select('+password');

    console.log('User found:', user ? { id: user._id, email: user.email, role: user.role } : null);

    if (!user) {
      console.log('Login failure: no account found for this email + role combination');
      return res.status(401).json({
        message: `No ${normalizedRole} account found for this email address. Please check your role or register first.`,
      });
    }

    const passwordMatches = await user.matchPassword(password);
    console.log('Password match:', passwordMatches);

    if (!passwordMatches) {
      console.log('Login failure: password did not match');
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const token = createToken(user._id, user.role);
    console.log('Login success:', user.email, '/', user.role);

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
