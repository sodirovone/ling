import { useEffect, useRef, useState } from 'react'
import type { Nusxa, TezkorSoz } from '../../preload'
import { useKechiktir } from './useKechiktir'

const SILLIQ = 'cubic-bezier(0.22, 1, 0.36, 1)'
const CHIQISH = 'cubic-bezier(0.4, 0, 0.9, 0.4)'

function vaqtMatni(vaqt: number): string {
  return new Date(vaqt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

export default function NestPanel() {
  const [qidiruv, setQidiruv] = useState('')
  const [nusxalar, setNusxalar] = useState<Nusxa[]>([])
  const [sozlar, setSozlar] = useState<TezkorSoz[]>([])
  const [belgi, setBelgi] = useState<string | null>(null)
  const kechikkanQidiruv = useKechiktir(qidiruv, 120)
  const panel = useRef<HTMLDivElement>(null)
  const ichi = useRef<HTMLDivElement>(null)

  // Ochilish va yopilish animatsiyasi. Panelni qayta chizmasdan (rasmlar qayta
  // yuklanmasin) faqat transform va opacity o'zgaradi — shuning uchun silliq.
  useEffect(() => {
    const ochilganda = window.ling.nestKorsatilganda(() => {
      panel.current?.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 16px, 0) scale(0.97)' },
          { opacity: 1, transform: 'none' }
        ],
        { duration: 420, easing: SILLIQ, fill: 'both' }
      )
      ichi.current?.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 6px, 0)' },
          { opacity: 1, transform: 'none' }
        ],
        { duration: 380, delay: 70, easing: SILLIQ, fill: 'both' }
      )
    })
    const yopilganda = window.ling.nestYopilganda(() => {
      panel.current?.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translate3d(0, 10px, 0) scale(0.985)' }
        ],
        { duration: 170, easing: CHIQISH, fill: 'forwards' }
      )
    })
    return () => {
      ochilganda()
      yopilganda()
    }
  }, [])

  async function yukla(): Promise<void> {
    const [n, s] = await Promise.all([
      window.ling.royxat({ qidiruv: kechikkanQidiruv, chegara: 40 }),
      window.ling.tezkorRoyxat(kechikkanQidiruv)
    ])
    setNusxalar(n)
    setSozlar(s.slice(0, 6))
  }

  useEffect(() => {
    yukla()
  }, [kechikkanQidiruv])

  useEffect(() => window.ling.yangilanganda(yukla), [kechikkanQidiruv])

  // Escape bosilsa panel yopiladi
  useEffect(() => {
    const tinglovchi = (h: KeyboardEvent): void => {
      if (h.key === 'Escape') window.ling.nestYashir()
    }
    window.addEventListener('keydown', tinglovchi)
    return () => window.removeEventListener('keydown', tinglovchi)
  }, [])

  function belgila(kalit: string): void {
    setBelgi(kalit)
    setTimeout(() => setBelgi(null), 900)
  }

  async function nusxala(id: number): Promise<void> {
    await window.ling.nusxala(id)
    belgila(`n${id}`)
    setTimeout(() => window.ling.nestYashir(), 500)
  }

  async function sozNusxala(id: number): Promise<void> {
    await window.ling.tezkorNusxala(id)
    belgila(`s${id}`)
    setTimeout(() => window.ling.nestYashir(), 500)
  }

  return (
    <div
      ref={panel}
      style={{ transformOrigin: 'bottom left', willChange: 'transform, opacity' }}
      className="h-screen overflow-hidden rounded-[28px] bg-[#1f2023] p-4"
    >
      <div ref={ichi} className="flex h-full flex-col gap-3">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7cb7ff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l9 4.5-9 4.5-9-4.5z" />
              <path d="M3 12l9 4.5 9-4.5" />
              <path d="M3 16.5l9 4.5 9-4.5" />
            </svg>
            <h1 className="text-xl font-bold tracking-tight">Nest</h1>
          </div>
          <button
            onClick={() => window.ling.asosiyniOchish()}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-[#c4c6ca] hover:bg-[#28292c]"
            title="Ling oynasini ochish"
          >
            Ling &#8599;
          </button>
        </header>

        <input
          autoFocus
          value={qidiruv}
          onChange={(h) => setQidiruv(h.target.value)}
          placeholder="Qidirish"
          className="w-full rounded-full bg-[#333437] px-4 py-2.5 text-sm outline-none placeholder:text-[#909296]"
        />

        {sozlar.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sozlar.map((soz, i) => (
              <button
                key={soz.id}
                style={{ animationDelay: `${Math.min(i, 6) * 24}ms` }}
                onClick={() => sozNusxala(soz.id)}
                className={`anim-paydo rounded-xl px-3 py-1.5 text-xs font-bold ${
                  belgi === `s${soz.id}`
                    ? 'bg-[#f2f3f5] text-[#111214]'
                    : 'bg-[#1d3b66] text-[#d6e6ff]'
                }`}
              >
                {belgi === `s${soz.id}` ? 'Nusxa olindi' : soz.nom}
              </button>
            ))}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {nusxalar.length === 0 && (
            <p className="pt-4 text-center text-sm text-[#909296]">
              {qidiruv ? 'Topilmadi' : "Hali nusxa yo'q"}
            </p>
          )}
          {nusxalar.map((nusxa, i) => (
            <button
              key={nusxa.id}
              style={{ animationDelay: `${Math.min(i, 8) * 18}ms` }}
              onClick={() => nusxala(nusxa.id)}
              className={`anim-paydo flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                belgi === `n${nusxa.id}` ? 'bg-[#1d3b66]' : 'bg-[#28292c] hover:bg-[#333437]'
              }`}
            >
              {nusxa.tur === 'video' ? (
                <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-[#28292c] text-[#7cb7ff]">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <path d="M10 9.5l5 2.5-5 2.5z" />
                  </svg>
                </span>
              ) : null}
              {nusxa.tur === 'fayl' ? (
                <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1d3b66] text-[10px] font-extrabold text-[#d6e6ff]">
                  {nusxa.matn.match(/\.([a-z0-9]+)$/i)?.[1].toUpperCase() ?? 'FAYL'}
                </span>
              ) : null}
              {nusxa.tur === 'rasm' && nusxa.fayl ? (
                <img
                  src={`ling-rasm://${nusxa.fayl}?kichik`}
                  loading="lazy"
                  decoding="async"
                  alt={nusxa.matn}
                  className="h-9 w-12 shrink-0 rounded-md object-cover"
                />
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm">
                {belgi === `n${nusxa.id}` ? 'Nusxa olindi' : nusxa.matn}
              </span>
              <span className="shrink-0 text-[11px] text-[#909296]">{vaqtMatni(nusxa.vaqt)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
