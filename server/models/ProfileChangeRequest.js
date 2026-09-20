import mongoose from 'mongoose';

// A student's request to change one or more PROTECTED profile fields
// (registerNumber, phone, parentPhone, parentGuardianName, department).
// Changes are NOT applied to the official profile until the HOD approves.
const profileChangeRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changes: {
      type: [
        {
          field: {
            type: String,
            required: true,
            enum: ['registerNumber', 'phone', 'parentPhone', 'parentGuardianName', 'department'],
          },
          label: { type: String, required: true },
          oldValue: { type: String, default: '' },
          newValue: { type: String, default: '' },
        },
      ],
      validate: [(value) => Array.isArray(value) && value.length > 0, 'At least one change is required.'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

profileChangeRequestSchema.index({ student: 1, status: 1, createdAt: -1 });

const ProfileChangeRequest = mongoose.model('ProfileChangeRequest', profileChangeRequestSchema);

export default ProfileChangeRequest;