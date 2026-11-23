import { useMemo, useState } from 'react'
import { Plus, Search, Download, Pencil, Trash2 } from 'lucide-react'

import FoodForm from '@/components/menu/FoodForm'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

import { money } from '@/lib/format'
import { notifySuccess, notifyError, notifyConfirm } from '@/lib/toast'
import useOnlineStatus from '@/hooks/useOnlineStatus'

export default function MenuPage({ foods = [], setFoods }) {
  const [show, setShow] = useState(false)
  const [editingFood, setEditingFood] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const online = useOnlineStatus()

  // Dynamically detect all portion names
  const portionNames = useMemo(() => {
    const names = [
      ...new Set(
        foods.flatMap(food =>
          (food.variants || [])
            .map(variant => variant.name?.trim())
            .filter(Boolean)
        )
      ),
    ]

    const standardOrder = ['Half', 'Medium', 'Full']

    return [
      ...standardOrder.filter(name =>
        names.some(
          item => item.toLowerCase() === name.toLowerCase()
        )
      ),
      ...names.filter(
        item =>
          !standardOrder.some(
            name => name.toLowerCase() === item.toLowerCase()
          )
      ),
    ]
  }, [foods])

  const getVariant = (food, portion) =>
    food.variants?.find(
      variant =>
        variant.name?.trim().toLowerCase() ===
        portion.trim().toLowerCase()
    )

  // Custom categories automatically come from saved food items
  const categories = useMemo(() => {
    return [
      'All',
      ...new Set(
        foods
          .map(food => food.category?.trim())
          .filter(Boolean)
      ),
    ]
  }, [foods])

  const filteredFoods = useMemo(() => {
    const query = search.trim().toLowerCase()

    return foods.filter(food => {
      const matchesCategory =
        selectedCategory === 'All' ||
        food.category === selectedCategory

      const matchesSearch =
        !query ||
        food.name?.toLowerCase().includes(query) ||
        food.category?.toLowerCase().includes(query) ||
        String(food.gst ?? '').includes(query) ||
        food.variants?.some(variant =>
          variant.name?.toLowerCase().includes(query)
        )

      return matchesCategory && matchesSearch
    })
  }, [foods, search, selectedCategory])

  const requireInternet = () => {
    if (!navigator.onLine) {
      notifyError('Internet connection is required to make changes.')
      return false
    }

    return true
  }

  const openAddForm = () => {
    if (!requireInternet()) return

    setEditingFood(null)
    setShow(true)
  }

  const openEditForm = food => {
    if (!requireInternet()) return

    setEditingFood(food)
    setShow(true)
  }

  const closeForm = () => {
    setShow(false)
    setEditingFood(null)
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

    notifySuccess(
      food.active
        ? 'Dish disabled successfully!'
        : 'Dish enabled successfully!'
    )
  }

  // Soft delete: the dish is hidden from the menu and the billing screen,
  // but it stays stored (deleted: true) so past bills and reports are unchanged.
  const deleteFood = async food => {
    if (!requireInternet()) return

    const ok = await notifyConfirm(
      `Delete "${food.name}"? It will be removed from the menu and the billing screen. Past bills and reports will not change.`,
      'Delete dish?'
    )

    if (!ok) return

    setFoods(old =>
      old.map(item =>
        item.id === food.id
          ? { ...item, deleted: true, active: false, deletedAt: Date.now() }
          : item
      )
    )
  }

  // Add a new dish OR update an existing dish
  const saveFood = food => {
    if (!requireInternet()) return

    if (editingFood) {
      setFoods(old =>
        old.map(item =>
          item.id === editingFood.id
            ? {
                ...item,
                ...food,
                id: editingFood.id,
              }
            : item
        )
      )

      notifySuccess('Food item updated successfully!')
    } else {
      setFoods(old => [
        ...old,
        {
          ...food,
          id: Date.now(),
        },
      ])

      notifySuccess('Food item added successfully!')
    }

    closeForm()
  }

  const exportMenu = () => {
    const headers = [
      'Item Name',
      'Category',
      ...portionNames.map(portion => `${portion} Price`),
      'GST',
      'Status',
    ]

    const rows = [
      headers,
      ...filteredFoods.map(food => [
        food.name,
        food.category,
        ...portionNames.map(portion => {
          const variant = getVariant(food, portion)
          return variant?.price ?? ''
        }),
        food.gst,
        food.active ? 'Active' : 'Inactive',
      ]),
    ]

    const csv = rows
      .map(row =>
        row
          .map(value =>
            `"${String(value ?? '').replace(/"/g, '""')}"`
          )
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'restrodesk-menu.csv'
    link.click()

    URL.revokeObjectURL(url)

    notifySuccess('Menu exported successfully!')
  }

  const portionColumnCount = Math.max(portionNames.length, 1)
  const totalColumns = 6 + portionColumnCount

  return (
    <div className="space-y-5">

      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">
            Menu & GST
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage dishes, portion prices, GST rates and availability.
          </p>
        </div>

        <Button
          onClick={openAddForm}
          disabled={!online}
        >
          <Plus size={16} />
          Add new dish
        </Button>
      </div>

      {!online && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Connect to the internet to add or change menu items.
        </div>
      )}

      {/* Search */}
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
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {/* Category filters */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map(category => {
            const count =
              category === 'All'
                ? foods.length
                : foods.filter(
                    food => food.category === category
                  ).length

            const active = selectedCategory === category

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-indigo-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {category} - {count}
              </button>
            )
          })}
        </div>

        {/* Table information and export */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Showing {filteredFoods.length} of {foods.length} dishes
          </p>

          <Button
            variant="secondary"
            onClick={exportMenu}
          >
            <Download size={15} />
            Export
          </Button>
        </div>
      </div>

      {/* Menu table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">

            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
              <tr className="border-b border-slate-200">
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-4"
                >
                  Sr. No.
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-4"
                >
                  Item Name
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-4"
                >
                  Category
                </th>

                <th
                  colSpan={portionColumnCount}
                  className="border-r border-slate-200 px-4 py-3 text-center"
                >
                  Portion Pricing
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-4"
                >
                  GST Slab
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-4"
                >
                  Status
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-4 py-4"
                >
                  Action
                </th>
              </tr>

              {/* Dynamic portion headings */}
              <tr className="border-b border-slate-200">
                {portionNames.length > 0 ? (
                  portionNames.map(portion => (
                    <th
                      key={portion}
                      className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center"
                    >
                      {portion}
                    </th>
                  ))
                ) : (
                  <th className="border-r border-slate-200 px-4 py-3 text-center">
                    No portions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredFoods.map((food, index) => (
                <tr
                  key={food.id}
                  className="border-b border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="border-r border-slate-100 px-4 py-4 text-center text-slate-500">
                    {index + 1}
                  </td>

                  <td className="border-r border-slate-100 px-4 py-4 font-semibold text-slate-800">
                    {food.name}
                  </td>

                  <td className="border-r border-slate-100 px-4 py-4 text-slate-600">
                    {food.category}
                  </td>

                  {/* Dynamic portion prices */}
                  {portionNames.length > 0 ? (
                    portionNames.map(portion => {
                      const variant = getVariant(food, portion)

                      return (
                        <td
                          key={portion}
                          className="whitespace-nowrap border-r border-slate-100 px-4 py-4 text-center font-semibold"
                        >
                          {variant
                            ? money(variant.price)
                            : '—'}
                        </td>
                      )
                    })
                  ) : (
                    <td className="border-r border-slate-100 px-4 py-4 text-center">
                      —
                    </td>
                  )}

                  <td className="border-r border-slate-100 px-4 py-4">
                    {food.gst}%
                  </td>

                  <td className="border-r border-slate-100 px-4 py-4">
                    <Badge tone={food.active ? 'green' : 'red'}>
                      {food.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>

                  {/* Edit and Enable/Disable actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={!online}
                        onClick={() => openEditForm(food)}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={!online}
                        onClick={() => toggleFood(food)}
                        className="whitespace-nowrap text-xs font-bold text-orange-600 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {food.active ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        type="button"
                        disabled={!online}
                        onClick={() => deleteFood(food)}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredFoods.length === 0 && (
                <tr>
                  <td
                    colSpan={totalColumns}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    {search || selectedCategory !== 'All'
                      ? 'No matching menu items found.'
                      : 'No menu items added yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Scroll horizontally to view all columns on mobile.
        </div>
      </div>

      {/* Add / Edit food modal */}
      {show && (
        <Modal
          title={editingFood ? 'Edit menu item' : 'Add new dish'}
          subtitle={
            editingFood
              ? 'Update item details, portion prices and GST'
              : 'Category, portion prices and GST'
          }
          size="lg"
          onClose={closeForm}
        >
          <FoodForm
            key={editingFood?.id ?? 'new-food'}
            foods={foods}
            initialFood={editingFood}
            onAdd={saveFood}
            submitLabel={editingFood ? 'Update dish' : 'Add food item'}
          />
        </Modal>
      )}
    </div>
  )
}