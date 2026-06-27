import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
  {
    id: 1,
    label: 'Overview',
    isTitle: true,
  },
  {
    id: 2,
    label: 'Dashboard',
    icon: 'ri-dashboard-2-line',
    link: '/portal/dashboard',
  },
  {
    id: 10,
    label: 'Operations',
    isTitle: true,
  },
  {
    id: 11,
    label: 'Merchants',
    icon: 'ri-store-line',
    link: '/portal/merchants',
  },
  {
    id: 12,
    label: 'Payments',
    icon: 'ri-secure-payment-line',
    link: '/portal/payments',
  },
  {
    id: 14,
    label: 'Payment Links',
    icon: 'ri-links-line',
    link: '/portal/payment-links',
  },
  {
    id: 15,
    label: 'CPS Batches',
    icon: 'ri-file-list-3-line',
    link: '/portal/cps-batches',
  },
  {
    id: 13,
    label: 'Approvals',
    icon: 'ri-check-double-line',
    link: '/portal/approvals',
  },
  {
    id: 20,
    label: 'Admin',
    isTitle: true,
  },
  {
    id: 21,
    label: 'Users',
    icon: 'ri-team-line',
    link: '/portal/users',
  },
  {
    id: 22,
    label: 'Roles & Permissions',
    icon: 'ri-shield-keyhole-line',
    link: '/portal/roles',
  },
];
