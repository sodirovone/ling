import { useEffect, useRef, useState } from 'react'

export type TanlovElement = { id: string; nom: string; izoh?: string }

type Xususiyat = {
  qiymat: string
  elementlar: TanlovElement[]
  ozgardi: (id: string) => void
  sarlavha?: string
  kenglik?: string
  ochiq?: boolean
}

// Brauzerning o'z ro'yxati o'rniga Ling dizaynidagi tanlov ro'yxati
export default function Tanlov({
  qiymat,
  elementlar,
  ozgardi,
  sarlavha,
  kenglik = 'w-56'
}: Xususiyat) {
  const [ochiq, setOchiq] = useState(false)
  const qutiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ochiq) return
    const tashqariga = (h: MouseEvent): void => {
      if (!qutiRef.current?.contains(h.target as Node)) setOchiq(false)
    }
    const tugma = (h: KeyboardEvent): void => {
      if (h.key === 'Escape') setOchiq(false)
    }
    document.addEventListener('mousedown', tashqariga)
    document.addEventListener('keydown', tugma)
    return () => {
      document.removeEventListener('mousedown', tashqariga)
      document.removeEventListener('keydown', tugma)
    }
  }, [ochiq])

  const joriy = elementlar.find((e) => e.id === qiymat)

  return (
    <div ref={qutiRef} className={`relative ${kenglik}`}>
      <button
        onClick={() => setOchiq((v) => !v)}
        disabled={elementlar.length === 0}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-2xl border px-3 text-sm font-semibold transition disabled:opacity-40 ${
          ochiq
            ? 'border-[#7cb7ff] bg-[#1f2023] text-[#e8e9eb]'
            : 'border-[#45474a] bg-[#1f2023] text-[#e8e9eb] hover:bg-[#28292c]'
        }`}
      >
        <span className="truncate">{joriy?.nom ?? sarlavha ?? 'Tanlang'}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition ${ochiq ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {ochiq && (
        <div className="absolute right-0 top-full z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-[#45474a] bg-[#1f2023] p-1.5 shadow-2xl">
          {sarlavha && (
            <div className="px-3 py-2 text-[11px] font-bold tracking-wide text-[#909296]">
              {sarlavha}
            </div>
          )}
          {elementlar.map((element) => (
            <button
              key={element.id}
              onClick={() => {
                ozgardi(element.id)
                setOchiq(false)
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                element.id === qiymat
                  ? 'bg-[#1d3b66] font-bold text-[#d6e6ff]'
                  : 'text-[#e8e9eb] hover:bg-[#28292c]'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{element.nom}</span>
                {element.izoh && (
                  <span className="block truncate text-[11px] text-[#909296]">{element.izoh}</span>
                )}
              </span>
              {element.id === qiymat && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
