'use client'

function TrendArrow({ up }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {up
        ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
        : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12"/></>
      }
    </svg>
  )
}

/**
 * StatCard — KPI tile with optional icon, trend indicator, and loading skeleton.
 *
 * Props:
 *   label       string — metric name (uppercase label style)
 *   value       string | number — primary number/text; undefined renders —
 *   icon        ReactNode — small icon displayed top-right
 *   trend       number — percent change; positive = green up, negative = red down
 *   trendLabel  string — context text after the trend value (e.g. "vs last month")
 *   loading     boolean — renders shimmer skeleton
 *   onClick     () => void — makes card clickable (adds keyboard support)
 *   color       string — accent color override, default 'var(--gold)'
 *   className   string
 *
 * Usage:
 *   <StatCard label="Active Drivers" value={42} icon={<Users size={18}/>} trend={5} trendLabel="vs last month" />
 *   <StatCard label="Payroll" value="AED 84,200" loading={loading} />
 */
export function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  loading   = false,
  onClick,
  color,
  className = '',
}) {
  const accent     = color || 'var(--gold)'
  const isClickable = Boolean(onClick)
  const hasTrend   = trend !== undefined && trend !== null

  if (loading) {
    return (
      <div className={`stat-card ${className}`} aria-busy="true" aria-label="Loading…">
        <div className="sk" style={{ height: 13, width: '55%', marginBottom: 12 }} />
        <div className="sk" style={{ height: 30, width: '40%', marginBottom: 10 }} />
        <div className="sk" style={{ height: 13, width: '60%' }} />
      </div>
    )
  }

  return (
    <div
      className={`stat-card ${className}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      style={isClickable ? { cursor: 'pointer' } : undefined}
    >
      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: 'var(--text-muted)',
        }}>
          {label}
        </span>
        {icon && (
          <span aria-hidden="true" style={{ color: accent, opacity: 0.75, flexShrink: 0, lineHeight: 1 }}>
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div style={{
        fontSize: 28, fontWeight: 700, color: 'var(--text)',
        lineHeight: 1.1, marginBottom: hasTrend ? 8 : 0,
      }}>
        {value ?? '—'}
      </div>

      {/* Trend */}
      {hasTrend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <span
            style={{
              color: trend >= 0 ? 'var(--green)' : 'var(--red)',
              display: 'flex', alignItems: 'center', gap: 3,
            }}
            aria-label={`${trend >= 0 ? 'Up' : 'Down'} ${Math.abs(trend)} percent`}
          >
            <TrendArrow up={trend >= 0} />
            {Math.abs(trend)}%
          </span>
          {trendLabel && (
            <span style={{ color: 'var(--text-muted)' }}>{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
