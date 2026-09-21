import Outpass from '../models/Outpass.js';
import MonthlyExport from '../models/MonthlyExport.js';
import { buildMonthlyExport } from '../services/monthlyExportExcelService.js';
import { deleteMonthOutpasses } from '../db/monthlyExportDeleteService.js';
import {
  isCompletedMonth,
  isValidMonth,
  monthFileName,
  monthLabel,
} from '../utils/monthRange.js';

const parsePeriod = (req) => {
  const year = Number(req.params.year);
  const month = Number(req.params.month);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return { error: 'Invalid month selection.' };
  }

  if (!isValidMonth(year, month)) {
    return { error: 'Invalid year or month. Provide a year and a month between 1 and 12.' };
  }

  return { year, month };
};

// Shifts a (year, month) pair by a delta of months, so rolling windows and
// December -> January year boundaries need no special-casing.
const shiftMonth = (year, month, delta) => {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

/**
 * GET /api/monthly-outpasses
 * Completed months only (the running month and future months are excluded),
 * newest first, each with its real outpass count from the `outpasses`
 * collection plus the date it was last exported.
 */
export const getMonthlyOverview = async (req, res, next) => {
  try {
    const grouped = await Outpass.aggregate([
      { $match: { date: { $type: 'date' } } },
      {
        $group: {
          _id: {
            year: { $year: { date: '$date', timezone: 'UTC' } },
            month: { $month: { date: '$date', timezone: 'UTC' } },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const countByKey = new Map(
      grouped.map((entry) => [`${entry._id.year}-${entry._id.month}`, entry.count])
    );

    const now = new Date();
    const previousMonth = shiftMonth(now.getUTCFullYear(), now.getUTCMonth() + 1, -1);

    // The oldest month that actually holds data decides how far back the list
    // goes; with no data at all, the last 12 completed months are offered.
    let oldest = shiftMonth(previousMonth.year, previousMonth.month, -11);
    if (countByKey.size) {
      const keys = [...countByKey.keys()].sort((left, right) => {
        const [leftYear, leftMonth] = left.split('-').map(Number);
        const [rightYear, rightMonth] = right.split('-').map(Number);
        return leftYear - rightYear || leftMonth - rightMonth;
      });
      const [oldestYear, oldestMonth] = keys[0].split('-').map(Number);
      if (oldestYear * 12 + oldestMonth < oldest.year * 12 + oldest.month) {
        oldest = { year: oldestYear, month: oldestMonth };
      }
    }

    const exports = await MonthlyExport.find({}).lean();
    const exportByKey = new Map(
      exports.map((entry) => [
        `${entry.year}-${entry.month}`,
        { exportedAt: entry.updatedAt || entry.createdAt || null },
      ])
    );

    const months = [];
    let cursor = { ...previousMonth };
    const oldestIndex = oldest.year * 12 + oldest.month;
    let guard = 0;

    while (cursor.year * 12 + cursor.month >= oldestIndex && guard < 240) {
      const key = `${cursor.year}-${cursor.month}`;
      if (isCompletedMonth(cursor.year, cursor.month, now)) {
        months.push({
          year: cursor.year,
          month: cursor.month,
          label: monthLabel(cursor.year, cursor.month),
          fileName: monthFileName(cursor.year, cursor.month),
          count: countByKey.get(key) || 0,
          exportedAt: exportByKey.get(key)?.exportedAt || null,
        });
      }
      cursor = shiftMonth(cursor.year, cursor.month, -1);
      guard += 1;
    }

    return res.json({
      months,
      totalMonths: months.length,
      currentMonth: monthLabel(now.getUTCFullYear(), now.getUTCMonth() + 1),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/monthly-outpasses/:year/:month/download
 * Streams one completed month of REAL outpass data as .xlsx
 * (e.g. September-2026-OutpassHistory.xlsx).
 */
export const downloadMonthlyExcel = async (req, res, next) => {
  try {
    const period = parsePeriod(req);
    if (period.error) {
      return res.status(400).json({ message: period.error });
    }

    const { year, month } = period;
    const { buffer, fileName } = await buildMonthlyExport(year, month, req.user?._id || null);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).end(buffer);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
};

/**
 * DELETE /api/monthly-outpasses/:year/:month
 * HOD-only. Permanently deletes ONLY the selected completed month's real
 * Outpass documents from the `outpasses` collection. Users, the Outpass ID
 * counter and every other collection are left untouched.
 */
export const deleteMonthlyOutpasses = async (req, res, next) => {
  try {
    const period = parsePeriod(req);
    if (period.error) {
      return res.status(400).json({ message: period.error });
    }

    const { year, month } = period;
    const result = await deleteMonthOutpasses(year, month, req.user?._id || null);

    return res.json({
      message: result.deletedCount
        ? `${result.deletedCount} outpass record(s) from ${result.label} were deleted permanently.`
        : `No outpass records existed for ${result.label}. Nothing was deleted.`,
      deletedCount: result.deletedCount,
      label: result.label,
      year: result.year,
      month: result.month,
      range: result.range,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
};
