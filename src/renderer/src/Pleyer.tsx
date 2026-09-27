import { useEffect, useState, type ReactNode } from 'react'
import type { Pleyer as PleyerTuri } from './usePleyer'

type Tab = 'papka' | 'tashqi'

function daqiqa(soniya: number): string {
  if (!Number.isFinite(soniya) || soniya < 0) return '0:00'
  const s = Math.floor(soniya)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// "Spotify.exe" -> "Spotify", "Microsoft.ZuneMusic_8wekyb3d8bbwe!Microsoft.ZuneMusic" -> "ZuneMusic"
function ilovaNomi(id: string): string {
  const oxiri = id.split('!').pop() ?? id
  const nom =
    oxiri
      .replace(/\.exe$/i, '')
      .split('.')
      .pop() ?? oxiri
  const malum: Record<string, string> = {
    chrome: 'Chrome',
    msedge: 'Edge',
    firefox: 'Firefox',
    spotify: 'Spotify',
    zunemusic: 'Media Player',
    telegram: 'Telegram'
  }
  return malum[nom.toLowerCase()] ?? nom
}

function MusiqaIkonka({ olcham = 20 }: { olcham?: number }) {
  return (
    <svg
      width={olcham}
      height={olcham}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </svg>
  )
}

function Boshqaruv({
  ijroda,
  faol = true,
  oldingiFaol = true,
  keyingiFaol = true,
  oldingi,
  almashtir,
  keyingi
}: {
  ijroda: boolean
  faol?: boolean
  oldingiFaol?: boolean
  keyingiFaol?: boolean
  oldingi: () => void
  almashtir: () => void
  keyingi: () => void
}) {
  const kichik =
    'flex h-10 w-10 items-center justify-center rounded-2xl text-[#e8e9eb] transition hover:bg-[#28292c] disabled:opacity-30 disabled:hover:bg-transparent'
  return (
    <div className="flex items-center justify-center gap-3">
      <button onClick={oldingi} disabled={!oldingiFaol} className={kichik} title="Oldingi">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 6l-8 6 8 6z" />
          <rect x="5" y="6" width="2.4" height="12" rx="1" />
        </svg>
      </button>
      <button
        onClick={almashtir}
        disabled={!faol}
        title={ijroda ? 'Pauza' : 'Ijro'}
        style={{ transitionTimingFunction: 'var(--silliq)', transitionDuration: '480ms' }}
        className={`flex h-12 w-12 items-center justify-center bg-[#f2f3f5] text-[#111214] transition-all hover:bg-white disabled:opacity-30 ${
          ijroda ? 'rounded-2xl' : 'rounded-3xl'
        }`}
      >
        {ijroda ? (
          <svg
            key="pauza"
            className="anim-pop"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="6" y="5" width="4" height="14" rx="1.2" />
            <rect x="14" y="5" width="4" height="14" rx="1.2" />
          </svg>
        ) : (
          <svg
            key="ijro"
            className="anim-pop"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5l11 7-11 7z" />
          </svg>
        )}
      </button>
      <button onClick={keyingi} disabled={!keyingiFaol} className={kichik} title="Keyingi">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6l8 6-8 6z" />
          <rect x="16.6" y="6" width="2.4" height="12" rx="1" />
        </svg>
      </button>
    </div>
  )
}

function Trek({ sarlavha, izoh, faol }: { sarlavha: ReactNode; izoh: ReactNode; faol: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        style={{ transitionTimingFunction: 'var(--silliq)', transitionDuration: '520ms' }}
        className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center transition-all ${
          faol
            ? 'rounded-[26px] bg-[#1d3b66] text-[#d6e6ff]'
            : 'rounded-2xl bg-[#28292c] text-[#909296]'
        }`}
      >
        <MusiqaIkonka olcham={24} />
      </span>
      <div key={String(sarlavha)} className="anim-paydo min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold">{sarlavha}</div>
        <div className="truncate text-xs text-[#c4c6ca]">{izoh}</div>
      </div>
    </div>
  )
}

export default function Pleyer({ pleyer }: { pleyer: PleyerTuri }) {
  const [tab, setTab] = useState<Tab>('papka')
  const [tanlanganmi, setTanlanganmi] = useState(false)

  // Papka tanlanmagan, lekin tashqarida nimadir o'ynayotgan bo'lsa — "Tashqi" ochiladi
  useEffect(() => {
    if (!tanlanganmi && !pleyer.papka && pleyer.tashqi?.bor) setTab('tashqi')
  }, [pleyer.papka, pleyer.tashqi?.bor])

  function tabTanla(yangi: Tab): void {
    setTanlanganmi(true)
    setTab(yangi)
  }

  const trek = pleyer.treklar[pleyer.joriy]
  const navbat = pleyer.treklar.length
    ? [1, 2].map((q) => pleyer.treklar[(pleyer.joriy + q) % pleyer.treklar.length]).filter(Boolean)
    : []
  const t = pleyer.tashqi

  return (
    <section className="flex shrink-0 flex-col gap-3.5 rounded-[28px] bg-[#1f2023] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#28292c] text-[#7cb7ff]">
            <MusiqaIkonka />
          </span>
          <h2 className="text-[22px] font-bold">Pleyer</h2>
        </div>
        <div className="flex gap-0.5">
          {(
            [
              ['papka', 'Papka', 'rounded-l-2xl rounded-r-md'],
              ['tashqi', 'Tashqi', 'rounded-l-md rounded-r-2xl']
            ] as const
          ).map(([id, nom, shakl]) => (
            <button
              key={id}
              onClick={() => tabTanla(id)}
              className={`h-8 px-3 text-[13px] transition ${shakl} ${
                tab === id
                  ? 'bg-[#f2f3f5] font-bold text-[#111214]'
                  : 'bg-[#28292c] font-semibold text-[#c4c6ca] hover:bg-[#333437]'
              }`}
            >
              {nom}
              {id === 'tashqi' && t?.holat === 'Playing' && (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#7cb7ff] align-middle" />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'papka' && !pleyer.papka && (
        <div className="anim-bolim flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-sm text-[#c4c6ca]">Musiqa papkasi tanlanmagan</p>
          <button
            onClick={pleyer.papkaTanla}
            className="h-10 rounded-2xl bg-[#1d3b66] px-4 text-sm font-bold text-[#d6e6ff] transition hover:bg-[#25497d]"
          >
            Papka tanlash
          </button>
        </div>
      )}

      {tab === 'papka' && pleyer.papka && (
        <div className="anim-bolim flex flex-col gap-3.5">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Trek
                faol={pleyer.ijroda}
                sarlavha={
                  trek?.nomi ??
                  (pleyer.treklar.length ? 'Trek tanlang' : 'Papkada musiqa topilmadi')
                }
                izoh={pleyer.xato ?? `${pleyer.treklar.length} ta trek · ${pleyer.papka}`}
              />
            </div>
            <button
              onClick={pleyer.papkaTanla}
              title="Boshqa papka tanlash"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#909296] transition hover:bg-[#28292c] hover:text-[#e8e9eb]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              >
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div
              onClick={(h) => {
                const chek = h.currentTarget.getBoundingClientRect()
                pleyer.sur((h.clientX - chek.left) / chek.width)
              }}
              className="flex h-3 cursor-pointer items-center"
              title="Oldinga yoki orqaga surish"
            >
              <div className="h-1 w-full rounded-full bg-[#45474a]">
                <div
                  className="h-1 rounded-full bg-[#7cb7ff] transition-[width] duration-300 ease-linear"
                  style={{
                    width: `${pleyer.davomiylik ? (pleyer.vaqt / pleyer.davomiylik) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#909296]">
              <span>{daqiqa(pleyer.vaqt)}</span>
              <span>{daqiqa(pleyer.davomiylik)}</span>
            </div>
          </div>

          <Boshqaruv
            ijroda={pleyer.ijroda}
            faol={pleyer.treklar.length > 0}
            oldingiFaol={pleyer.treklar.length > 0}
            keyingiFaol={pleyer.treklar.length > 0}
            oldingi={pleyer.oldingi}
            almashtir={pleyer.almashtir}
            keyingi={pleyer.keyingi}
          />

          {pleyer.joriy >= 0 && navbat.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-bold tracking-wider text-[#909296]">NAVBATDA</div>
              {navbat.map((n, i) => (
                <button
                  key={n.yol}
                  style={{ animationDelay: `${Math.min(i, 10) * 24}ms` }}
                  onClick={() => pleyer.ijro(pleyer.treklar.indexOf(n))}
                  className="anim-paydo truncate rounded-xl px-2.5 py-1.5 text-left text-[13px] text-[#c4c6ca] transition hover:bg-[#28292c]"
                >
                  {n.nomi}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tashqi' && (
        <div className="anim-bolim flex flex-col gap-3.5">
          <Trek
            faol={t?.holat === 'Playing'}
            sarlavha={t?.bor ? t.nom || 'Nomsiz' : "Hozir hech narsa o'ynamayapti"}
            izoh={
              t?.xato ??
              (t?.bor
                ? [t.ijrochi, ilovaNomi(t.ilova)].filter(Boolean).join(' · ')
                : 'Spotify, YouTube yoki boshqa pleyerda musiqa qo‘ying')
            }
          />
          <Boshqaruv
            ijroda={t?.holat === 'Playing'}
            faol={Boolean(t?.bor && t.pauzaMumkin)}
            oldingiFaol={Boolean(t?.bor && t.oldingiMumkin)}
            keyingiFaol={Boolean(t?.bor && t.keyingiMumkin)}
            oldingi={() => pleyer.tashqiBuyruq('oldingi')}
            almashtir={() => pleyer.tashqiBuyruq('almashtir')}
            keyingi={() => pleyer.tashqiBuyruq('keyingi')}
          />
        </div>
      )}
    </section>
  )
}
