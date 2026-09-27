import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Nusxa, TezkorSoz } from '../../preload'
import Pleyer from './Pleyer'
import type { Pleyer as PleyerTuri } from './usePleyer'

type Filtr = 'hammasi' | 'matn' | 'rasm' | 'video' | 'fayl'

type Xususiyat = {
  nusxalar: Nusxa[]
  sozlar: TezkorSoz[]
  ochirilganSoni: number
  qidiruv: string
  setQidiruv: (q: string) => void
  filtr: Filtr
  setFiltr: (f: Filtr) => void
  belgi: string | null
  hammasiYuklandi: boolean
  koproqYukla: () => void
  nusxala: (id: number) => void
  ochir: (id: number) => void
  sozNusxala: (id: number) => void
  sozOchir: (id: number) => void
  sozQoshish: (hodisa: FormEvent, nom: string, qiymat: string, maxfiy: boolean) => void
  ochirilganlarniOch: () => void
  pleyer: PleyerTuri
}

function vaqtMatni(vaqt: number): string {
  return new Date(vaqt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

// Pastga aylantirganda yuklangan har yangi 60 talik bo'lak ham qisqa kechikish bilan chiqadi
const SAHIFA = 60

const FILTRLAR: { id: Filtr; nom: string }[] = [
  { id: 'hammasi', nom: 'Hammasi' },
  { id: 'matn', nom: 'Matn' },
  { id: 'rasm', nom: 'Rasm' },
  { id: 'video', nom: 'Video' },
  { id: 'fayl', nom: 'Fayl' }
]

function Ikonka({
  turi
}: {
  turi: 'qatlam' | 'nusxa' | 'qulf' | 'kino' | 'matn' | 'havola' | 'hujjat'
}) {
  const yollar: Record<string, ReactNode> = {
    qatlam: (
      <>
        <path d="M12 3l9 4.5-9 4.5-9-4.5z" />
        <path d="M3 12l9 4.5 9-4.5" />
        <path d="M3 16.5l9 4.5 9-4.5" />
      </>
    ),
    nusxa: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="3" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    qulf: (
      <>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
    kino: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M10 9.5l5 2.5-5 2.5z" />
      </>
    ),
    matn: (
      <>
        <path d="M5 6h14M12 6v13" />
      </>
    ),
    hujjat: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </>
    ),
    havola: (
      <>
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </>
    )
  }
  return (
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
      {yollar[turi]}
    </svg>
  )
}

export default function Nest({
  nusxalar,
  sozlar,
  ochirilganSoni,
  qidiruv,
  setQidiruv,
  filtr,
  setFiltr,
  belgi,
  hammasiYuklandi,
  koproqYukla,
  nusxala,
  ochir,
  sozNusxala,
  sozOchir,
  sozQoshish,
  ochirilganlarniOch,
  pleyer
}: Xususiyat) {
  const [forma, setForma] = useState(false)
  const [nom, setNom] = useState('')
  const [qiymat, setQiymat] = useState('')
  const [maxfiy, setMaxfiy] = useState(false)
  // Ochish tugmasi sozlamalarda o'zgartirilishi mumkin
  const [tugma, setTugma] = useState('Ctrl + Shift + V')

  useEffect(() => {
    window.ling.tugmaYozuvi().then(setTugma)
  }, [])

  function saqla(hodisa: FormEvent): void {
    sozQoshish(hodisa, nom, qiymat, maxfiy)
    setNom('')
    setQiymat('')
    setMaxfiy(false)
    setForma(false)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      {/* Sarlavha */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#28292c] text-[#7cb7ff]">
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
              <path d="M12 3l9 4.5-9 4.5-9-4.5z" />
              <path d="M3 12l9 4.5 9-4.5" />
              <path d="M3 16.5l9 4.5 9-4.5" />
            </svg>
          </span>
          <div>
            <div className="text-[34px] font-extrabold leading-none tracking-tight">Nest</div>
            <div className="mt-1.5 text-sm text-[#c4c6ca]">
              Nusxalar, tezkor so&apos;zlar va pleyer, hammasi bir joyda
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[13px] text-[#c4c6ca]">
          Ochish tugmasi:
          <span className="flex gap-1 font-bold text-[#e8e9eb]">
            {tugma.split(' + ').map((k) => (
              <span key={k} className="rounded-lg bg-[#333437] px-2.5 py-1.5">
                {k}
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* Asosiy qism */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Nusxalar */}
        <section className="flex min-w-0 flex-1 flex-col gap-3 rounded-[28px] bg-[#1f2023] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#28292c] text-[#7cb7ff]">
                <Ikonka turi="nusxa" />
              </span>
              <h2 className="text-[22px] font-bold">Nusxalar</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {FILTRLAR.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltr(f.id)}
                  className={`h-8 px-3 text-[13px] font-semibold transition-all ${
                    filtr === f.id
                      ? 'rounded-2xl bg-[#3a3b3f] text-[#edeef0]'
                      : 'rounded-[10px] border border-[#45474a] text-[#c4c6ca] hover:bg-[#28292c]'
                  }`}
                >
                  {f.nom}
                </button>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <input
              value={qidiruv}
              onChange={(h) => setQidiruv(h.target.value)}
              placeholder="Nusxalarni qidirish"
              className="h-12 min-w-0 flex-1 rounded-3xl bg-[#333437] px-[18px] text-[15px] outline-none placeholder:text-[#909296]"
            />

            {/* O'chirilganlar: savatcha ikonkasi, soni faqat bor bo'lsa ko'rinadi */}
            <button
              onClick={ochirilganlarniOch}
              title="O'chirilganlar"
              aria-label="O'chirilganlar"
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#28292c] text-[#7cb7ff] transition hover:bg-[#333437]"
            >
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
                <path d="M4 7h16" />
                <path d="M9 7V4h6v3" />
                <path d="M6 7l1 13h10l1-13" />
              </svg>
              {ochirilganSoni > 0 && (
                <span className="anim-pop absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1d3b66] px-1.5 text-[11px] font-bold text-[#d6e6ff]">
                  {ochirilganSoni}
                </span>
              )}
            </button>
          </div>

          <div
            onScroll={(h) => {
              // Pastga 600 px qolganda keyingi sahifa yuklanadi
              const q = h.currentTarget
              if (q.scrollHeight - q.scrollTop - q.clientHeight < 600) koproqYukla()
            }}
            className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto"
          >
            {nusxalar.length === 0 && (
              <p className="anim-paydo pt-6 text-center text-sm text-[#909296]">
                {qidiruv
                  ? `"${qidiruv}" bo'yicha hech narsa topilmadi`
                  : filtr !== 'hammasi'
                    ? `Bu turdagi nusxa hali yo'q`
                    : "Hali nusxa yo'q. Biror joyda Ctrl+C bosing."}
              </p>
            )}

            {nusxalar.map((nusxa, i) => {
              const tanlangan = belgi === `n${nusxa.id}`
              return (
                <div
                  key={nusxa.id}
                  style={{ animationDelay: `${Math.min(i % SAHIFA, 12) * 22}ms` }}
                  className={`anim-paydo group flex h-[60px] shrink-0 items-center gap-3 rounded-[18px] px-3.5 transition ${
                    tanlangan ? 'bg-[#1d3b66] text-[#d6e6ff]' : 'bg-[#28292c] hover:bg-[#333437]'
                  }`}
                >
                  <button
                    onClick={() => nusxala(nusxa.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {nusxa.tur === 'rasm' && nusxa.fayl ? (
                      <img
                        src={`ling-rasm://${nusxa.fayl}?kichik`}
                        loading="lazy"
                        decoding="async"
                        alt=""
                        className="h-9 w-[52px] shrink-0 rounded-[10px] object-cover"
                      />
                    ) : (
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          tanlangan ? 'bg-[#f2f3f5] text-[#111214]' : 'bg-[#3a3b3f] text-[#edeef0]'
                        }`}
                      >
                        <Ikonka
                          turi={
                            nusxa.tur === 'video'
                              ? 'kino'
                              : nusxa.tur === 'fayl'
                                ? 'hujjat'
                                : nusxa.matn.startsWith('http')
                                  ? 'havola'
                                  : 'matn'
                          }
                        />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[15px]">{nusxa.matn}</span>
                  </button>

                  <span
                    className={`shrink-0 text-xs ${tanlangan ? 'text-[#9ec3f5]' : 'text-[#909296]'}`}
                  >
                    {nusxa.manba} · {vaqtMatni(nusxa.vaqt)}
                  </span>

                  {nusxa.tur !== 'matn' && nusxa.fayl && !tanlangan && (
                    <button
                      onClick={() => window.ling.faylOch(nusxa.id)}
                      className="shrink-0 rounded-lg bg-[#3a3b3f] px-2.5 py-1 text-[11px] font-bold text-[#edeef0] opacity-0 transition hover:bg-[#46474b] group-hover:opacity-100"
                      title="Windows'da ochish"
                    >
                      Ochish
                    </button>
                  )}

                  {tanlangan ? (
                    <span className="anim-pop shrink-0 rounded-full bg-[#f2f3f5] px-2.5 py-1 text-[11px] font-bold text-[#111214]">
                      Nusxa olindi
                    </span>
                  ) : (
                    <button
                      onClick={() => ochir(nusxa.id)}
                      className="shrink-0 px-1 text-[#909296] opacity-0 transition hover:text-[#f2b8b5] group-hover:opacity-100"
                      title="O'chirish"
                    >
                      &#10005;
                    </button>
                  )}
                </div>
              )
            })}

            {!hammasiYuklandi && nusxalar.length > 0 && (
              <p className="py-3 text-center text-xs text-[#909296]">Yuklanmoqda…</p>
            )}
          </div>
        </section>

        {/* O'ng ustun */}
        <aside className="flex w-[380px] shrink-0 flex-col gap-4">
          <Pleyer pleyer={pleyer} />

          {/* Tezkor so'zlar */}
          <section className="flex min-h-0 flex-1 flex-col gap-3 rounded-[28px] bg-[#1f2023] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#28292c] text-[#7cb7ff]">
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
                    <path d="M13 3L5 14h6l-1 7 8-11h-6z" />
                  </svg>
                </span>
                <h2 className="text-[22px] font-bold">Tezkor so&apos;zlar</h2>
              </div>
              <button
                onClick={() => setForma((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f2f3f5] text-[#111214] transition hover:bg-white"
                title={forma ? 'Bekor qilish' : "Qo'shish"}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  className={forma ? 'rotate-45' : ''}
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>

            {forma && (
              <form onSubmit={saqla} className="anim-paydo flex flex-col gap-2">
                <input
                  value={nom}
                  onChange={(h) => setNom(h.target.value)}
                  placeholder="nom (masalan: karta)"
                  className="h-10 rounded-xl bg-[#28292c] px-3.5 text-sm outline-none placeholder:text-[#909296]"
                />
                <input
                  value={qiymat}
                  onChange={(h) => setQiymat(h.target.value)}
                  placeholder="qiymat"
                  className="h-10 rounded-xl bg-[#28292c] px-3.5 text-sm outline-none placeholder:text-[#909296]"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-[#c4c6ca]">
                    <input
                      type="checkbox"
                      checked={maxfiy}
                      onChange={(h) => setMaxfiy(h.target.checked)}
                    />
                    maxfiy
                  </label>
                  <button
                    type="submit"
                    className="h-9 rounded-xl bg-[#1d3b66] px-4 text-sm font-bold text-[#d6e6ff]"
                  >
                    Saqlash
                  </button>
                </div>
              </form>
            )}

            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
              {sozlar.length === 0 && (
                <p className="pt-2 text-sm text-[#909296]">Hali tezkor so&apos;z yo&apos;q</p>
              )}
              {sozlar.map((soz, i) => {
                const tanlangan = belgi === `s${soz.id}`
                return (
                  <div
                    key={soz.id}
                    style={{ animationDelay: `${Math.min(i, 10) * 22}ms` }}
                    className={`anim-paydo group flex h-[52px] shrink-0 items-center gap-2.5 rounded-[18px] px-3.5 transition ${
                      tanlangan ? 'bg-[#1d3b66] text-[#d6e6ff]' : 'bg-[#28292c] hover:bg-[#333437]'
                    }`}
                  >
                    <span className={`shrink-0 ${tanlangan ? 'text-[#d6e6ff]' : 'text-[#c4c6ca]'}`}>
                      {soz.maxfiy ? <Ikonka turi="qulf" /> : <Ikonka turi="matn" />}
                    </span>
                    <button
                      onClick={() => sozNusxala(soz.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="w-16 shrink-0 truncate text-[15px] font-bold">
                        {soz.nom}
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate font-mono text-sm ${
                          tanlangan ? 'text-[#9ec3f5]' : 'text-[#c4c6ca]'
                        }`}
                      >
                        {soz.maxfiy ? '********' : soz.qiymat}
                      </span>
                    </button>
                    {tanlangan ? (
                      <span className="anim-pop shrink-0 rounded-full bg-[#f2f3f5] px-2.5 py-1 text-[11px] font-bold text-[#111214]">
                        Nusxa olindi
                      </span>
                    ) : (
                      <button
                        onClick={() => sozOchir(soz.id)}
                        className="shrink-0 px-1 text-[#909296] opacity-0 transition hover:text-[#f2b8b5] group-hover:opacity-100"
                        title="O'chirish"
                      >
                        &#10005;
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
