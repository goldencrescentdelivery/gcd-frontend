'use client'

/**
 * PageHeader — consistent title bar across all dashboard pages.
 *
 * Props:
 *   title     string — page title (h1)
 *   subtitle  string — optional description below the title
 *   children  ReactNode — action buttons / filters placed on the right side
 *   className string
 *
 * Usage:
 *   <PageHeader title="Employees" subtitle="47 active">
 *     <Button variant="primary" icon={<Plus size={15}/>}>Add Employee</Button>
 *   </PageHeader>
 */
export function PageHeader({ title, subtitle, children, className = '' }) {
  return (
    <div className={`page-header ${className}`}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="page-header-actions">
          {children}
        </div>
      )}
    </div>
  )
}
