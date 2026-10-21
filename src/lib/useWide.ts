import { useEffect, useState } from 'react'

// wide screens (tablet landscape, computer); same query as the CSS layouts
export const WIDE = '(min-width: 1024px), (min-width: 600px) and (orientation: landscape)'

export function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = window.matchMedia(WIDE), on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}
