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
      token: createToken(user._id, user.role),
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
    console.log('Email received:', email);
    console.log('Role received:', role);

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = String(role).trim();
    const userByEmailAndRole = await User.findOne({ email: normalizedEmail, role: normalizedRole }).select('+password');
    console.log(
      'User lookup by email and role:',
      userByEmailAndRole ? { id: userByEmailAndRole._id, role: userByEmailAndRole.role, email: userByEmailAndRole.email } : null
    );

    const userByEmail = userByEmailAndRole || (await User.findOne({ email: normalizedEmail }).select('+password'));

    console.log('User found:', userByEmail ? { id: userByEmail._id, role: userByEmail.role, email: userByEmail.email } : null);

    if (!userByEmail) {
      console.log('Login failure: no user found for email');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (userByEmail.role !== normalizedRole) {
      console.log('Role mismatch detected, continuing with stored role:', {
        selectedRole: normalizedRole,
        storedRole: userByEmail.role,
      });
    }

    const passwordMatches = await userByEmail.matchPassword(password);
    console.log('Password comparison result:', passwordMatches);

    if (!passwordMatches) {
      console.log('Login failure: password did not match');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(userByEmail._id, userByEmail.role);
    console.log('JWT created:', token ? 'yes' : 'no');
    console.log('Login success for user:', userByEmail.email);

    res.json({
      success: true,
      token,
      user: sanitizeUser(userByEmail),
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
};
