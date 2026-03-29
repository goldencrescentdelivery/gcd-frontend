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
  { label:'Overview',      href:'/dashboard/overview',          icon:'LayoutDashboard', roles:['admin'] },
  { label:'Reports',       href:'/dashboard/analytics',         icon:'BarChart3',       roles:['admin','general_manager','hr','accountant','poc'] },

  // HR items — direct (no group)
  { label:'DAs',           href:'/dashboard/hr/employees',      icon:'UserCircle',      roles:['admin','general_manager','hr','accountant'], alertKey:'employees' },
  { label:'Admins',        href:'/dashboard/hr/admins',         icon:'Shield',          roles:['admin','general_manager','hr','accountant'] },
  { label:'Attendance',    href:'/dashboard/hr/attendance',     icon:'Clock',           roles:['admin','general_manager','hr'] },
  { label:'Leaves',        href:'/dashboard/hr/leaves',         icon:'CalendarOff',     roles:['admin','general_manager','hr'], alertKey:'leaves' },
  { label:'Documents',     href:'/dashboard/hr/documents',      icon:'FileText',        roles:['admin','hr'] },
  { label:'Compliance',    href:'/dashboard/hr/compliance',     icon:'ShieldCheck',     roles:['admin','hr'] },
  { label:'User Accounts', href:'/dashboard/hr/users',          icon:'KeyRound',        roles:['admin'] },

  // Finance items — direct (no group)
  { label:'Payroll',       href:'/dashboard/finance/payroll',   icon:'Wallet',          roles:['admin','accountant'] },
  { label:'Expenses',      href:'/dashboard/finance/expenses',  icon:'Receipt',         roles:['admin','accountant'] },
  { label:'Petty Cash',    href:'/dashboard/finance/petty-cash',icon:'Banknote',        roles:['admin','accountant','general_manager','hr','poc'] },

  {
    label:'POC Station', href:'/dashboard/poc', icon:'Radio', alertKey:'poc',
    roles:['admin','general_manager','poc'],
    children:[
      { label:'Attendance', href:'/dashboard/poc?tab=attendance', icon:'Clock'                        },
      { label:'Fleet',      href:'/dashboard/poc?tab=fleet',      icon:'Truck',      alertKey:'fleet' },
      { label:'SIM Cards',  href:'/dashboard/poc?tab=sims',       icon:'Smartphone', alertKey:'sims'  },
      { label:'Leaves',     href:'/dashboard/poc?tab=leaves',     icon:'CalendarOff',alertKey:'leaves'},
      { label:'Deliveries', href:'/dashboard/poc?tab=deliveries', icon:'Package'                      },
      { label:'Notices',    href:'/dashboard/poc?tab=notices',    icon:'Bell'                         },
    ]
  },
  { label:'Backup',        href:'/dashboard/backup',            icon:'HardDrive',       roles:['admin'] },
  { label:'Settings',      href:'/dashboard/settings',          icon:'Settings',        roles:['admin','general_manager','hr','accountant','poc'] },
]