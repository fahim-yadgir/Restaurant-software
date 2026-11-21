import { useEffect, useState } from 'react'
import { readLocal, writeLocal } from '@/lib/localStore'

// useState that is loaded from, and saved to, localStorage.
// `normalize` can clean up or reject a stored value (e.g. an old format) when it is first read.
export default function usePersistentState(key, fallback, normalize = (value) => value) {
  const [value, setValue] = useState(() => normalize(readLocal(key, fallback)))
  useEffect(() => { writeLocal(key, value) }, [key, value])
  return [value, setValue]
}
