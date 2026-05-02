'use client'
import { useState } from 'react'

function SortIcon({ active, dir }) {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"
      style={{ opacity: active ? 1 : 0.3, transition: 'transform var(--t-fast)', transform: active && dir === 'desc' ? 'rotate(180deg)' : 'none' }}>
      <path d="M5 1L9 7H1L5 1Z"/>
    </svg>
  )
}

function SkeletonRow({ colCount }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: colCount }, (_, i) => (
        <td key={i} style={{ padding: '11px 12px' }}>
          <div className="sk" style={{ height: 13, width: i === 0 ? '65%' : '50%' }} />
        </td>
      ))}
    </tr>
  )
}

/**
 * DataTable — sortable, accessible data table with loading skeleton and empty state.
 *
 * columns: Array<{
 *   key       string                       — data key
 *   label     string                       — header text
 *   render    (value, row) => ReactNode    — custom cell renderer (optional)
 *   sortable  boolean                      — enables sort toggle
 *   width     string | number              — column width
 *   align     'left' | 'center' | 'right' — text alignment
 *   className string                       — forwarded to th + td
 * }>
 *
 * Props:
 *   columns       column definitions (see above)
 *   data          array of row objects
 *   loading       boolean — shows skeleton rows
 *   emptyMessage  string — text when data is empty and not loading
 *   emptyIcon     ReactNode — optional icon above emptyMessage
 *   skeletonRows  number — how many skeleton rows to show while loading  default 5
 *   rowKey        string — property used as React key                    default 'id'
 *   onSort        (key, dir) => void — external sort handler; when provided,
 *                 internal sort is disabled and sortKey/sortDir are used
 *   sortKey       string — current sort column (external mode)
 *   sortDir       'asc' | 'desc'                                         default 'asc'
 *   onRowClick    (row) => void — makes rows clickable
 *
 * Usage:
 *   <DataTable
 *     columns={[
 *       { key: 'name',   label: 'Name',   sortable: true },
 *       { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
 *       { key: 'date',   label: 'Date',   align: 'right', width: 120 },
 *     ]}
 *     data={employees}
 *     loading={loading}
 *     onRowClick={emp => setSelected(emp)}
 *   />
 */
export function DataTable({
  columns       = [],
  data          = [],
  loading       = false,
  emptyMessage  = 'No records found',
  emptyIcon,
  skeletonRows  = 5,
  rowKey        = 'id',
  onSort,
  sortKey,
  sortDir       = 'asc',
  onRowClick,
  className     = '',
}) {
  const [inSort, setInSort] = useState({ key: null, dir: 'asc' })

  const activeKey = onSort ? sortKey  : inSort.key
  const activeDir = onSort ? sortDir  : inSort.dir

  const handleSort = (key) => {
    const nextDir = activeKey === key && activeDir === 'asc' ? 'desc' : 'asc'
    if (onSort) { onSort(key, nextDir); return }
    setInSort({ key, dir: nextDir })
  }

  // Internal client-side sort when no external handler
  const rows = (!onSort && inSort.key)
    ? [...data].sort((a, b) => {
        const v1 = a[inSort.key] ?? '', v2 = b[inSort.key] ?? ''
        const cmp = String(v1).localeCompare(String(v2), undefined, { numeric: true, sensitivity: 'base' })
        return inSort.dir === 'asc' ? cmp : -cmp
      })
    : data

  return (
    <div className={`table-wrap ${className}`}>
      <table className="data-table" role="grid" aria-busy={loading}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                scope="col"
                className={col.className}
                style={{ width: col.width, textAlign: col.align || 'left', whiteSpace: 'nowrap',
                  cursor: col.sortable ? 'pointer' : undefined, userSelect: col.sortable ? 'none' : undefined }}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={col.sortable
                  ? (activeKey === col.key ? (activeDir === 'asc' ? 'ascending' : 'descending') : 'none')
                  : undefined}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {col.label}
                  {col.sortable && <SortIcon active={activeKey === col.key} dir={activeDir} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <SkeletonRow key={i} colCount={columns.length} />
              ))
            : rows.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length}
                    style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                    {emptyIcon && (
                      <div style={{ marginBottom: 10, opacity: 0.4 }} aria-hidden="true">
                        {emptyIcon}
                      </div>
                    )}
                    <div style={{ fontSize: 13 }}>{emptyMessage}</div>
                  </td>
                </tr>
              )
              : rows.map((row, idx) => (
                <tr
                  key={row[rowKey] ?? idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  role={onRowClick ? 'row' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row) } : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={col.className}
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  )
}
