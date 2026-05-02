'use client'

// Variant → CSS class mapping. purple + neutral use inline tokens because
// they don't appear in the original badge set and we avoid polluting globals.css.
const VARIANT_CLS = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger:  'badge-danger',
  info:    'badge-info',
}

const VARIANT_INLINE = {
  purple:  { color: 'var(--purple)',   background: 'var(--purple-bg)',  border: '1px solid var(--purple-border)' },
  neutral: { color: 'var(--text-sub)', background: 'var(--bg-alt)',     border: '1px solid var(--border)' },
}

/**
 * Badge — small status pill.
 *
 * Props:
 *   variant  'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral'  default 'neutral'
 *   dot      boolean — prepend a colored bullet                                 default false
 *   children content
 *   className extra classes
 *   style    extra inline styles
 */
export function Badge({ variant = 'neutral', dot = false, children, className = '', style }) {
  const cls    = VARIANT_CLS[variant]
  const inline = VARIANT_INLINE[variant]

  return (
    <span
      className={`badge ${cls ?? ''} ${className}`.trim()}
      style={inline ? { ...inline, ...style } : style}
    >
      {dot && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block', width: 6, height: 6,
            borderRadius: '50%', background: 'currentColor',
            marginRight: 5, flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  )
}
