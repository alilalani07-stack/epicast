import {
  LayoutDashboard,
  Map as MapIcon,
  FileText,
  ShieldAlert,
  Flame,
  TrendingUp,
  Bell,
  Settings,
  FilePlus,
  Skull,
  History,
  UserCircle,
} from 'lucide-react';

export const AUTHORITY_NAV = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', to: '/authority/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Intelligence',
    items: [
      { label: 'Risk Zones', to: '/authority/risk-zones', icon: ShieldAlert },
      { label: 'Hotspots', to: '/authority/hotspots', icon: Flame },
      { label: 'Forecasting', to: '/authority/forecasting', icon: TrendingUp },
    ],
  },
  {
    section: 'Operations',
    items: [
      { label: 'Reports', to: '/authority/reports', icon: FileText },
      { label: 'Areas', to: '/authority/areas', icon: MapIcon },
      { label: 'Alerts', to: '/authority/alerts', icon: Bell, badge: 'new' },
    ],
  },
  {
    section: 'Account',
    items: [
      { label: 'Settings', to: '/authority/settings', icon: Settings },
    ],
  },
];

export const CLINIC_NAV = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', to: '/clinic/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Submit',
    items: [
      { label: 'Case Report', to: '/clinic/submit-case', icon: FilePlus },
      { label: 'Death Report', to: '/clinic/submit-death', icon: Skull },
    ],
  },
  {
    section: 'Records',
    items: [
      { label: 'History', to: '/clinic/history', icon: History },
      { label: 'Profile', to: '/clinic/profile', icon: UserCircle },
    ],
  },
];
