'use client'
import { useId } from 'react'

/**
 * Input — unified form field: text inputs, selects, and textareas.
 *
 * Props:
 *   label              string — visible label above the field
 *   error              string — error message (turns border red, announces to screen reader)
 *   helper             string — hint text below the field (hidden when error is shown)
 *   as                 'input' | 'select' | 'textarea'       default 'input'
 *   required           boolean — appends red * to label, sets aria required
 *   id                 string — explicit id (auto-generated if omitted)
 *   containerClassName string — class for the outer wrapper div
 *   className          string — class forwarded to the field element
 *   children           ReactNode — <option> elements for <select>
 *
 * All other props (type, placeholder, value, onChange, rows, etc.) are forwarded
 * to the underlying element unchanged.
 *
 * Usage:
 *   <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
 *   <Input as="select" label="Type" value={type} onChange={e => setType(e.target.value)}>
 *     <option value="Annual">Annual</option>
 *   </Input>
 *   <Input as="textarea" label="Reason" rows={3} error={errors.reason} />
 */
export function Input({
  label,
  error,
  helper,
  as: Tag          = 'input',
  required         = false,
  id: idProp,
  className        = '',
  containerClassName = '',
  children,
  style,
  ...rest
}) {
  const uid          = useId()
  const id           = idProp ?? uid
  const errorId      = `${id}-error`
  const helperId     = `${id}-helper`
  const hasError     = Boolean(error)
  const describedBy  = hasError ? errorId : helper ? helperId : undefined
  const fieldCls     = `input ${hasError ? 'input-error' : ''} ${className}`.trim()

  return (
    <div
      className={containerClassName}
      style={{ display: 'flex', flexDirection: 'column', gap: 5, ...(!containerClassName && {}) }}
    >
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
          {required && (
            <span aria-hidden="true" style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>
          )}
        </label>
      )}

      {Tag === 'select' ? (
        <select
          id={id} className={fieldCls}
          aria-invalid={hasError} aria-describedby={describedBy}
          aria-required={required} style={style} {...rest}
        >
          {children}
        </select>
      ) : Tag === 'textarea' ? (
        <textarea
          id={id} className={fieldCls}
          aria-invalid={hasError} aria-describedby={describedBy}
          aria-required={required}
          style={{ resize: 'vertical', minHeight: 80, ...style }}
          {...rest}
        />
      ) : (
        <input
          id={id} className={fieldCls}
          aria-invalid={hasError} aria-describedby={describedBy}
          aria-required={required} style={style} {...rest}
        />
      )}

      {hasError && (
        <span id={errorId} role="alert"
          style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 1, lineHeight: 1.4 }}>
          {error}
        </span>
      )}
      {helper && !hasError && (
        <span id={helperId}
          style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.4 }}>
          {helper}
        </span>
      )}
    </div>
  )
}
