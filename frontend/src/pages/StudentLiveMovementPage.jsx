import StudentLayout from '../components/StudentLayout';
import LiveMovementsView from '../components/LiveMovementsView';

/**
 * Student-facing Live Movement page.
 *
 * Reuses the existing Live Movement view (same design, date picker and realtime
 * socket used by HOD / Sister / Warden) with `role="Student"`, so:
 *  - the snapshot comes from the student-scoped endpoint (own movements only),
 *  - the Report column is read-only (no edit control, no staff actions).
 */
export default function StudentLiveMovementPage() {
  return (
    <StudentLayout
      title="Live Movement"
      subtitle="Track your own gate exits and returns in real time."
    >
      <LiveMovementsView role="Student" />
    </StudentLayout>
  );
}
