import { useEffect, useRef, useState } from 'react'
import type { TashqiHolat, Trek } from '../../preload'

export type Pleyer = ReturnType<typeof usePleyer>

function manzil(trek: Trek): string {
  return `ling-musiqa://f/${encodeURIComponent(trek.yol)}`
}

// Audio asosiy oynada yashaydi: Chat yoki Nest bo'limi almashsa ham, oyna yopilib
// tray'ga tushsa ham musiqa to'xtamaydi
export function usePleyer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  if (!audioRef.current) audioRef.current = new Audio()
  const audio = audioRef.current

  const [papka, setPapka] = useState<string | null>(null)
  const [treklar, setTreklar] = useState<Trek[]>([])
  const [joriy, setJoriy] = useState(-1)
  const [ijroda, setIjroda] = useState(false)
  const [vaqt, setVaqt] = useState(0)
  const [davomiylik, setDavomiylik] = useState(0)
  const [xato, setXato] = useState<string | null>(null)
  const [tashqi, setTashqi] = useState<TashqiHolat | null>(null)

  // Hodisa tinglovchilari eski holatni ko'rmasligi uchun
  const holat = useRef({ treklar, joriy })
  holat.current = { treklar, joriy }

  function ijro(indeks: number): void {
    const royxat = holat.current.treklar
    if (!royxat.length) return
    const i = (indeks + royxat.length) % royxat.length
    setJoriy(i)
    setXato(null)
    audio.src = manzil(royxat[i])
    audio.play().catch(() => setXato("Bu faylni ijro etib bo'lmadi"))
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: royxat[i].nomi, artist: 'Ling' })
    }
  }

  function almashtir(): void {
    if (holat.current.joriy < 0) return ijro(0)
    if (audio.paused) audio.play().catch(() => setXato("Bu faylni ijro etib bo'lmadi"))
    else audio.pause()
  }

  const keyingi = (): void => ijro(holat.current.joriy + 1)

  // 3 soniyadan ko'p o'tgan bo'lsa — shu trek boshiga, aks holda oldingi trekka
  function oldingi(): void {
    if (audio.currentTime > 3) audio.currentTime = 0
    else ijro(holat.current.joriy - 1)
  }

  function sur(ulush: number): void {
    if (Number.isFinite(audio.duration)) audio.currentTime = ulush * audio.duration
  }

  async function papkaTanla(): Promise<void> {
    const natija = await window.ling.pleyerPapkaTanla()
    if (!natija) return
    audio.pause()
    audio.removeAttribute('src')
    setJoriy(-1)
    setVaqt(0)
    setDavomiylik(0)
    setPapka(natija.papka)
    setTreklar(natija.treklar)
  }

  useEffect(() => {
    window.ling.pleyerPapka().then((p) => {
      setPapka(p.papka)
      setTreklar(p.treklar)
    })
    window.ling.tashqiHolat().then(setTashqi)
    const tashqiniTinglash = window.ling.tashqiOzgarganda(setTashqi)

    const hodisalar: [string, () => void][] = [
      ['play', () => setIjroda(true)],
      ['pause', () => setIjroda(false)],
      ['timeupdate', () => setVaqt(audio.currentTime)],
      ['durationchange', () => setDavomiylik(Number.isFinite(audio.duration) ? audio.duration : 0)],
      ['ended', () => keyingi()],
      ['error', () => audio.src && setXato("Bu faylni ijro etib bo'lmadi")]
    ]
    for (const [nom, ishla] of hodisalar) audio.addEventListener(nom, ishla)

    // Klaviaturadagi media tugmalari ham Ling pleyerini boshqaradi
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('nexttrack', keyingi)
      navigator.mediaSession.setActionHandler('previoustrack', oldingi)
    }

    return () => {
      tashqiniTinglash()
      for (const [nom, ishla] of hodisalar) audio.removeEventListener(nom, ishla)
    }
  }, [])

  return {
    papka,
    treklar,
    joriy,
    ijroda,
    vaqt,
    davomiylik,
    xato,
    tashqi,
    ijro,
    almashtir,
    keyingi,
    oldingi,
    sur,
    papkaTanla,
    tashqiBuyruq: (buyruq: 'almashtir' | 'keyingi' | 'oldingi') => window.ling.tashqiBuyruq(buyruq)
  }
}
