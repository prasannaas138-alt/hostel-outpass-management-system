import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ProfileChangeRequest from '../models/ProfileChangeRequest.js';

const createToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const batchPattern = /^[0-9]{4}-[0-9]{4}$/;
const phonePattern = /^[0-9+\-\s()]{6,15}$/;

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  registerNumber: user.registerNumber,
  role: user.role,
  department: user.department,
  year: user.year,
  batch: user.batch || '',
  hostelBlock: user.hostelBlock,
  hostelName: user.hostelName || user.hostelBlock || '',
  roomNumber: user.roomNumber,
  phone: user.phone,
  parentPhone: user.parentPhone || '',
  parentGuardianName: user.parentGuardianName || '',
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
      parentGuardianName,
      hostelName,
      batch,
      password,
      confirmPassword,
    } = req.body;

    if (!name || !email || !registerNumber || !department || !roomNumber || !phone || !parentPhone || !parentGuardianName || !hostelName || !batch || !password || !confirmPassword) {
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

    const trimmedBatch = String(batch).trim();
    if (!batchPattern.test(trimmedBatch)) {
      return res.status(400).json({ message: 'Batch must be in YYYY-YYYY format (e.g. 2025-2029).' });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      registerNumber,
      department,
      roomNumber,
      phone: String(phone).trim(),
      parentPhone: String(parentPhone).trim(),
      parentGuardianName: String(parentGuardianName).trim(),
      hostelName: String(hostelName).trim(),
      hostelBlock: String(hostelName).trim(),
      batch: trimmedBatch,
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

export const getStudentProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'Student') {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Student self-service profile update.
//
// Direct-edit fields: name, year, hostelName, batch (applied immediately).
// PROTECTED fields — registerNumber, phone, parentPhone, parentGuardianName,
// department — are NEVER applied here. Any change to them is stored as a
// pending ProfileChangeRequest that ONLY the HOD can approve/reject, so a
// student cannot bypass HOD approval by calling this endpoint directly.
// ---------------------------------------------------------------------------
export const updateCurrentUser = async (req, res, next) => {
  try {
    const {
      name,
      department,
      year,
      hostelBlock,
      hostelName,
      phone,
      parentPhone,
      parentGuardianName,
      registerNumber,
      batch,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // ---- Batch (direct-edit, strict YYYY-YYYY when non-empty) ----
    let nextBatch = user.batch || '';
    if (typeof batch === 'string') {
      const candidate = batch.trim();
      if (candidate && !batchPattern.test(candidate)) {
        return res.status(400).json({ message: 'Batch must be in YYYY-YYYY format (e.g. 2025-2029).' });
      }
      nextBatch = candidate;
    }

    // ---- Protected fields: collect actual old -> new changes ----
    const protectedFields = [
      { field: 'registerNumber', label: 'Registration Number', requested: registerNumber },
      { field: 'phone', label: 'Phone Number', requested: phone },
      { field: 'parentPhone', label: 'Parent/Guardian Number', requested: parentPhone },
      { field: 'parentGuardianName', label: 'Parent Name', requested: parentGuardianName },
      { field: 'department', label: 'Department', requested: department },
    ];

    const changes = [];
    for (const { field, label, requested } of protectedFields) {
      if (typeof requested !== 'string') continue;
      const newValue = requested.trim();
      const oldValue = String(user[field] || '');
      if (newValue === oldValue) continue;

      if ((field === 'phone' || field === 'parentPhone') && newValue && !phonePattern.test(newValue)) {
        return res.status(400).json({ message: `Enter a valid ${label.toLowerCase()} (6-15 digits).` });
      }
      if (field === 'registerNumber' && !newValue) {
        return res.status(400).json({ message: 'Register number cannot be empty.' });
      }
      if (field === 'department' && !newValue) {
        return res.status(400).json({ message: 'Department cannot be empty.' });
      }

      changes.push({ field, label, oldValue, newValue });
    }

    // ---- Direct-edit fields (applied immediately) ----
    user.name = String(name).trim();
    if (typeof year === 'string') {
      user.year = String(year).trim();
    }
    user.batch = nextBatch;
    const hostelValue = (typeof hostelName === 'string' && hostelName.trim()) ? hostelName.trim() : ((typeof hostelBlock === 'string' && hostelBlock.trim()) ? hostelBlock.trim() : '');
    if (hostelValue) {
      user.hostelBlock = hostelValue;
      user.hostelName = hostelValue;
    }

    // ---- Protected fields: pending HOD request, official values untouched ----
    let changeRequest = null;
    if (changes.length > 0) {
      changeRequest = await ProfileChangeRequest.create({
        student: user._id,
        changes,
      });
    }

    await user.save();

    const message = changeRequest
      ? 'Profile updated. Your protected field change(s) were sent to the HOD for approval.'
      : 'Profile updated successfully.';

    res.json({ message, user: sanitizeUser(user), changeRequest });
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

    // Targeted update that hashes the password inline. This avoids loading
    // and re-saving the full document, so updating a staff account never
    // triggers Student-only field validation.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.updateOne(
      { _id: req.user._id },
      { $set: { password: hashedPassword } }
    );

    res.json({ message: 'Password changed successfully.', user: sanitizeUser(req.user) });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Staff profile update (Warden profile card). Updates username and email
// only, using a targeted Mongo update so no student/system fields
// (department, year, hostelBlock, phone, role, registerNumber) can change
// through here and no unrelated document validation is triggered.
// ---------------------------------------------------------------------------
export const updateMyUsername = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = email !== undefined ? String(email).trim().toLowerCase() : null;

    if (trimmedEmail !== null) {
      if (!emailPattern.test(trimmedEmail)) {
        return res.status(400).json({ message: 'Invalid email address.' });
      }

      // Only block if ANOTHER user holds the email for the same role.
      const duplicate = await User.findOne({
        email: trimmedEmail,
        role: req.user.role,
        _id: { $ne: req.user._id },
      });

      if (duplicate) {
        return res.status(400).json({ message: 'Email already exists.' });
      }
    }

    const $set = { name: trimmedName };
    if (trimmedEmail !== null) {
      $set.email = trimmedEmail;
    }

    // Targeted update: bypasses the full-document save hook so updating a
    // staff account never triggers Student-only field validation.
    await User.updateOne(
      { _id: req.user._id },
      { $set }
    );

    const user = await User.findById(req.user._id);

    res.json({ message: 'Profile updated successfully.', user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Profile change requests (HOD approval system for protected student fields).
// ---------------------------------------------------------------------------

export const getMyChangeRequests = async (req, res, next) => {
  try {
    const requests = await ProfileChangeRequest.find({ student: req.user._id, status: 'Pending' })
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests);
  } catch (error) {
    next(error);
  }
};

export const getProfileChangeRequests = async (req, res, next) => {
  try {
    const requests = await ProfileChangeRequest.find({ status: 'Pending' })
      .sort({ createdAt: -1 })
      .populate('student', 'name registerNumber department year batch')
      .lean();
    res.json(requests);
  } catch (error) {
    next(error);
  }
};

export const reviewProfileChangeRequest = async (req, res, next) => {
  try {
    const { action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject.' });
    }

    const request = await ProfileChangeRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Change request not found.' });
    }
    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'This change request was already reviewed.' });
    }

    if (action === 'approve') {
      // Apply every approved change with a targeted $set so untouched required
      // fields (roomNumber, registerNumber of OTHER students, etc.) are never
      // re-validated or replaced.
      const $set = {};
      for (const change of request.changes) {
        $set[change.field] = change.newValue;
      }
      await User.updateOne({ _id: request.student }, { $set });
    }

    request.status = action === 'approve' ? 'Approved' : 'Rejected';
    request.reviewedBy = req.user._id;
    await request.save();

    res.json({
      message: action === 'approve'
        ? 'Changes approved and applied to the student profile.'
        : 'Changes rejected. The original values were kept.',
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// HOD Students Profile: list all students + DIRECT profile editing (no
// approval needed when the HOD edits — changes apply immediately).
// ---------------------------------------------------------------------------

export const listStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'Student' })
      .sort({ name: 1 })
      .select('name email registerNumber department year batch hostelName hostelBlock roomNumber phone parentPhone parentGuardianName')
      .lean();
    res.json(students);
  } catch (error) {
    next(error);
  }
};

export const hodUpdateStudentProfile = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id);

    if (!student || student.role !== 'Student') {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const allowed = [
      'name', 'registerNumber', 'department', 'year', 'batch',
      'hostelName', 'roomNumber', 'phone', 'parentPhone', 'parentGuardianName', 'email',
    ];

    const updates = {};
    for (const key of allowed) {
      if (typeof req.body[key] === 'string') {
        updates[key] = req.body[key].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No changes submitted.' });
    }

    if (updates.batch && !batchPattern.test(updates.batch)) {
      return res.status(400).json({ message: 'Batch must be in YYYY-YYYY format (e.g. 2025-2029).' });
    }

    for (const key of ['phone', 'parentPhone']) {
      if (updates[key] && !phonePattern.test(updates[key])) {
        return res.status(400).json({ message: 'Enter valid phone numbers (6-15 digits).' });
      }
    }

    if (updates.email) {
      const normalizedEmail = updates.email.toLowerCase();
      if (!emailPattern.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Invalid email address.' });
      }
      const duplicate = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: student._id },
      });
      if (duplicate) {
        return res.status(400).json({ message: 'Email already exists.' });
      }
      updates.email = normalizedEmail;
    }

    if (updates.registerNumber === '') {
      return res.status(400).json({ message: 'Register number cannot be empty.' });
    }
    if (updates.department === '') {
      return res.status(400).json({ message: 'Department cannot be empty.' });
    }

    // Direct $set of ONLY the submitted fields — the HOD does not need anyone's
    // approval, and untouched required fields stay exactly as they are.
    const $set = { ...updates };
    if ($set.hostelName) {
      // Keep the legacy mirror field in sync (existing app convention).
      $set.hostelBlock = $set.hostelName;
    }

    await User.updateOne({ _id: student._id }, { $set });

    const updated = await User.findById(student._id);

    res.json({ message: 'Student profile updated.', user: sanitizeUser(updated) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
    next(error);
  }
};
