'use client'

// Maps to existing globals.css btn classes
const VARIANT_CLS = { primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost' }
const SIZE_CLS    = { xs: 'btn-xs', sm: 'btn-sm', md: '' }

// Danger is not in the CSS — we inline the red styling so it stays in sync
// with --red token even in dark mode
const DANGER_STYLE = {
  background: 'var(--red)', color: '#fff', border: 'none',
  boxShadow: '0 2px 8px rgba(239,68,68,0.22)',
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block', flexShrink: 0,
        width: 13, height: 13, borderRadius: '50%',
        border: '2px solid currentColor', borderTopColor: 'transparent',
        animation: 'spin 0.65s linear infinite',
      }}
    />
  )
}

/**
 * Button — all interactive triggers.
 *
 * Props:
 *   variant   'primary' | 'secondary' | 'ghost' | 'danger'   default 'secondary'
 *   size      'xs' | 'sm' | 'md'                             default 'md'
 *   loading   boolean — shows spinner, prevents interaction   default false
 *   icon      ReactNode — icon before label
 *   iconRight ReactNode — icon after label (hidden while loading)
 *   disabled  boolean
 *   type      HTMLButtonElement.type                          default 'button'
 *
 * Usage:
 *   <Button variant="primary" loading={saving} onClick={save}>Save</Button>
 *   <Button variant="danger" size="sm" icon={<Trash size={14}/>}>Delete</Button>
 *   <Button variant="ghost" icon={<Plus size={16}/>} />   // icon-only
 */
export function Button({
  variant   = 'secondary',
  size      = 'md',
  loading   = false,
  icon,
  iconRight,
  disabled,
  children,
  className = '',
  type      = 'button',
  ...rest
}) {
  const cls        = `btn ${VARIANT_CLS[variant] ?? ''} ${SIZE_CLS[size] ?? ''} ${className}`.trim()
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cls}
      style={variant === 'danger' ? DANGER_STYLE : undefined}
      aria-busy={loading}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children && <span>{children}</span>}
      {!loading && iconRight}
    </button>
  )
}
