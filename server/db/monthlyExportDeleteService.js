import Outpass from '../models/Outpass.js';
import MonthlyExport from '../models/MonthlyExport.js';
import {
  buildMonthRange,
  isCompletedMonth,
  isValidMonth,
  monthLabel,
} from '../utils/monthRange.js';

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

/**
 * Permanently deletes the REAL outpass history for one completed month.
 *
 * What it deletes (MongoDB):
 *   - `outpasses`  -> every Outpass document whose `date` falls inside the
 *                     selected month (the actual history records).
 *   - `monthlyexports` -> the export metadata row for that same month, which
 *                     is meaningless once its history is gone.
 *
 * What it NEVER touches:
 *   - `users`            (student / HOD / Sister / Warden accounts and profiles)
 *   - `outpassidcounters` (the HOMS-SJU-nnn sequence keeps its position, so the
 *                          next outpass continues after the last issued ID)
 *   - `profilechangerequests`, `notifications`, any other collection
 *   - outpasses from any other month
 *
 * The query is strictly scoped by BOTH year and month through a half-open UTC
 * range [startOfMonth, startOfNextMonth), so a neighbouring month can never be
 * caught, and December -> January year boundaries behave correctly.
 */
export const deleteMonthOutpasses = async (year, month, actingUserId = null) => {
  if (!isValidMonth(year, month)) {
    throw badRequest('Invalid year or month. Provide a year and a month between 1 and 12.');
  }

  if (!isCompletedMonth(year, month)) {
    throw badRequest(
      `${monthLabel(
        year,
        month
      )} is not a completed month yet. Only months that have fully ended can be exported or deleted.`
    );
  }

  const { start, end } = buildMonthRange(year, month);

  // The ONLY history deletion. No cascade hooks exist on the Outpass model
  // (its only hook is a pre-validate hook for ID assignment), so deleting
  // outpasses cannot remove users or any other collection.
  const result = await Outpass.deleteMany({
    date: { $gte: start, $lt: end },
  });

  await MonthlyExport.deleteMany({ year, month });

  return {
    year,
    month,
    label: monthLabel(year, month),
    deletedCount: result?.deletedCount || 0,
    range: {
      from: start.toISOString(),
      to: end.toISOString(),
    },
    deletedBy: actingUserId || null,
  };
};

/**
 * Read-only safety preview: how many real outpass documents the delete would
 * remove. Used by the API so the HOD sees the true count before confirming.
 */
export const countMonthOutpasses = async (year, month) => {
  if (!isValidMonth(year, month)) {
    throw badRequest('Invalid year or month.');
  }

  const { start, end } = buildMonthRange(year, month);
  const count = await Outpass.countDocuments({ date: { $gte: start, $lt: end } });

  return { year, month, label: monthLabel(year, month), count };
};

export default deleteMonthOutpasses;
