import { useEffect, useState } from 'react'
import { trustedNow } from '@/lib/license'

// Re-renders every second with a time value that never moves backwards (see trustedNow).
export default function useTrustedClock() {
  const [now, setNow] = useState(() => trustedNow())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(trustedNow()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
