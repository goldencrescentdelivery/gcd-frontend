export const GOLD       = '#B8860B'
export const GOLD_LIGHT = '#D4A017'

export const NAV = [
  { label:'Analytics',   href:'/dashboard/analytics',  icon:'BarChart3',   roles:['admin','manager','finance'] },
  { label:'HR & Staff',  href:'/dashboard/hr',          icon:'Users',       roles:['admin','manager','hr'],
    children:[
      { label:'Employees',   href:'/dashboard/hr/employees',   icon:'UserCircle'  },
      { label:'Attendance',  href:'/dashboard/hr/attendance',  icon:'Clock'       },
      { label:'Leaves',      href:'/dashboard/hr/leaves',      icon:'CalendarOff' },
      { label:'Documents',   href:'/dashboard/hr/documents',   icon:'FileText'    },
      { label:'Compliance',  href:'/dashboard/hr/compliance',  icon:'ShieldCheck' },
      { label:'User Accounts', href:'/dashboard/hr/users',     icon:'KeyRound'    },
    ]
  },
  { label:'Finance',     href:'/dashboard/finance',     icon:'DollarSign',  roles:['admin','manager','finance'],
    children:[
      { label:'Payroll',  href:'/dashboard/finance/payroll',  icon:'Wallet'  },
      { label:'Expenses', href:'/dashboard/finance/expenses', icon:'Receipt' },
    ]
  },
  { label:'POC Station', href:'/dashboard/poc',          icon:'Radio',       roles:['admin','manager','poc'] },
  { label:'Backup',      href:'/dashboard/backup',       icon:'HardDrive',   roles:['admin'] },
]
