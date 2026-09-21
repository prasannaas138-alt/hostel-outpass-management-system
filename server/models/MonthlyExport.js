import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// MonthlyExport = metadata ONLY (division "A" of the HOD monthly workflow).
//
// It records that an Excel export for a completed month was generated, plus
// who generated it and how many outpasses it contained. It holds NO outpass
// history itself.
//
// The HOD "Delete" action removes the REAL Outpass documents from the
// `outpasses` collection (see server/db/monthlyExportDeleteService.js) and, as
// a harmless follow-up, this month's export record too. Deleting this document
// alone would never be considered a completed deletion.
// ---------------------------------------------------------------------------
const monthlyExportSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    rowCount: {
      type: Number,
      default: 0,
    },
    exportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One export record per month: re-downloading refreshes the same document.
monthlyExportSchema.index({ year: 1, month: 1 }, { unique: true });

const MonthlyExport = mongoose.model('MonthlyExport', monthlyExportSchema);

export default MonthlyExport;
