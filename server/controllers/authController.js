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
  hostelName: user.hostelName || user.hostelBlock || '',
  roomNumber: user.roomNumber,
  phone: user.phone,
  parentPhone: user.parentPhone || '',
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      registerNumber,
      department,
      roomNumber,
      phone,
      parentPhone,
      hostelName,
      password,
      confirmPassword,
    } = req.body;

    if (!name || !email || !registerNumber || !department || !roomNumber || !phone || !parentPhone || !hostelName || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Public endpoint: registrations are always Students.
    // Staff (HOD/Sister/Warden) accounts are provisioned separately by the administrator.
    const role = 'Student';

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

    const allowedHostels = [
      'St. Joseph University Boys Hostel',
      'DMI Boys Hostel',
    ];
    if (!allowedHostels.includes(String(hostelName).trim())) {
      return res.status(400).json({ message: 'Please select a valid hostel name.' });
    }
    const phoneRe = /^[0-9+\-\s()]{6,15}$/;
    if (!phoneRe.test(String(phone).trim()) || !phoneRe.test(String(parentPhone).trim())) {
      return res.status(400).json({ message: 'Enter valid phone numbers (6-15 digits).' });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      registerNumber,
      department,
      roomNumber,
      phone: String(phone).trim(),
      parentPhone: String(parentPhone).trim(),
      hostelName: String(hostelName).trim(),
      hostelBlock: String(hostelName).trim(),
      password,
      role,
      year: '1',
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

// Editable fields for a student's own profile. Deliberately excludes
// email/registerNumber (identity), role (system-controlled) and password
// (handled by the separate password endpoint below).
export const updateCurrentUser = async (req, res, next) => {
  try {
    const { name, department, year, hostelBlock, hostelName, phone, parentPhone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }
    if (!department || !String(department).trim()) {
      return res.status(400).json({ message: 'Department is required.' });
    }

    // Editable fields only. System-controlled fields are never taken from the
    // request body: role (system), registerNumber (identity), email (identity),
    // and roomNumber are not editable through this profile-update endpoint.
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.name = String(name).trim();
    user.department = String(department).trim();
    if (typeof year === 'string') {
      user.year = String(year).trim();
    }
    const hostelValue = (typeof hostelName === 'string' && hostelName.trim()) ? hostelName.trim() : ((typeof hostelBlock === 'string' && hostelBlock.trim()) ? hostelBlock.trim() : '');
    if (hostelValue) {
      user.hostelBlock = hostelValue;
      user.hostelName = hostelValue;
    }
    if (typeof phone === 'string' && phone.trim()) {
      user.phone = String(phone).trim();
    }
    if (typeof parentPhone === 'string' && parentPhone.trim()) {
      user.parentPhone = String(parentPhone).trim();
    }

    await user.save();

    res.json({ message: 'Profile updated successfully.', user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// Separate password-change flow. Never part of the profile-update API.
// The JWT is unchanged — it contains no password data, so the session
// stays valid after a successful password change.
export const changeMyPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Current, new, and confirm passwords are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must contain at least 8 characters.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match.' });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'New password must be different from the current password.' });
    }

    // protect loads the user with .select('+password') so req.user.password
    // is populated for the comparison.
    const matches = await req.user.matchPassword(currentPassword);

    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    // Update only the authenticated user's own record.
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.password = newPassword;
    await user.save(); // existing pre('save') hook hashes with bcrypt

    res.json({ message: 'Password changed successfully.', user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Username-only profile update (Warden profile card). Deliberately separate
// from updateCurrentUser so no student/system fields (department, year,
// hostelBlock, phone, role, email, registerNumber) can change through here.
// ---------------------------------------------------------------------------
export const updateMyUsername = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.name = String(name).trim();
    await user.save();

    res.json({ message: 'Username updated successfully.', user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};
