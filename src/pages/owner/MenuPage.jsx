
import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  GripVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

import FoodForm from '@/components/menu/FoodForm'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

import { money } from '@/lib/format'
import useOnlineStatus from '@/hooks/useOnlineStatus'

const INITIAL_COLUMNS = [
  'name',
  'category',
  'half',
  'full',
  'gst',
  'status',
  'action',
]

export default function MenuPage({ foods = [], setFoods }) {
  const [show, setShow] = useState(false)
  const [editingFood, setEditingFood] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [columnOrder, setColumnOrder] = useState(INITIAL_COLUMNS)
  const [draggedColumn, setDraggedColumn] = useState(null)
  const [sort, setSort] = useState({
    key: null,
    direction: null,
  })

  const online = useOnlineStatus()

  const requireInternet = () => {
    if (!navigator.onLine) {
      window.alert('Internet connection is required to make changes.')
      return false
    }
    return true
  }

  const categories = useMemo(
    () => [
      'All',
      ...new Set(foods.map(f => f.category).filter(Boolean)),
    ],
    [foods]
  )

  const getValue = (food, key) => {
    if (key === 'half' || key === 'full') {
      return food.variants?.find(
        v => v.name?.toLowerCase() === key
      )?.price ?? ''
    }

    if (key === 'status') {
      return food.active ? 'Active' : 'Inactive'
    }

    return food[key] ?? ''
  }

  const filteredFoods = useMemo(() => {
    const query = search.trim().toLowerCase()

    let result = foods.filter(food => {
      const matchesCategory =
        selectedCategory === 'All' ||
        food.category === selectedCategory

      const matchesSearch =
        !query ||
        food.name?.toLowerCase().includes(query) ||
        food.category?.toLowerCase().includes(query) ||
        String(food.gst ?? '').includes(query)

      return matchesCategory && matchesSearch
    })

    if (sort.key && sort.direction) {
      result = [...result].sort((a, b) => {
        const av = getValue(a, sort.key)
        const bv = getValue(b, sort.key)

        const an = Number(av)
        const bn = Number(bv)

        let comparison

        if (
          av !== '' &&
          bv !== '' &&
          Number.isFinite(an) &&
          Number.isFinite(bn)
        ) {
          comparison = an - bn
        } else {
          comparison = String(av).localeCompare(
            String(bv),
            undefined,
            { numeric: true, sensitivity: 'base' }
          )
        }

        return sort.direction === 'desc'
          ? -comparison
          : comparison
      })
    }

    return result
  }, [foods, search, selectedCategory, sort])

  const changeSort = key => {
    setSort(current => {
      if (current.key !== key) {
        return { key, direction: 'asc' }
      }

      if (current.direction === 'asc') {
        return { key, direction: 'desc' }
      }

      return { key: null, direction: null }
    })
  }

  const moveColumn = target => {
    if (!draggedColumn || draggedColumn === target) return

    setColumnOrder(current => {
      const next = [...current]
      const from = next.indexOf(draggedColumn)
      const to = next.indexOf(target)

      if (from < 0 || to < 0) return current

      next.splice(from, 1)
      next.splice(to, 0, draggedColumn)

      return next
    })

    setDraggedColumn(null)
  }

  const columnLabels = {
    name: 'Item Name',
    category: 'Category',
    half: 'Half',
    full: 'Full',
    gst: 'GST Slab',
    status: 'Status',
    action: 'Action',
  }

  const getSortIcon = key => {
    if (sort.key !== key) {
      return <ArrowUpDown size={14} className="text-slate-400" />
    }

    return sort.direction === 'asc'
      ? <ArrowUp size={14} className="text-indigo-700" />
      : <ArrowDown size={14} className="text-indigo-700" />
  }

  const openEdit = food => {
    if (!requireInternet()) return
    setEditingFood(food)
  }

  const addFood = food => {
    if (!requireInternet()) return

    setFoods(old => [
      ...old,
      { ...food, id: Date.now() },
    ])

    setShow(false)
    window.alert('Food item added successfully!')
  }

  const updateFood = updated => {
    if (!requireInternet()) return

    setFoods(old =>
      old.map(food =>
        food.id === editingFood.id
          ? { ...food, ...updated, id: food.id }
          : food
      )
    )

    setEditingFood(null)
    window.alert('Food item updated successfully!')
  }

  const toggleFood = food => {
    if (!requireInternet()) return

    setFoods(old =>
      old.map(item =>
        item.id === food.id
          ? { ...item, active: !item.active }
          : item
      )
    )

    window.alert(
      food.active
        ? 'Dish disabled successfully!'
        : 'Dish enabled successfully!'
    )
  }

  const renderCell = (food, key) => {
    const half = food.variants?.find(
      v => v.name?.toLowerCase() === 'half'
    )

    const full = food.variants?.find(
      v => v.name?.toLowerCase() === 'full'
    )

    switch (key) {
      case 'name':
        return <b>{food.name}</b>

      case 'category':
        return <span className="text-slate-500">{food.category}</span>

      case 'half':
        return half ? <b>{money(half.price)}</b> : '—'

      case 'full':
        return full ? <b>{money(full.price)}</b> : '—'

      case 'gst':
        return `${food.gst}%`

      case 'status':
        return (
          <Badge tone={food.active ? 'green' : 'red'}>
            {food.active ? 'Active' : 'Inactive'}
          </Badge>
        )

      case 'action':
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!online}
              onClick={() => openEdit(food)}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 disabled:opacity-40"
            >
              Edit
            </button>

            <button
              type="button"
              disabled={!online}
              onClick={() => toggleFood(food)}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 disabled:opacity-40"
            >
              {food.active ? 'Disable' : 'Enable'}
            </button>
          </div>
        )

      default:
        return '—'
    }
  }

  // Keep Half and Full grouped when they are next to each other.
  const groupedPortions =
    columnOrder.indexOf('full') === columnOrder.indexOf('half') + 1

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">
            Menu master
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage dishes, Half and Full prices, GST and availability.
          </p>
        </div>

        <Button
          onClick={() => {
            if (requireInternet()) setShow(true)
          }}
          disabled={!online}
        >
          <Plus size={16} /> Add new dish
        </Button>
      </div>

      {!online && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Connect to the internet to add or change menu items.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search item name, category or GST..."
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map(category => {
            const count =
              category === 'All'
                ? foods.length
                : foods.filter(f => f.category === category).length

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${
                  selectedCategory === category
                    ? 'bg-indigo-900 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {category} - {count}
              </button>
            )
          })}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Showing {filteredFoods.length} of {foods.length} dishes
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {columnOrder.map((key, index) => {
                  if (
                    key === 'full' &&
                    groupedPortions
                  ) return null

                  const isPortion =
                    key === 'half' &&
                    groupedPortions

                  const span = isPortion ? 2 : 1

                  return (
                    <th
                      key={key}
                      colSpan={span}
                      rowSpan={isPortion ? 1 : 2}
                      draggable
                      onDragStart={() => setDraggedColumn(key)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => moveColumn(key)}
                      onDragEnd={() => setDraggedColumn(null)}
                      className={`whitespace-nowrap border-b border-r border-slate-200 px-4 py-4 last:border-r-0 ${
                        draggedColumn === key ? 'bg-indigo-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical
                          size={16}
                          className="cursor-grab text-slate-400"
                        />

                        {isPortion ? (
                          <span className="w-full text-center font-bold uppercase">
                            Portion Pricing
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={key === 'action'}
                              onClick={() => changeSort(key)}
                              className="flex items-center gap-2 font-bold uppercase disabled:cursor-default"
                            >
                              {columnLabels[key]}
                              {key !== 'action' && getSortIcon(key)}
                            </button>
                          </>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>

              <tr className="border-b border-slate-200">
                {groupedPortions && (
                  <>
                    <th className="border-r border-slate-200 px-4 py-3 text-center">
                      Half
                    </th>
                    <th className="border-r border-slate-200 px-4 py-3 text-center">
                      Full
                    </th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredFoods.map(food => (
                <tr
                  key={food.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  {columnOrder.map(key => (
                    <td
                      key={key}
                      className="border-r border-slate-100 px-4 py-4 last:border-r-0"
                    >
                      {renderCell(food, key)}
                    </td>
                  ))}
                </tr>
              ))}

              {filteredFoods.length === 0 && (
                <tr>
                  <td
                    colSpan={columnOrder.length}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No matching menu items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Drag the six-dot handle to move columns. Click a heading to sort.
          Scroll horizontally on mobile.
        </div>
      </div>

      {show && (
        <Modal
          title="Add new dish"
          subtitle="Category, portion prices and GST"
          size="lg"
          onClose={() => setShow(false)}
        >
          <FoodForm
            foods={foods}
            onAdd={addFood}
            submitLabel="Add food item"
          />
        </Modal>
      )}

      {editingFood && (
        <Modal
          title="Edit food item"
          subtitle={`Update ${editingFood.name}`}
          size="lg"
          onClose={() => setEditingFood(null)}
        >
          <FoodForm
            key={editingFood.id}
            foods={foods}
            initialFood={editingFood}
            onAdd={updateFood}
            submitLabel="Save changes"
          />
        </Modal>
      )}
    </div>
  )
}
