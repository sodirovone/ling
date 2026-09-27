import { useEffect, useState, type ReactNode } from 'react'
import type { CliHolat, Sozlamalar as SozlamalarTuri, Statistika } from '../../preload'
import antigravityIkonka from './assets/antigravity.png'

const MUDDATLAR: { kun: number; nom: string }[] = [
  { kun: 7, nom: '7 kun' },
  { kun: 30, nom: '30 kun' },
  { kun: 90, nom: '90 kun' },
  { kun: 0, nom: 'Cheksiz' }
]

// Segmentli tanlovning burchaklari: chetlari yumaloq, o'rtasi tekisroq
const SEGMENT_BURCHAK = ['24px 8px 8px 24px', '8px', '8px', '8px 24px 24px 8px']

function Belgi({ olcham = 14, qalinlik = 3 }: { olcham?: number; qalinlik?: number }) {
  return (
    <svg
      width={olcham}
      height={olcham}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={qalinlik}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

// Claude Code krabi (Clawd) — terminaldagi logotip bilan bir xil piksel chizma.
// Har bir "piksel" eni 1, bo'yi 2: terminal belgisining chorak bo'lagi shunday
const KRAB = [
  '   ############   ',
  '   ## ###### ##   ',
  ' ################ ',
  '   ############   ',
  '    # #    # #    '
]

function Krab() {
  return (
    <svg
      width="40"
      height="22"
      viewBox="0 0 18 10"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Claude Code"
    >
      {KRAB.flatMap((qator, y) =>
        [...qator].map((b, x) =>
          b === '#' ? (
            <rect key={`${x}-${y}`} x={x} y={y * 2} width={1.02} height={2.02} fill="#D97757" />
          ) : null
        )
      )}
    </svg>
  )
}

function KartaSarlavha({ ikonka, nom }: { ikonka: ReactNode; nom: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#28292c] text-[#7cb7ff]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ikonka}
        </svg>
      </div>
      <div className="text-[22px] font-bold">{nom}</div>
    </div>
  )
}

// Material uslubidagi yoqish/o'chirish tugmasi
function Almashtirgich({
  yoqilgan,
  ozgardi,
  ochiq = true
}: {
  yoqilgan: boolean
  ozgardi: (v: boolean) => void
  ochiq?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={yoqilgan}
      disabled={!ochiq}
      onClick={() => ozgardi(!yoqilgan)}
      className={`relative h-8 w-[52px] shrink-0 rounded-full border-2 transition-colors duration-300 disabled:opacity-40 ${
        yoqilgan ? 'border-[#f2f3f5] bg-[#f2f3f5]' : 'border-[#909296] bg-[#28292c]'
      }`}
    >
      <span
        style={{ transition: 'transform 320ms var(--silliq), width 320ms var(--silliq)' }}
        className={`absolute top-1/2 left-0 flex -translate-y-1/2 items-center justify-center rounded-full ${
          yoqilgan
            ? 'h-6 w-6 translate-x-[22px] bg-[#111214] text-[#f2f3f5]'
            : 'h-4 w-4 translate-x-[6px] bg-[#909296]'
        }`}
      >
        {yoqilgan && <Belgi />}
      </span>
    </button>
  )
}

function Qator({ nom, izoh, children }: { nom: string; izoh: string; children: ReactNode }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <div className="text-base font-semibold">{nom}</div>
        <div className="text-[13px] text-[#c4c6ca]">{izoh}</div>
      </div>
      {children}
    </div>
  )
}

// Klaviatura bosilishini Electron tugma yozuviga aylantiradi: Ctrl+Alt+K -> "Control+Alt+K"
function tugmaniOqi(h: KeyboardEvent): string | null {
  const kod = h.code
  let asosiy: string | null = null
  if (/^Key[A-Z]$/.test(kod)) asosiy = kod.slice(3)
  else if (/^Digit[0-9]$/.test(kod)) asosiy = kod.slice(5)
  else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(kod)) asosiy = kod
  else if (kod === 'Space') asosiy = 'Space'
  else if (kod.startsWith('Arrow')) asosiy = kod.slice(5)
  if (!asosiy) return null

  const qism: string[] = []
  if (h.ctrlKey) qism.push('Control')
  if (h.altKey) qism.push('Alt')
  if (h.shiftKey) qism.push('Shift')
  if (h.metaKey) qism.push('Super')
  // Faqat harf yoki faqat Shift+harf — oddiy yozishni buzadi, qabul qilmaymiz
  const funksional = /^F\d+$/.test(asosiy)
  if (!funksional && !h.ctrlKey && !h.altKey && !h.metaKey) return null
  return [...qism, asosiy].join('+')
}

function sonYoz(n: number): string {
  return n.toLocaleString('ru-RU').replace(/ /g, ' ')
}

function hajmYoz(bayt: number): string {
  if (bayt >= 1024 ** 3) return `${(bayt / 1024 ** 3).toFixed(1)} GB`
  if (bayt >= 1024 ** 2) return `${Math.round(bayt / 1024 ** 2)} MB`
  return `${Math.max(1, Math.round(bayt / 1024))} KB`
}

export default function Sozlamalar() {
  const [s, setS] = useState<SozlamalarTuri | null>(null)
  const [clilar, setClilar] = useState<CliHolat[] | null>(null)
  const [stat, setStat] = useState<Statistika | null>(null)
  const [yozilmoqda, setYozilmoqda] = useState(false)
  const [tugmaXato, setTugmaXato] = useState<string | null>(null)
  const [zaxira, setZaxira] = useState<'yoq' | 'olinmoqda' | 'tayyor' | 'xato'>('yoq')

  useEffect(() => {
    window.ling.sozlamalar().then(setS)
    window.ling.clilar().then(setClilar)
    window.ling.statistika().then(setStat)
  }, [])

  // Yangi Nest tugmasini tutib olish
  useEffect(() => {
    if (!yozilmoqda) return
    const tinglovchi = async (h: KeyboardEvent): Promise<void> => {
      h.preventDefault()
      if (h.key === 'Escape') {
        setYozilmoqda(false)
        return
      }
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(h.key)) return
      const yangi = tugmaniOqi(h)
      if (!yangi) {
        setTugmaXato('Ctrl, Alt yoki Win bilan birga bosing')
        return
      }
      setYozilmoqda(false)
      const natija = await window.ling.nestTugmasiniSaqla(yangi)
      setTugmaXato(natija.boldi ? null : 'Bu tugma band — boshqasini tanlang')
      setS((o) => (o ? { ...o, nestTugmasi: natija.tugma } : o))
    }
    window.addEventListener('keydown', tinglovchi)
    return () => window.removeEventListener('keydown', tinglovchi)
  }, [yozilmoqda])

  function ozgartir<K extends keyof SozlamalarTuri>(kalit: K, qiymat: SozlamalarTuri[K]): void {
    setS((o) => (o ? { ...o, [kalit]: qiymat } : o))
  }

  async function zaxiraOl(): Promise<void> {
    setZaxira('olinmoqda')
    const papka = await window.ling.zaxiraOl()
    setZaxira(papka ? 'tayyor' : 'yoq')
  }

  const tugmaQismlari = (s?.nestTugmasi ?? 'Control+Shift+V')
    .split('+')
    .map((q) => (q === 'Control' ? 'Ctrl' : q === 'Super' ? 'Win' : q))

  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded-[28px] bg-[#1a1b1e] px-10 py-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#28292c] text-[#7cb7ff]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
        </div>
        <h2 className="text-[45px] leading-[1.1] font-extrabold tracking-tight">Sozlamalar</h2>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Chap ustun */}
        <div className="flex flex-col gap-4">
          <div className="anim-paydo flex flex-col gap-1.5 rounded-[28px] bg-[#1f2023] p-6">
            <div className="pb-2">
              <KartaSarlavha
                nom="Nest"
                ikonka={
                  <>
                    <path d="M12 3l9 4.5-9 4.5-9-4.5z" />
                    <path d="M3 12l9 4.5 9-4.5" />
                    <path d="M3 16.5l9 4.5 9-4.5" />
                  </>
                }
              />
            </div>

            <Qator
              nom="Ochish tugmasi"
              izoh={
                yozilmoqda
                  ? 'Yangi tugmalarni bosing… (Esc — bekor)'
                  : (tugmaXato ?? "Nest'ni istalgan oyna ustida ochadi")
              }
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex gap-1 text-[13px] font-bold transition-opacity ${
                    yozilmoqda ? 'animate-pulse opacity-60' : ''
                  }`}
                >
                  {tugmaQismlari.map((q) => (
                    <span
                      key={q}
                      className="rounded-lg border-b-2 border-[#45474a] bg-[#333437] px-2.5 py-1.5 text-[#e8e9eb]"
                    >
                      {q}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setTugmaXato(null)
                    setYozilmoqda((v) => !v)
                  }}
                  className="text-sm font-bold text-[#7cb7ff] hover:text-[#a9cfff]"
                >
                  {yozilmoqda ? 'Bekor' : "O'zgartirish"}
                </button>
              </div>
            </Qator>

            <div className="h-px bg-[#333437]" />

            <Qator nom="Burchakdan ochish" izoh="Kursor pastki chap burchakka tegsa">
              <Almashtirgich
                yoqilgan={s?.burchak ?? true}
                ozgardi={(v) => {
                  ozgartir('burchak', v)
                  window.ling.burchakniSaqla(v)
                }}
              />
            </Qator>

            <div className="h-px bg-[#333437]" />

            <Qator
              nom="Windows bilan birga ishga tushish"
              izoh={
                s && !s.avtoMumkin
                  ? "O'rnatilgan Ling'da ishlaydi (hozir sinov rejimi)"
                  : 'Kompyuter yoqilganda Ling fonda ochiladi'
              }
            >
              <Almashtirgich
                yoqilgan={s?.avto ?? true}
                ochiq={Boolean(s?.avtoMumkin)}
                ozgardi={(v) => {
                  ozgartir('avto', v)
                  window.ling.avtoniSaqla(v)
                }}
              />
            </Qator>
          </div>

          <div
            style={{ animationDelay: '60ms' }}
            className="anim-paydo flex flex-col gap-4 rounded-[28px] bg-[#1f2023] p-6"
          >
            <div className="flex flex-col gap-0.5">
              <KartaSarlavha
                nom="O'chirilganlar muddati"
                ikonka={
                  <>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v4l3 2" />
                  </>
                }
              />
              <div className="text-[13px] text-[#c4c6ca]">
                {s?.muddat === 0
                  ? "O'chirilganlar hech qachon butunlay o'chmaydi"
                  : "Muddat tugagach narsa butunlay o'chadi"}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-0.5">
              {MUDDATLAR.map((m, i) => {
                const tanlangan = s?.muddat === m.kun
                return (
                  <button
                    key={m.kun}
                    onClick={() => {
                      ozgartir('muddat', m.kun)
                      window.ling.muddatniSaqla(m.kun)
                    }}
                    style={{ borderRadius: tanlangan ? '24px' : SEGMENT_BURCHAK[i] }}
                    className={`flex h-12 items-center justify-center gap-1.5 text-[15px] transition-colors duration-300 ${
                      tanlangan
                        ? 'bg-[#f2f3f5] font-bold text-[#111214]'
                        : 'bg-[#28292c] font-semibold text-[#c4c6ca] hover:bg-[#333437]'
                    }`}
                  >
                    {tanlangan && <Belgi olcham={16} qalinlik={2.6} />}
                    {m.nom}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* O'ng ustun */}
        <div className="flex flex-col gap-4">
          <div
            style={{ animationDelay: '40ms' }}
            className="anim-paydo flex flex-col gap-3 rounded-[28px] bg-[#1f2023] p-6"
          >
            <div className="pb-1">
              <KartaSarlavha
                nom="AI ulanishlar"
                ikonka={<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />}
              />
            </div>
            {(clilar ?? [null, null]).map((cli, i) => (
              <div
                key={cli?.id ?? i}
                className="flex items-center gap-3.5 rounded-[20px] bg-[#28292c] px-4 py-3.5"
                title={cli?.yol ?? undefined}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                  {i === 0 ? (
                    <Krab />
                  ) : (
                    <img src={antigravityIkonka} alt="Antigravity" className="h-10 w-10" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="text-base font-bold">
                    {i === 0 ? 'Claude Code' : 'Gemini · Antigravity'}
                  </div>
                  <div className="truncate text-[13px] text-[#c4c6ca]">
                    {!cli
                      ? 'Tekshirilmoqda…'
                      : cli.topildi
                        ? `Obuna orqali · CLI topildi${cli.versiya ? ` · v${cli.versiya}` : ''}`
                        : "CLI topilmadi — chatdagi yo'riqnomaga qarang"}
                  </div>
                </div>
                {cli && (
                  <div
                    className={`anim-pop flex h-[30px] items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${
                      cli.topildi ? 'bg-[#1d3b66] text-[#d6e6ff]' : 'bg-[#3a1d1c] text-[#f2b8b5]'
                    }`}
                  >
                    {cli.topildi && <Belgi />}
                    {cli.topildi ? 'Ulangan' : 'Topilmadi'}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            style={{ animationDelay: '100ms' }}
            className="anim-paydo flex items-center justify-between gap-4 rounded-[28px] bg-[#1f2023] p-6"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <KartaSarlavha
                nom="Pleyer"
                ikonka={
                  <>
                    <path d="M9 18V6l10-2v12" />
                    <circle cx="6.5" cy="18" r="2.5" />
                    <circle cx="16.5" cy="16" r="2.5" />
                  </>
                }
              />
              <div className="truncate text-[13px] text-[#c4c6ca]">
                Musiqa papkasi:{' '}
                <span className="font-mono text-[#e8e9eb]">{s?.musiqaPapka ?? 'tanlanmagan'}</span>
              </div>
            </div>
            <button
              onClick={async () => {
                const natija = await window.ling.pleyerPapkaTanla()
                if (natija) ozgartir('musiqaPapka', natija.papka)
              }}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-[#909296] px-[18px] text-sm font-bold text-[#f2f3f5] hover:bg-[#28292c]"
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
                <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
              </svg>
              Tanlash
            </button>
          </div>

          <div
            style={{ animationDelay: '140ms' }}
            className="anim-paydo flex flex-col gap-3.5 rounded-[28px] bg-[#1f2023] p-6"
          >
            <KartaSarlavha
              nom="Ma'lumotlar"
              ikonka={
                <>
                  <ellipse cx="12" cy="6" rx="7" ry="3" />
                  <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
                  <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
                </>
              }
            />
            <div className="grid grid-cols-4 gap-2">
              {[
                { son: stat ? sonYoz(stat.nusxa) : '…', nom: 'nusxa' },
                { son: stat ? sonYoz(stat.tezkor) : '…', nom: "tezkor so'z" },
                { son: stat ? sonYoz(stat.suhbat) : '…', nom: 'suhbat' },
                { son: stat ? hajmYoz(stat.hajm) : '…', nom: 'baza hajmi' }
              ].map((x, i) => (
                <div key={x.nom} className="flex flex-col gap-0.5">
                  <div
                    className={`text-[28px] font-extrabold ${i === 0 ? 'text-[#f2f3f5]' : 'text-[#e8e9eb]'}`}
                  >
                    {x.son}
                  </div>
                  <div className="text-[13px] text-[#c4c6ca]">{x.nom}</div>
                </div>
              ))}
            </div>

            <div className="h-px bg-[#333437]" />

            {/* Hammasi faqat shu kompyuterda — xohlagan payt qo'lda zaxira olish mumkin */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-[13px] text-[#c4c6ca]">
                {zaxira === 'tayyor'
                  ? 'Zaxira saqlandi — papka ochildi'
                  : "Ma'lumotlar faqat shu kompyuterda. Zaxira — baza, rasmlar va fayllar nusxasi."}
              </div>
              <button
                onClick={zaxiraOl}
                disabled={zaxira === 'olinmoqda'}
                className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#1d3b66] px-4 text-sm font-bold text-[#d6e6ff] hover:bg-[#25497d] disabled:opacity-50"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                </svg>
                {zaxira === 'olinmoqda' ? 'Saqlanmoqda…' : 'Zaxira olish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
