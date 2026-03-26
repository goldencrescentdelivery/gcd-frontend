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
  {
    label:'Overview', href:'/dashboard/overview', icon:'LayoutDashboard',
    roles:['admin','general_manager','hr','accountant','poc']
  },
  {
    label:'Reports', href:'/dashboard/analytics', icon:'BarChart3',
    roles:['admin','general_manager','hr','accountant','poc']
  },
  {
    label:'HR & Staff', href:'/dashboard/hr', icon:'Users', alertKey:'hr',
    roles:['admin','general_manager','hr'],
    children:[
      { label:'Employees',     href:'/dashboard/hr/employees',   icon:'UserCircle',  alertKey:'employees' },
      { label:'Attendance',    href:'/dashboard/hr/attendance',  icon:'Clock'      },
      { label:'Leaves',        href:'/dashboard/hr/leaves',      icon:'CalendarOff', alertKey:'leaves'    },
      { label:'Documents',     href:'/dashboard/hr/documents',   icon:'FileText'   },
      { label:'Compliance',    href:'/dashboard/hr/compliance',  icon:'ShieldCheck'},
      { label:'User Accounts', href:'/dashboard/hr/users',       icon:'KeyRound',  roles:['admin'] }]
  },
  {
    label:'Finance', href:'/dashboard/finance', icon:'DollarSign',
    roles:['admin','accountant'],
    children:[
      { label:'Payroll',  href:'/dashboard/finance/payroll',  icon:'Wallet'  },
      { label:'Expenses', href:'/dashboard/finance/expenses', icon:'Receipt' }]
  },
  {
    label:'POC Station', href:'/dashboard/poc', icon:'Radio', alertKey:'poc',
    roles:['admin','general_manager','poc'],
    children:[
      { label:'Fleet',     href:'/dashboard/poc?tab=fleet',  icon:'Truck',       alertKey:'fleet'  },
      { label:'SIM Cards', href:'/dashboard/poc?tab=sims',   icon:'Smartphone',  alertKey:'sims'   },
      { label:'Leaves',    href:'/dashboard/poc?tab=leaves', icon:'CalendarOff', alertKey:'leaves' },
    ]
  },
  {
    label:'Backup', href:'/dashboard/backup', icon:'HardDrive',
    roles:['admin']
  },
  {
    label:'Settings', href:'/dashboard/settings', icon:'Settings',
    roles:['admin','general_manager','hr','accountant','poc']
  }]