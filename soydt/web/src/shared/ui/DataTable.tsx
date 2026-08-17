// soydt/web/src/shared/ui/DataTable.tsx
// Generic replacement for the page-specific `fm-*-table`/`fm-squad`/`fm-standings`
// markup (see DESIGN_SYSTEM.md — Phase 1 of the fm-/style.css migration plan).
// Each page keeps its own column definitions/render logic; this just owns the
// <table> shell and token-based styling so every list looks consistent.
import type { Key, ReactNode } from 'react'
import './DataTable.css'

export type DataTableColumn<T> = {
  key: string
  header: ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
  render: (row: T, index: number) => ReactNode
}

function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowClassName,
  emptyMessage = 'No data',
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => Key
  rowClassName?: (row: T, index: number) => string | undefined
  emptyMessage?: ReactNode
}) {
  if (rows.length === 0) {
    return <div className="dt-empty">{emptyMessage}</div>
  }

  return (
    <table className="dt-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={c.align ? `dt-align-${c.align}` : undefined}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={rowKey(row, i)} className={rowClassName?.(row, i)}>
            {columns.map((c) => (
              <td
                key={c.key}
                className={[c.align ? `dt-align-${c.align}` : '', c.className ?? ''].filter(Boolean).join(' ') || undefined}
              >
                {c.render(row, i)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default DataTable
