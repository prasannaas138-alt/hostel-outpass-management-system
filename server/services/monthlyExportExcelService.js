import Outpass from '../models/Outpass.js';
import MonthlyExport from '../models/MonthlyExport.js';
import { buildXlsxBuffer } from '../utils/xlsx.js';
import {
  buildMonthRange,
  formatDateForExport,
  formatTimeForExport,
  isCompletedMonth,
  isValidMonth,
  monthFileName,
  monthLabel,
} from '../utils/monthRange.js';

// The exported workbook contains EXACTLY these columns, in this order.
export const EXPORT_COLUMNS = [
  'Student Name',
  'Year',
  'Batch',
  'Outpass ID',
  'Request Type',
  'Reason',
  'Out Date',
  'Return Date',
  'Out Time',
  'Return Time',
];

const EXPORT_COLUMN_WIDTHS = [26, 12, 14, 16, 14, 36, 14, 14, 12, 12];

// Live student profile fields used to fill Year / Batch so the archive always
// matches the current student records (never a hardcoded value).
const STUDENT_POPULATE =
  'name registerNumber roomNumber phone parentPhone parentGuardianName hostelName department year batch';

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

/** Maps outpass documents to the fixed 10-column export rows. */
export const buildMonthExportRows = (outpasses) =>
  outpasses.map((outpass) => {
    const student = outpass.studentId || {};
    return [
      outpass.studentName || student.name || '',
      outpass.year || student.year || '',
      student.batch || '',
      outpass.outpassId || '',
      outpass.requestType || '',
      outpass.reason || '',
      formatDateForExport(outpass.date),
      formatDateForExport(outpass.returnDate || outpass.date),
      formatTimeForExport(outpass.outTime),
      formatTimeForExport(outpass.returnTime),
    ];
  });

const loadMonthOutpasses = async (year, month) => {
  if (!isValidMonth(year, month)) {
    throw badRequest('Invalid year or month. Provide a year and a month between 1 and 12.');
  }

  if (!isCompletedMonth(year, month)) {
    throw badRequest(
      `${monthLabel(
        year,
        month
      )} is not a completed month yet. Only months that have fully ended can be exported.`
    );
  }

  const { start, end } = buildMonthRange(year, month);

  return Outpass.find({ date: { $gte: start, $lt: end } })
    .sort({ date: 1, createdAt: 1 })
    .populate('studentId', STUDENT_POPULATE)
    .lean();
};

/**
 * Builds the real spreadsheet for one completed month.
 *
 * An empty month still produces a valid workbook containing the header row and
 * no data rows, so Download never errors on a month without outpasses.
 */
export const buildMonthlyExport = async (year, month, actingUserId = null) => {
  const outpasses = await loadMonthOutpasses(year, month);
  const fileName = monthFileName(year, month);

  const buffer = buildXlsxBuffer({
    sheetName: monthLabel(year, month),
    rows: [EXPORT_COLUMNS, ...buildMonthExportRows(outpasses)],
    columnWidths: EXPORT_COLUMN_WIDTHS,
  });

  // Metadata only: records that this month was exported, and by whom.
  await MonthlyExport.findOneAndUpdate(
    { year, month },
    {
      $set: {
        fileName,
        rowCount: outpasses.length,
        exportedBy: actingUserId || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    fileName,
    buffer,
    rowCount: outpasses.length,
    label: monthLabel(year, month),
    year,
    month,
  };
};

export default buildMonthlyExport;
