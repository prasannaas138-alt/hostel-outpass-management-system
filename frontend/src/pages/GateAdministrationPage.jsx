import WardenLayout from '../components/WardenLayout';
import GateQrPanel from '../components/GateQrPanel';
import {
  IconHome,
  IconHistory,
  IconBuilding,
  IconUser,
} from '../components/WardenIcons';

const rolePaths = {
  HOD: {
    dashboard: '/hod-dashboard',
    history: '/hod-dashboard',
  },
  Sister: {
    dashboard: '/sister-dashboard',
    history: '/sister-dashboard',
  },
  Warden: {
    dashboard: '/warden-dashboard',
    history: '/warden-dashboard',
  },
};

export default function GateAdministrationPage({ role = 'Warden' }) {
  const paths = rolePaths[role] || rolePaths.Warden;
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: IconHome, path: paths.dashboard },
    { id: 'history', label: 'Outpass History', icon: IconHistory, path: paths.history },
    { id: 'gates', label: 'Gate Administration', icon: IconBuilding, path: `/${role.toLowerCase()}/gates` },
    { id: 'profile', label: 'Profile', icon: IconUser, path: paths.dashboard },
  ];

  return (
    <WardenLayout view="gates" navItems={navItems}>
      <GateQrPanel allowCreate={role === 'HOD'} />
    </WardenLayout>
  );
}
