export const GOLD       = '#B8860B'
export const GOLD_LIGHT = '#D4A017'

// Role display names
export const ROLE_LABELS = {
  admin:           'Admin',
  general_manager: 'Manager',
  hr:              'HR',
  accountant:      'Accountant',
  poc:             'POC',
  driver:          'Driver',
}

export const NAV = [
  { label:'Overview', href:'/dashboard/overview', icon:'LayoutDashboard', roles:['admin'] },
  { label:'Reports',  href:'/dashboard/analytics', icon:'BarChart3',      roles:['admin','general_manager','hr','accountant'] },

  // ── Office ────────────────────────────────────────────────────
  { type:'section', label:'Office', roles:['admin','general_manager','hr','accountant'] },
  { label:'Office Profile', href:'/dashboard/office',         icon:'Building2',  roles:['admin','general_manager','hr','accountant'] },
  { label:'Letters',        href:'/dashboard/office/letters', icon:'ScrollText', roles:['admin','general_manager','hr','accountant'] },

  // ── HR Management ─────────────────────────────────────────────
  { type:'section', label:'HR Management', roles:['admin','general_manager','hr','accountant'] },
  { label:'DAs',          href:'/dashboard/hr/employees',  icon:'UserCircle',  roles:['admin','general_manager','hr','accountant'], alertKey:'employees' },
  { label:'Admins',       href:'/dashboard/hr/admins',     icon:'Shield',      roles:['admin','general_manager','hr','accountant'] },
  { label:'Attendance',   href:'/dashboard/hr/attendance', icon:'Clock',       roles:['admin','general_manager','hr'] },
  { label:'Leaves',       href:'/dashboard/hr/leaves',     icon:'CalendarOff', roles:['admin','general_manager','hr'], alertKey:'leaves' },
  { label:'Documents',    href:'/dashboard/hr/documents',  icon:'FileText',    roles:['admin','hr'] },
  { label:'Compliance',          href:'/dashboard/hr/compliance',          icon:'ShieldCheck',    roles:['admin','hr'] },
  { label:'Vehicle Inspections', href:'/dashboard/hr/vehicle-inspection', icon:'ClipboardCheck', roles:['admin','general_manager','hr'] },
  { label:'User Accounts',href:'/dashboard/hr/users',      icon:'KeyRound',    roles:['admin'] },

  // ── Finance ───────────────────────────────────────────────────
  { type:'section', label:'Finance', roles:['admin','accountant','general_manager','hr','poc'] },
  { label:'Payroll',    href:'/dashboard/finance/payroll',    icon:'Wallet',   roles:['admin','accountant'] },
  { label:'Expenses',   href:'/dashboard/finance/expenses',   icon:'Receipt',  roles:['admin','accountant'] },
  { label:'Petty Cash', href:'/dashboard/finance/petty-cash', icon:'Banknote', roles:['admin','accountant','general_manager','hr','poc'] },

  // ── Operations ────────────────────────────────────────────────
  { type:'section', label:'Operations', roles:['admin','general_manager','poc','manager'] },
  { label:'Vehicle Handovers', href:'/dashboard/poc/handovers', icon:'ArrowLeftRight', roles:['admin','general_manager','manager','poc'] },
  { label:'Attendance',  href:'/dashboard/poc/attendance', icon:'Clock',          roles:['admin','general_manager','poc'] },
  { label:'DAs',         href:'/dashboard/poc/das',        icon:'UserCircle',     roles:['admin','general_manager','poc'] },
  { label:'Fleet',       href:'/dashboard/poc/fleet',      icon:'Truck',          roles:['admin','general_manager','poc'], alertKey:'fleet' },
  { label:'Deliveries',  href:'/dashboard/poc/deliveries', icon:'Package',        roles:['admin','general_manager','poc'] },
  { label:'SIM Cards',   href:'/dashboard/poc/sims',       icon:'Smartphone',     roles:['admin','general_manager','poc'], alertKey:'sims'  },
  { label:'Leaves',      href:'/dashboard/poc/leaves',     icon:'CalendarOff',    roles:['admin','general_manager','poc'], alertKey:'leaves' },
  { label:'Notices',     href:'/dashboard/poc/notices',    icon:'Bell',           roles:['admin','general_manager','poc'] },

  // ── System ────────────────────────────────────────────────────
  { type:'section', label:'System', roles:['admin'] },
  { label:'Backup',   href:'/dashboard/backup',   icon:'HardDrive', roles:['admin'] },
  { label:'Settings', href:'/dashboard/settings', icon:'Settings',  roles:['admin','general_manager','hr','accountant','poc'] },
]