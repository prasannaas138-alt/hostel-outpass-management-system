import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
      // NOTE: uniqueness is enforced via the compound index below (email + role),
      // so the same email address can hold multiple roles (Student, HOD, Sister, Warden).
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ['Student', 'HOD', 'Sister', 'Warden'],
    },
    department: {
      type: String,
      trim: true,
      default: '',
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

// Allow the same email to be registered under different roles.
// A person cannot have duplicate (email + role) combinations.
userSchema.index({ email: 1, role: 1 }, { unique: true });

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
