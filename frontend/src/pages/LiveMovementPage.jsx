import WardenLayout from '../components/WardenLayout';
import LiveMovementsView from '../components/LiveMovementsView';
import { IconHome, IconHistory, IconBuilding, IconUser, IconClock } from '../components/WardenIcons';

const rolePaths = {
  HOD: { dashboard: '/hod-dashboard', history: '/hod/history', gates: '/hod/gates' },
  Sister: { dashboard: '/sister-dashboard', history: '/sister/history', gates: '/sister/gates' },
  Warden: { dashboard: '/warden-dashboard', history: '/warden/history', gates: '/warden/gates' },
};

export default function LiveMovementPage({ role = 'Warden' }) {
  const paths = rolePaths[role] || rolePaths.Warden;
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: IconHome, path: paths.dashboard },
    { id: 'history', label: 'Outpass History', icon: IconHistory, path: paths.history },
    { id: 'gates', label: 'Gate Administration', icon: IconBuilding, path: paths.gates },
    { id: 'live', label: 'Live Movement', icon: IconClock, path: `/${role.toLowerCase()}/movement` },
    { id: 'profile', label: 'Profile', icon: IconUser, path: paths.dashboard },
  ];

  return <WardenLayout view="live" navItems={navItems}><LiveMovementsView /></WardenLayout>;
}
