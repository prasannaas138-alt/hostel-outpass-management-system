import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const HOSTEL_NAMES = [
  'St. Joseph University Boys Hostel',
  'DMI Boys Hostel',
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    registerNumber: {
      type: String,
      trim: true,
      required: {
        validator: function () {
          return this.role === 'Student';
        },
        message: 'Register number is required.',
      },
    },
    department: {
      type: String,
      trim: true,
      required: {
        validator: function () {
          return this.role === 'Student';
        },
        message: 'Department is required.',
      },
    },
    hostelBlock: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    parentPhone: {
      type: String,
      trim: true,
      default: '',
    },
    hostelName: {
      type: String,
      trim: true,
      default: '',
    },
    roomNumber: {
      type: String,
      trim: true,
      required: {
        validator: function () {
          return this.role === 'Student';
        },
        message: 'Room number is required.',
      },
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ['Student', 'HOD', 'Sister', 'Warden'],
      default: 'Student',
    },
    year: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true });

userSchema.pre('save', async function hashPassword() {
  // In Mongoose v7+ async pre-hooks must NOT call next().
  // Simply return early or throw — Mongoose handles the rest.
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.comparePassword = async function comparePassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
