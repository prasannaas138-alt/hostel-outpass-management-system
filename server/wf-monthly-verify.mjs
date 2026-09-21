import assert from 'assert';
import {
  buildMonthRange,
  isCompletedMonth,
  monthFileName,
  formatDateForExport,
  formatTimeForExport,
} from './utils/monthRange.js';
import { EXPORT_COLUMNS, buildMonthExportRows } from './services/monthlyExportExcelService.js';

let passed = 0;
const check = (label, fn) => {
  fn();
  passed += 1;
  console.log(`PASS  ${label}`);
};

check('Excel has exactly the 10 required columns in order', () => {
  assert.deepStrictEqual(EXPORT_COLUMNS, [
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
  ]);
});

check('row mapping uses outpass + live student profile values', () => {
  const rows = buildMonthExportRows([
    {
      studentName: 'Arun Kumar',
      year: '3rd Year',
      outpassId: 'HOMS-SJU-004',
      requestType: 'Home',
      reason: 'Family function',
      date: new Date('2026-09-13T00:00:00.000Z'),
      returnDate: new Date('2026-09-15T00:00:00.000Z'),
      outTime: '08:30',
      returnTime: '16:30',
      studentId: { name: 'Arun Kumar', batch: '2024-2028', year: '3rd Year' },
    },
  ]);
  assert.deepStrictEqual(rows[0], [
    'Arun Kumar',
    '3rd Year',
    '2024-2028',
    'HOMS-SJU-004',
    'Home',
    'Family function',
    '13-09-2026',
    '15-09-2026',
    '08:30 AM',
    '04:30 PM',
  ]);
});

check('row mapping falls back to student record and midnight-safe times', () => {
  const rows = buildMonthExportRows([
    {
      date: new Date('2026-09-01T00:00:00.000Z'),
      returnDate: null,
      outTime: '23:05',
      returnTime: '00:15',
      studentId: { name: 'Bala', year: '2nd Year' },
    },
  ]);
  assert.strictEqual(rows[0][0], 'Bala');
  assert.strictEqual(rows[0][1], '2nd Year');
  assert.strictEqual(rows[0][2], '');
  assert.strictEqual(rows[0][7], '01-09-2026');
  assert.strictEqual(rows[0][8], '11:05 PM');
  assert.strictEqual(rows[0][9], '12:15 AM');
});

check('September 2026 = [2026-09-01T00:00Z, 2026-10-01T00:00Z)', () => {
  const { start, end } = buildMonthRange(2026, 9);
  assert.strictEqual(start.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.strictEqual(end.toISOString(), '2026-10-01T00:00:00.000Z');
});

check('December 2026 = [2026-12-01T00:00Z, 2027-01-01T00:00Z) year boundary', () => {
  const { start, end } = buildMonthRange(2026, 12);
  assert.strictEqual(start.toISOString(), '2026-12-01T00:00:00.000Z');
  assert.strictEqual(end.toISOString(), '2027-01-01T00:00:00.000Z');
});

check('January 2027 = [2027-01-01T00:00Z, 2027-02-01T00:00Z)', () => {
  const { start, end } = buildMonthRange(2027, 1);
  assert.strictEqual(start.toISOString(), '2027-01-01T00:00:00.000Z');
  assert.strictEqual(end.toISOString(), '2027-02-01T00:00:00.000Z');
});

const inMonth = (iso, year, month) => {
  const { start, end } = buildMonthRange(year, month);
  const value = new Date(iso).getTime();
  return value >= start.getTime() && value < end.getTime();
};

check('September range keeps August and October records out', () => {
  assert.strictEqual(inMonth('2026-08-31T00:00:00.000Z', 2026, 9), false);
  assert.strictEqual(inMonth('2026-09-01T00:00:00.000Z', 2026, 9), true);
  assert.strictEqual(inMonth('2026-09-30T00:00:00.000Z', 2026, 9), true);
  assert.strictEqual(inMonth('2026-10-01T00:00:00.000Z', 2026, 9), false);
});

check('December range keeps January 2027 out', () => {
  assert.strictEqual(inMonth('2026-11-30T00:00:00.000Z', 2026, 12), false);
  assert.strictEqual(inMonth('2026-12-31T00:00:00.000Z', 2026, 12), true);
  assert.strictEqual(inMonth('2027-01-01T00:00:00.000Z', 2026, 12), false);
  assert.strictEqual(inMonth('2027-01-01T00:00:00.000Z', 2027, 1), true);
  assert.strictEqual(inMonth('2027-02-01T00:00:00.000Z', 2027, 1), false);
});

check('running and future months are never completed', () => {
  const oct15 = new Date('2026-10-15T12:00:00.000Z');
  assert.strictEqual(isCompletedMonth(2026, 9, oct15), true);
  assert.strictEqual(isCompletedMonth(2026, 10, oct15), false);
  assert.strictEqual(isCompletedMonth(2026, 12, oct15), false);

  const jan1 = new Date('2027-01-01T00:00:00.000Z');
  assert.strictEqual(isCompletedMonth(2026, 12, jan1), true);
  assert.strictEqual(isCompletedMonth(2027, 1, jan1), false);

  const nov1 = new Date('2026-11-01T00:00:00.000Z');
  assert.strictEqual(isCompletedMonth(2026, 10, nov1), true);
});

check('file name format is Month-Year-OutpassHistory.xlsx', () => {
  assert.strictEqual(monthFileName(2026, 9), 'September-2026-OutpassHistory.xlsx');
  assert.strictEqual(monthFileName(2026, 12), 'December-2026-OutpassHistory.xlsx');
});

check('date/time export formatting', () => {
  assert.strictEqual(formatDateForExport('2026-09-13T00:00:00.000Z'), '13-09-2026');
  assert.strictEqual(formatTimeForExport('08:30'), '08:30 AM');
  assert.strictEqual(formatTimeForExport('16:30'), '04:30 PM');
  assert.strictEqual(formatTimeForExport(''), '');
});

console.log(`\n${passed} CORE CHECKS PASSED`);
