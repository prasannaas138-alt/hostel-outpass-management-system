// TEMPORARY workflow test for the new Outing/Home approval logic.
// Exercises the REAL controllers against the real DB, then cleans up.
// Run: node wf-temp-test.mjs   (from the server folder)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Outpass from './models/Outpass.js';
import User from './models/User.js';
import Notification from './models/Notification.js';
import {
  createOutpass,
  getPendingSisterRequests,
  getPendingWardenRequests,
  sisterReviewOutpass,
  wardenReviewOutpass,
  hodReviewOutpass,
} from './controllers/outpassController.js';

dotenv.config({ path: './.env' });

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ` [${extra}]` : ''}`);
};

const mockRes = () => {
  const r = { statusCode: 200, body: null };
  r.status = (code) => { r.statusCode = code; return r; };
  r.json = (body) => { r.body = body; return r; };
  return r;
};

const dayAfterTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
};

const futureWeekday = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const futureWeekend = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('DB connected');

  const TEST_EMAIL = 'wf-temp-student@homs-test.local';
  const old = await User.findOne({ email: TEST_EMAIL });
  if (old) {
    await Outpass.deleteMany({ studentId: old._id });
    await User.deleteOne({ _id: old._id });
  }

  const student = await User.create({
    name: 'WF Temp Student',
    email: TEST_EMAIL,
    password: 'TempPass123!',
    registerNumber: 'WFT001',
    roomNumber: 'T100',
    phone: '9000000001',
    parentPhone: '9000000002',
    hostelName: 'St. Joseph University Boys Hostel',
    department: 'CSE',
    year: '2',
    role: 'Student',
  });

  const staffId = new mongoose.Types.ObjectId();
  const studentReq = { user: { ...student.toObject(), _id: student._id, role: 'Student' } };
  const sisterReq = { user: { _id: staffId, role: 'Sister' } };
  const hodReq = { user: { _id: staffId, role: 'HOD' } };
  const wardenReq = { user: { _id: staffId, role: 'Warden' } };
  const noop = () => {};

  // ---- 1. Outing on a WEEKDAY (was forbidden before) ----
  let res = mockRes();
  await createOutpass(
    { ...studentReq, body: { requestType: 'Outing', date: futureWeekday(), returnDate: dayAfterTomorrow(), outTime: '09:00', returnTime: '18:00', reason: 'weekday outing test' } },
    res,
    noop,
  );
  check('Outing created on WEEKDAY', res.statusCode === 201, `status ${res.statusCode}`);
  const outingWeekday = res.body;
  check('Outing skips HOD', outingWeekday.hodStatus === 'NotRequired', String(outingWeekday.hodStatus));
  check('Outing starts at Sister', outingWeekday.sisterStatus === 'Pending', String(outingWeekday.sisterStatus));
  check('Outing waits for Warden', outingWeekday.wardenStatus === 'Pending', String(outingWeekday.wardenStatus));

  // ---- 2. Outing on a WEEKEND still allowed ----
  res = mockRes();
  await createOutpass(
    { ...studentReq, body: { requestType: 'Outing', date: futureWeekend(), returnDate: futureWeekend(), outTime: '10:00', returnTime: '17:00', reason: 'weekend outing test' } },
    res,
    noop,
  );
  check('Outing created on WEEKEND', res.statusCode === 201, `status ${res.statusCode}`);
  const outingWeekend = res.body;

  // ---- 3. Sister sees the Outing ----
  res = mockRes();
  await getPendingSisterRequests(sisterReq, res, noop);
  const sisterList = Array.isArray(res.body) ? res.body : [];
  check('Sister queue contains Outing', sisterList.some((o) => String(o._id) === String(outingWeekday._id)));

  // ---- 4. HOD does NOT receive Outing (HOD queue is Home-only) ----
  const outingAsHome = await Outpass.countDocuments({ _id: outingWeekday._id, requestType: 'Home' });
  check('Outing is not a Home request (HOD queue is Home-only)', outingAsHome === 0);

  // ---- 5. Warden sees the Outing immediately (Sister NOT approved) ----
  res = mockRes();
  await getPendingWardenRequests(wardenReq, res, noop);
  const wardenList = Array.isArray(res.body) ? res.body : [];
  check('Warden queue contains Outing immediately', wardenList.some((o) => String(o._id) === String(outingWeekday._id)));
  const wardenItem = wardenList.find((o) => String(o._id) === String(outingWeekday._id));
  check('Warden sees Sister - NOT APPROVED (indicator data)', wardenItem && wardenItem.sisterStatus === 'Pending', wardenItem && String(wardenItem.sisterStatus));

  // ---- 6. Warden override: approve Outing BEFORE Sister approves ----
  res = mockRes();
  await wardenReviewOutpass({ ...wardenReq, params: { id: outingWeekday._id }, body: { action: 'approve' } }, res, noop);
  check('Warden override approves Outing without Sister', res.statusCode === 200 && res.body.status === 'Approved', `status ${res.statusCode}`);

  // ---- 7. Sister rejects a fresh Outing -> Warden cannot act ----
  res = mockRes();
  await sisterReviewOutpass({ ...sisterReq, params: { id: outingWeekend._id }, body: { action: 'reject', rejectionReason: 'sister said no' } }, res, noop);
  check('Sister can reject Outing', res.statusCode === 200 && res.body.status === 'Rejected', `status ${res.statusCode}`);
  res = mockRes();
  await wardenReviewOutpass({ ...wardenReq, params: { id: outingWeekend._id }, body: { action: 'approve' } }, res, noop);
  check('Warden cannot act after Sister rejection', res.statusCode === 400, `status ${res.statusCode}`);

  // ---- 8. Home: Warden + Sister blocked before HOD ----
  res = mockRes();
  await createOutpass(
    { ...studentReq, body: { requestType: 'Home', date: futureWeekday(), returnDate: dayAfterTomorrow(), outTime: '09:00', returnTime: '18:00', reason: 'home test' } },
    res,
    noop,
  );
  const home = res.body;
  check('Home created (weekday)', res.statusCode === 201);
  res = mockRes();
  await wardenReviewOutpass({ ...wardenReq, params: { id: home._id }, body: { action: 'approve' } }, res, noop);
  check('Warden BLOCKED on Home before HOD+Sister', res.statusCode === 400, `status ${res.statusCode}`);
  res = mockRes();
  await sisterReviewOutpass({ ...sisterReq, params: { id: home._id }, body: { action: 'approve' } }, res, noop);
  check('Sister BLOCKED on Home before HOD', res.statusCode === 400, `status ${res.statusCode}`);

  // ---- 9. Full Home chain: HOD -> Sister -> Warden ----
  res = mockRes();
  await hodReviewOutpass({ ...hodReq, params: { id: home._id }, body: { action: 'approve' } }, res, noop);
  check('HOD approves Home', res.statusCode === 200 && res.body.hodStatus === 'Approved');
  res = mockRes();
  await sisterReviewOutpass({ ...sisterReq, params: { id: home._id }, body: { action: 'approve' } }, res, noop);
  check('Sister approves Home after HOD', res.statusCode === 200 && res.body.sisterStatus === 'Approved');
  res = mockRes();
  await getPendingWardenRequests(wardenReq, res, noop);
  const wList2 = Array.isArray(res.body) ? res.body : [];
  check('Warden sees Home (HOD+Sister approved)', wList2.some((o) => String(o._id) === String(home._id)));
  res = mockRes();
  await wardenReviewOutpass({ ...wardenReq, params: { id: home._id }, body: { action: 'approve' } }, res, noop);
  check('Warden approves Home (final)', res.statusCode === 200 && res.body.status === 'Approved' && res.body.wardenStatus === 'Approved');

  // ---- Cleanup ----
  const ids = [outingWeekday._id, outingWeekend._id, home._id].filter(Boolean);
  await Notification.deleteMany({ outpass: { $in: ids } });
  await Outpass.deleteMany({ _id: { $in: ids } });
  await User.deleteOne({ _id: student._id });
  console.log('Cleanup done');

  const failed = results.filter((r) => !r.ok);
  console.log(`SUMMARY: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
};

run().catch((error) => {
  console.error('TEST-RUN-ERROR', error && error.message);
  process.exit(1);
});
