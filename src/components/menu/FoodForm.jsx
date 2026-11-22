
import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import { CUSTOM, getCategories, getGstSlabs } from '@/lib/menuOptions'

const selectCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400'

const newRow = () => ({
  id: `${Date.now()}-${Math.random()}`,
  name: '',
  price: '',
})

export default function FoodForm({
  onAdd,
  foods = [],
  initialFood = null,
  submitLabel,
}) {
  const categories = getCategories(foods)
  const slabs = getGstSlabs(foods)

  const [name, setName] = useState(initialFood?.name || '')
  const [category, setCategory] = useState(
    initialFood?.category || 'Main Course'
  )
  const [customCategory, setCustomCategory] = useState('')

  const [half, setHalf] = useState(
    String(
      initialFood?.variants?.find(
        v => v.name?.toLowerCase() === 'half'
      )?.price ?? ''
    )
  )

  const [full, setFull] = useState(
    String(
      initialFood?.variants?.find(
        v => v.name?.toLowerCase() === 'full'
      )?.price ?? ''
    )
  )

  const [extras, setExtras] = useState(
    (initialFood?.variants || [])
      .filter(
        v =>
          !['half', 'full'].includes(
            v.name?.toLowerCase()
          )
      )
      .map(v => ({
        id: `${Date.now()}-${Math.random()}`,
        name: v.name,
        price: String(v.price),
      }))
  )

  const [gst, setGst] = useState(
    slabs.some(s => Number(s) === Number(initialFood?.gst))
      ? String(initialFood?.gst ?? '5')
      : initialFood
        ? CUSTOM
        : '5'
  )

  const [customGst, setCustomGst] = useState(
    gst === CUSTOM ? String(initialFood?.gst ?? '') : ''
  )

  const [error, setError] = useState('')

  const updateExtra = (id, key, value) => {
    setExtras(old =>
      old.map(row =>
        row.id === id ? { ...row, [key]: value } : row
      )
    )
  }

  const submit = e => {
    e.preventDefault()
    setError('')

    const dish = name.trim()

    if (!dish) {
      setError('Enter the food item name.')
      return
    }

    let finalCategory = category

    if (category === CUSTOM) {
      const c = customCategory.trim()

      if (!c) {
        setError('Enter the custom category name.')
        return
      }

      finalCategory =
        categories.find(
          x => x.toLowerCase() === c.toLowerCase()
        ) || c
    }

    let rate = Number(gst)

    if (gst === CUSTOM) {
      rate = Number(customGst)

      if (
        customGst === '' ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        rate > 100
      ) {
        setError('Enter a custom GST rate between 0 and 100.')
        return
      }

      rate = Math.round(rate * 100) / 100
    }

    const variants = []

    if (half !== '') {
      if (!(Number(half) > 0)) {
        setError('Half price must be more than 0.')
        return
      }

      variants.push({
        name: 'Half',
        price: Number(half),
      })
    }

    if (full !== '') {
      if (!(Number(full) > 0)) {
        setError('Full price must be more than 0.')
        return
      }

      variants.push({
        name: 'Full',
        price: Number(full),
      })
    }

    for (const row of extras) {
      const portionName = row.name.trim()

      if (!portionName && row.price === '') continue

      if (!portionName || !(Number(row.price) > 0)) {
        setError('Each custom portion needs a name and a price above 0.')
        return
      }

      if (
        variants.some(
          v => v.name.toLowerCase() === portionName.toLowerCase()
        )
      ) {
        setError(`Portion "${portionName}" is added twice.`)
        return
      }

      variants.push({
        name: portionName,
        price: Number(row.price),
      })
    }

    if (!variants.length) {
      setError('Add at least one portion price.')
      return
    }

    onAdd({
      ...(initialFood || {}),
      name: dish,
      category: finalCategory,
      gst: rate,
      active: initialFood?.active ?? true,
      variants,
    })
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <Field
        label="Food item name"
        value={name}
        onChange={setName}
        placeholder="e.g. Paneer Tikka"
      />

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">
            Category
          </span>

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className={selectCls}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}

            <option value={CUSTOM}>+ Custom category…</option>
          </select>
        </label>

        {category === CUSTOM && (
          <Field
            label="Custom category name"
            value={customCategory}
            onChange={setCustomCategory}
            placeholder="e.g. Chaat Corner"
          />
        )}
      </div>

      <div className="md:col-span-2">
        <div className="mb-2 text-xs font-semibold text-slate-600">
          Portion prices
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Half price"
            type="number"
            min="0"
            value={half}
            onChange={setHalf}
            placeholder="140"
          />

          <Field
            label="Full price"
            type="number"
            min="0"
            value={full}
            onChange={setFull}
            placeholder="240"
          />
        </div>

        {extras.length > 0 && (
          <div className="mt-3 space-y-2">
            {extras.map(row => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
              >
                <Field
                  label="Custom portion name"
                  value={row.name}
                  onChange={v => updateExtra(row.id, 'name', v)}
                  placeholder="Small, Quarter, Large"
                />

                <Field
                  label="Price"
                  type="number"
                  min="0"
                  value={row.price}
                  onChange={v => updateExtra(row.id, 'price', v)}
                  placeholder="90"
                />

                <button
                  type="button"
                  onClick={() =>
                    setExtras(old => old.filter(x => x.id !== row.id))
                  }
                  className="mb-1 grid h-10 w-10 place-items-center rounded-xl text-rose-500 hover:bg-rose-50"
                  title="Remove portion"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setExtras(old => [...old, newRow()])}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-orange-300 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50"
        >
          <Plus size={14} /> Add custom portion
        </button>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">
            GST slab
          </span>

          <select
            value={gst}
            onChange={e => setGst(e.target.value)}
            className={selectCls}
          >
            {slabs.map(s => (
              <option key={s} value={String(s)}>{s}%</option>
            ))}

            <option value={CUSTOM}>+ Custom GST…</option>
          </select>
        </label>

        {gst === CUSTOM && (
          <Field
            label="Custom GST rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={customGst}
            onChange={setCustomGst}
            placeholder="e.g. 7.5"
          />
        )}
      </div>

      <div className="flex items-end">
        <Button type="submit" className="w-full md:w-auto">
          {submitLabel || (initialFood ? 'Update dish' : 'Add food item')}
        </Button>
      </div>

      {error && (
        <p className="form-error md:col-span-2">{error}</p>
      )}
    </form>
  )
}
