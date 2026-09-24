import WardenLayout from '../components/WardenLayout';
import RoleOutpassHistory from '../components/RoleOutpassHistory';
import {
  IconHome,
  IconHistory,
  IconBuilding,
  IconUser,
} from '../components/WardenIcons';

const rolePaths = {
  HOD: {
    dashboard: '/hod-dashboard',
    history: '/hod/history',
    gates: '/hod/gates',
  },
  Sister: {
    dashboard: '/sister-dashboard',
    history: '/sister/history',
    gates: '/sister/gates',
  },
  Warden: {
    dashboard: '/warden-dashboard',
    history: '/warden/history',
    gates: '/warden/gates',
  },
};

export default function OutpassHistoryPage({ role = 'Warden' }) {
  const paths = rolePaths[role] || rolePaths.Warden;
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: IconHome, path: paths.dashboard },
    { id: 'history', label: 'Outpass History', icon: IconHistory, path: paths.history },
    { id: 'gates', label: 'Gate Administration', icon: IconBuilding, path: paths.gates },
    { id: 'profile', label: 'Profile', icon: IconUser, path: paths.dashboard },
  ];

  return (
    <WardenLayout view="history" navItems={navItems}>
      <RoleOutpassHistory
        id={`${role.toLowerCase()}-history`}
        endpoint={`/outpasses/history/${role.toLowerCase()}`}
      />
    </WardenLayout>
  );
}
