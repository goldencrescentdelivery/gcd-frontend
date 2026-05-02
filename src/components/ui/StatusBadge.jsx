'use client'
import { Badge } from './Badge'

// Central registry: every status string used anywhere in the app maps to
// one variant + display label. Add new statuses here — nowhere else.
const STATUS_MAP = {
  // ── Generic lifecycle ──────────────────────────────────────────
  active:      { variant: 'success', label: 'Active'      },
  inactive:    { variant: 'neutral', label: 'Inactive'    },

  // ── Approval pipeline ─────────────────────────────────────────
  approved:    { variant: 'success', label: 'Approved'    },
  rejected:    { variant: 'danger',  label: 'Rejected'    },
  pending:     { variant: 'warning', label: 'Pending'     },
  waiting:     { variant: 'neutral', label: 'Waiting'     },
  completed:   { variant: 'success', label: 'Completed'   },
  cancelled:   { variant: 'neutral', label: 'Cancelled'   },

  // ── Payroll ───────────────────────────────────────────────────
  paid:        { variant: 'success', label: 'Paid'        },
  unpaid:      { variant: 'warning', label: 'Unpaid'      },

  // ── Attendance ────────────────────────────────────────────────
  present:     { variant: 'success', label: 'Present'     },
  absent:      { variant: 'danger',  label: 'Absent'      },
  leave:       { variant: 'info',    label: 'On Leave'    },

  // ── Document / compliance ─────────────────────────────────────
  valid:       { variant: 'success', label: 'Valid'       },
  expiring:    { variant: 'warning', label: 'Expiring'    },
  expired:     { variant: 'danger',  label: 'Expired'     },
  critical:    { variant: 'danger',  label: 'Critical'    },
  warning:     { variant: 'warning', label: 'Warning'     },

  // ── Fleet & SIM cards ─────────────────────────────────────────
  available:   { variant: 'success', label: 'Available'   },
  assigned:    { variant: 'info',    label: 'Assigned'    },
  grounded:    { variant: 'danger',  label: 'Grounded'    },
  maintenance: { variant: 'warning', label: 'Maintenance' },
  damaged:     { variant: 'danger',  label: 'Damaged'     },
  lost:        { variant: 'danger',  label: 'Lost'        },

  // ── Tasks ─────────────────────────────────────────────────────
  'in-progress': { variant: 'info',    label: 'In Progress' },
  overdue:       { variant: 'danger',  label: 'Overdue'     },
  'on-hold':     { variant: 'neutral', label: 'On Hold'     },

  // ── Workflow stages ───────────────────────────────────────────
  poc_approved:  { variant: 'info',    label: 'POC ✓'       },
  mgr_approved:  { variant: 'purple',  label: 'Mgr ✓'       },
  final:         { variant: 'success', label: 'Final ✓'     },
}

/**
 * StatusBadge — converts raw status strings to correctly colored Badge.
 *
 * Centralises all status → color decisions; pages never need to know
 * which variant maps to which string.
 *
 * Props:
 *   status   string — raw status value from the API (case-insensitive)
 *   label    string — override the display text while keeping the variant
 *   dot      boolean — show colored dot before label
 *   className string
 *
 * Usage:
 *   <StatusBadge status={leave.status} />
 *   <StatusBadge status="approved" label="POC Approved" />
 *   <StatusBadge status={employee.status} dot />
 */
export function StatusBadge({ status, label: labelOverride, dot = false, className = '' }) {
  const key     = String(status ?? '').toLowerCase().trim()
  const mapping = STATUS_MAP[key] ?? { variant: 'neutral', label: status ?? '—' }

  return (
    <Badge variant={mapping.variant} dot={dot} className={className}>
      {labelOverride ?? mapping.label}
    </Badge>
  )
}
