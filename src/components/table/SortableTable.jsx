
import { useMemo, useState } from 'react'
import {
  GripVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

export default function SortableTable({
  columns,
  data,
  rowKey = 'id',
  emptyMessage = 'No records found.',
  minWidth = '800px',
}) {
  const [columnOrder, setColumnOrder] = useState(
    columns.map(column => column.key)
  )

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null,
  })

  const [draggedColumn, setDraggedColumn] = useState(null)

  const orderedColumns = useMemo(() => {
    const currentKeys = columns.map(column => column.key)

    const validOrder = columnOrder.filter(key =>
      currentKeys.includes(key)
    )

    const missingColumns = currentKeys.filter(
      key => !validOrder.includes(key)
    )

    return [...validOrder, ...missingColumns].map(key =>
      columns.find(column => column.key === key)
    )
  }, [columns, columnOrder])

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data

    const column = columns.find(
      item => item.key === sortConfig.key
    )

    if (!column) return data

    return [...data].sort((a, b) => {
      const aValue = column.sortValue
        ? column.sortValue(a)
        : a[column.key]

      const bValue = column.sortValue
        ? column.sortValue(b)
        : b[column.key]

      let comparison = 0

      const aNumber = Number(aValue)
      const bNumber = Number(bValue)

      if (
        aValue !== '' &&
        bValue !== '' &&
        Number.isFinite(aNumber) &&
        Number.isFinite(bNumber)
      ) {
        comparison = aNumber - bNumber
      } else {
        comparison = String(aValue ?? '').localeCompare(
          String(bValue ?? ''),
          undefined,
          {
            numeric: true,
            sensitivity: 'base',
          }
        )
      }

      return sortConfig.direction === 'desc'
        ? -comparison
        : comparison
    })
  }, [data, columns, sortConfig])

  const handleSort = column => {
    if (column.sortable === false) return

    setSortConfig(current => {
      if (current.key !== column.key) {
        return {
          key: column.key,
          direction: 'asc',
        }
      }

      if (current.direction === 'asc') {
        return {
          key: column.key,
          direction: 'desc',
        }
      }

      return {
        key: null,
        direction: null,
      }
    })
  }

  const handleDragStart = key => {
    setDraggedColumn(key)
  }

  const handleDrop = targetKey => {
    if (!draggedColumn || draggedColumn === targetKey) {
      setDraggedColumn(null)
      return
    }

    setColumnOrder(current => {
      const next = [...current]

      const fromIndex = next.indexOf(draggedColumn)
      const toIndex = next.indexOf(targetKey)

      if (fromIndex === -1 || toIndex === -1) return current

      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, draggedColumn)

      return next
    })

    setDraggedColumn(null)
  }

  const getSortIcon = column => {
    if (sortConfig.key !== column.key) {
      return <ArrowUpDown size={15} className="text-slate-400" />
    }

    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={15} className="text-indigo-700" />
    }

    return <ArrowDown size={15} className="text-indigo-700" />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-sm"
          style={{ minWidth }}
        >
          <thead className="bg-slate-50">
            <tr>
              {orderedColumns.map(column => (
                <th
                  key={column.key}
                  draggable
                  onDragStart={() => handleDragStart(column.key)}
                  onDragOver={event => event.preventDefault()}
                  onDrop={() => handleDrop(column.key)}
                  onDragEnd={() => setDraggedColumn(null)}
                  className={`whitespace-nowrap border-b border-r border-slate-200 px-3 py-4 last:border-r-0 ${
                    draggedColumn === column.key
                      ? 'bg-indigo-100 opacity-50'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical
                      size={17}
                      className="shrink-0 cursor-grab text-slate-400 active:cursor-grabbing"
                    />

                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      disabled={column.sortable === false}
                      className="flex items-center gap-2 text-left text-xs font-bold uppercase tracking-wide text-slate-700 disabled:cursor-default"
                      title={
                        column.sortable === false
                          ? 'Sorting unavailable'
                          : 'Click to sort'
                      }
                    >
                      {column.label}

                      {column.sortable !== false &&
                        getSortIcon(column)}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedData.length > 0 ? (
              sortedData.map((item, index) => (
                <tr
                  key={item[rowKey] ?? index}
                  className="border-b border-slate-100 transition hover:bg-slate-50"
                >
                  {orderedColumns.map(column => (
                    <td
                      key={column.key}
                      className="border-r border-slate-100 px-3 py-4 last:border-r-0"
                    >
                      {column.render
                        ? column.render(item, index)
                        : item[column.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={orderedColumns.length}
                  className="px-5 py-12 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
