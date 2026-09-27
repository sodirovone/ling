import { useEffect, useState } from 'react'

// Qiymat o'zgarishdan to'xtagach `ms` o'tib yangilanadi
export function useKechiktir<T>(qiymat: T, ms: number): T {
  const [kechikkan, setKechikkan] = useState(qiymat)
  useEffect(() => {
    const t = setTimeout(() => setKechikkan(qiymat), ms)
    return () => clearTimeout(t)
  }, [qiymat, ms])
  return kechikkan
}
