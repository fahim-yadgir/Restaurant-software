// Shared menu options: category list and GST slabs.
// Custom categories / custom GST rates that the owner adds with a dish are saved
// inside that dish, so they are collected back from the menu here and appear
// automatically in the Menu form and in Billing.

export const CUSTOM = '__custom__'

export const DEFAULT_CATEGORIES = [
  'Starters', 'Soups', 'Tandoor', 'Main Course', 'Rice & Biryani', 'Indian Breads',
  'Chinese', 'South Indian', 'Fast Food', 'Snacks', 'Sides & Salads',
  'Beverages', 'Desserts', 'Combos & Thali',
]

// Common GST slabs (in %)
export const DEFAULT_GST_SLABS = [0, 0.25, 3, 5, 12, 18, 28]

export const getCategories = (foods = []) => {
  const list = [...DEFAULT_CATEGORIES]
  foods.forEach(f => {
    const c = (f.category || '').trim()
    if (c && !list.some(x => x.toLowerCase() === c.toLowerCase())) list.push(c)
  })
  return list
}

export const getGstSlabs = (foods = []) => {
  const set = new Set(DEFAULT_GST_SLABS)
  foods.forEach(f => { if (Number.isFinite(Number(f.gst))) set.add(Number(f.gst)) })
  return [...set].sort((a, b) => a - b)
}