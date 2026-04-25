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
  { label:'Reports',  href:'/dashboard/analytics', icon:'BarChart3',      roles:['admin','general_manager','hr','accountant','poc'] },

  // ── Office ────────────────────────────────────────────────────
  { type:'section', label:'Office', roles:['admin','general_manager','hr','accountant'] },
  { label:'Office Profile', href:'/dashboard/office', icon:'Building2', roles:['admin','general_manager','hr','accountant'] },

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
  {
    label:'POC Station', href:'/dashboard/poc', icon:'Radio', alertKey:'poc',
    roles:['admin','general_manager','poc'],
    children:[
      { label:'Attendance', href:'/dashboard/poc?tab=attendance', icon:'Clock'                        },
      { label:'DAs',        href:'/dashboard/poc?tab=das',        icon:'UserCircle'                   },
      { label:'Fleet',      href:'/dashboard/poc?tab=fleet',      icon:'Truck',      alertKey:'fleet' },
      { label:'Deliveries', href:'/dashboard/poc?tab=deliveries', icon:'Package'                      },
      { label:'Handovers',  href:'/dashboard/poc?tab=handovers',  icon:'Zap'                         },
      { label:'SIM Cards',  href:'/dashboard/poc?tab=sims',       icon:'Smartphone', alertKey:'sims'  },
      { label:'Leaves',     href:'/dashboard/poc?tab=leaves',     icon:'CalendarOff', alertKey:'leaves' },
      { label:'Notices',    href:'/dashboard/poc?tab=notices',    icon:'Bell'                         },
    ]
  },

  // ── System ────────────────────────────────────────────────────
  { type:'section', label:'System', roles:['admin'] },
  { label:'Backup',   href:'/dashboard/backup',   icon:'HardDrive', roles:['admin'] },
  { label:'Settings', href:'/dashboard/settings', icon:'Settings',  roles:['admin','general_manager','hr','accountant','poc'] },
]