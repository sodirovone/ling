import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { Kuch, Model, Nusxa, Provayder, Suhbat, Xabar } from '../../preload'
import Tanlov from './Tanlov'

// Diqqat: preload'dan faqat TIP import qilinadi. Qiymat import qilinsa,
// Electron moduli oyna tomoniga tushib, sahifa ishga tushmaydi.
const KUCH_NOMLARI: Record<Kuch, string> = {
  low: 'Past',
  medium: "O'rta",
  high: 'Yuqori',
  xhigh: 'Juda yuqori',
  max: 'Maksimal'
}

const XATO_NOMLARI: Record<NonNullable<Xabar['xatoTuri']>, string> = {
  topilmadi: 'CLI topilmadi',
  kirilmagan: 'kirilmagan',
  limit: 'limit',
  boshqa: 'boshqa'
}

const PROVAYDERLAR: { id: Provayder; nom: string }[] = [
  { id: 'claude', nom: 'Claude' },
  { id: 'gemini', nom: 'Gemini' }
]

// Modelning eng yuqori kuchi standart bo'lsin
function standartKuch(royxat: Model[], modelId: string): Kuch {
  const kuchlar = royxat.find((m) => m.id === modelId)?.kuchlar ?? []
  if (kuchlar.includes('high')) return 'high'
  return kuchlar.at(-1) ?? 'medium'
}

function vaqtMatni(vaqt: number): string {
  return new Date(vaqt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

function kengaytma(nomi: string): string {
  const m = nomi.match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toUpperCase() : 'FAYL'
}

// Xabardagi rasmlar (katta ko'rinishda) va hujjat kartalari (HTML, PDF...)
function Fayllar({ fayllar }: { fayllar: Nusxa[] }) {
  const [nusxalandi, setNusxalandi] = useState<number | null>(null)
  const rasmlar = fayllar.filter((f) => f.tur === 'rasm' && f.fayl)
  const boshqalar = fayllar.filter((f) => f.tur !== 'rasm' && f.tur !== 'matn' && f.fayl)

  async function nusxala(id: number): Promise<void> {
    await window.ling.nusxala(id)
    setNusxalandi(id)
    setTimeout(() => setNusxalandi((v) => (v === id ? null : v)), 1400)
  }

  if (!rasmlar.length && !boshqalar.length) return null

  return (
    <div className="mt-3 flex flex-col gap-2">
      {rasmlar.length > 0 && (
        <div className={`grid gap-2 ${rasmlar.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {rasmlar.map((r) => (
            <div key={r.id} className="group relative overflow-hidden rounded-2xl bg-[#111214]">
              <img
                src={`ling-rasm://${r.fayl}`}
                alt={r.matn}
                decoding="async"
                onClick={() => window.ling.faylOch(r.id)}
                className="max-h-[420px] w-full cursor-zoom-in object-contain"
              />
              <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => nusxala(r.id)}
                  className="rounded-xl bg-[#111214]/85 px-3 py-1.5 text-xs font-bold text-[#e8e9eb] backdrop-blur hover:bg-[#28292c]"
                >
                  {nusxalandi === r.id ? 'Nusxalandi' : 'Nusxa'}
                </button>
                <button
                  onClick={() => window.ling.faylPapkada(r.id)}
                  className="rounded-xl bg-[#111214]/85 px-3 py-1.5 text-xs font-bold text-[#e8e9eb] backdrop-blur hover:bg-[#28292c]"
                >
                  Papkada
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {boshqalar.map((f) => (
        <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-[#28292c] p-2.5 pr-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1d3b66] text-[10px] font-extrabold tracking-wide text-[#d6e6ff]">
            {kengaytma(f.matn)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[#e8e9eb]">{f.matn}</div>
            <div className="text-[11px] text-[#909296]">
              {f.manba === 'ai' ? 'AI yaratdi' : f.tur === 'video' ? 'Video' : 'Biriktirilgan'} ·
              Nest&apos;da ham bor
            </div>
          </div>
          <button
            onClick={() => window.ling.faylOch(f.id)}
            className="rounded-xl bg-[#f2f3f5] px-3.5 py-2 text-xs font-bold text-[#111214] transition hover:bg-white"
          >
            Ochish
          </button>
          <button
            onClick={() => nusxala(f.id)}
            className="rounded-xl bg-[#3a3b3f] px-3 py-2 text-xs font-bold text-[#edeef0] transition hover:bg-[#46474b]"
          >
            {nusxalandi === f.id ? 'Nusxalandi' : 'Nusxa'}
          </button>
          <button
            onClick={() => window.ling.faylPapkada(f.id)}
            className="rounded-xl bg-[#3a3b3f] px-3 py-2 text-xs font-bold text-[#edeef0] transition hover:bg-[#46474b]"
          >
            Papkada
          </button>
        </div>
      ))}
    </div>
  )
}

export default function Chat() {
  const [suhbatlar, setSuhbatlar] = useState<Suhbat[]>([])
  const [joriy, setJoriy] = useState<Suhbat | null>(null)
  const [xabarlar, setXabarlar] = useState<Xabar[]>([])
  const [modellar, setModellar] = useState<Model[]>([])
  const [matn, setMatn] = useState('')
  const [oqim, setOqim] = useState('')
  const [kutmoqda, setKutmoqda] = useState(false)
  const [nestOchiq, setNestOchiq] = useState(false)
  const [nusxalar, setNusxalar] = useState<Nusxa[]>([])
  const [biriktirmalar, setBiriktirmalar] = useState<Nusxa[]>([])
  const oxiri = useRef<HTMLDivElement>(null)

  async function suhbatlarniYukla(): Promise<void> {
    const royxat = await window.ling.chatSuhbatlar()
    setSuhbatlar(royxat)
    if (!joriy && royxat.length) ochish(royxat[0])
  }

  useEffect(() => {
    suhbatlarniYukla()
  }, [])

  useEffect(
    () =>
      window.ling.chatBolakKelganda(({ suhbatId, bolak }) => {
        if (suhbatId === joriy?.id) setOqim((oldingi) => oldingi + bolak)
      }),
    [joriy?.id]
  )

  useEffect(() => {
    oxiri.current?.scrollIntoView({ behavior: 'smooth' })
  }, [xabarlar, oqim])

  async function modellarniYukla(provayder: Provayder): Promise<Model[]> {
    const royxat = await window.ling.chatModellar(provayder)
    setModellar(royxat)
    return royxat
  }

  async function ochish(suhbat: Suhbat): Promise<void> {
    setJoriy(suhbat)
    setOqim('')
    setXabarlar(await window.ling.chatXabarlar(suhbat.id))
    modellarniYukla(suhbat.provayder)
  }

  async function yangiSuhbat(): Promise<void> {
    const provayder: Provayder = joriy?.provayder ?? 'gemini'
    const royxat = await modellarniYukla(provayder)
    const model = joriy?.model ?? royxat[0]?.id ?? 'gemini-3.7-flash'
    const kuch = joriy?.kuch ?? standartKuch(royxat, model)
    const suhbat = await window.ling.chatYangi(provayder, model, kuch)
    setJoriy(suhbat)
    setXabarlar([])
    setOqim('')
    suhbatlarniYukla()
  }

  async function provayderniAlmashtir(provayder: Provayder): Promise<void> {
    if (!joriy || joriy.provayder === provayder) return
    const royxat = await modellarniYukla(provayder)
    const model = royxat[0]?.id ?? ''
    const kuch = standartKuch(royxat, model)
    await window.ling.chatSozla(joriy.id, provayder, model, kuch)
    setJoriy({ ...joriy, provayder, model, kuch })
    suhbatlarniYukla()
  }

  async function modelniAlmashtir(model: string): Promise<void> {
    if (!joriy) return
    const kuchlar = modellar.find((m) => m.id === model)?.kuchlar ?? []
    const kuch = kuchlar.includes(joriy.kuch) ? joriy.kuch : standartKuch(modellar, model)
    await window.ling.chatSozla(joriy.id, joriy.provayder, model, kuch)
    setJoriy({ ...joriy, model, kuch })
  }

  async function kuchniAlmashtir(kuch: Kuch): Promise<void> {
    if (!joriy) return
    await window.ling.chatSozla(joriy.id, joriy.provayder, joriy.model, kuch)
    setJoriy({ ...joriy, kuch })
  }

  // Qaysi suhbat uchun "o'chirilsinmi?" so'ralayotgani
  const [ochirishSorov, setOchirishSorov] = useState<number | null>(null)

  async function suhbatniOchir(id: number): Promise<void> {
    setOchirishSorov(null)
    await window.ling.chatSuhbatOchirish(id)
    if (joriy?.id === id) {
      setJoriy(null)
      setXabarlar([])
    }
    suhbatlarniYukla()
  }

  // Escape — o'chirishdan voz kechish
  useEffect(() => {
    if (ochirishSorov === null) return
    const tinglovchi = (h: KeyboardEvent): void => {
      if (h.key === 'Escape') setOchirishSorov(null)
    }
    window.addEventListener('keydown', tinglovchi)
    return () => window.removeEventListener('keydown', tinglovchi)
  }, [ochirishSorov])

  async function nestniOch(): Promise<void> {
    setNusxalar(await window.ling.royxat({ chegara: 12 }))
    setNestOchiq((v) => !v)
  }

  function biriktir(yangilar: Nusxa[]): void {
    setBiriktirmalar((o) => [...o, ...yangilar.filter((y) => !o.some((x) => x.id === y.id))])
  }

  async function kompyuterdan(): Promise<void> {
    setNestOchiq(false)
    biriktir(await window.ling.chatKompyuterdan())
  }

  // Fayllarni chat oynasiga sudrab tashlash
  const [sudralmoqda, setSudralmoqda] = useState(false)

  async function tashlandi(h: DragEvent): Promise<void> {
    h.preventDefault()
    setSudralmoqda(false)
    const fayllar = [...h.dataTransfer.files]
    if (fayllar.length) biriktir(await window.ling.chatFayllardan(fayllar))
  }

  async function yubor(): Promise<void> {
    if (!matn.trim() || kutmoqda) return
    let suhbat = joriy
    if (!suhbat) {
      const royxat = await modellarniYukla('gemini')
      const asosiy = royxat[0]?.id ?? 'gemini-3.7-flash'
      suhbat = await window.ling.chatYangi('gemini', asosiy, standartKuch(royxat, asosiy))
      setJoriy(suhbat)
    }

    const savol = matn.trim()
    const biriktirilgan = biriktirmalar
    setMatn('')
    setBiriktirmalar([])
    setNestOchiq(false)
    await jonat(suhbat, savol, biriktirilgan)
  }

  // Xabarni AI'ga jo'natadi va javobni kutadi (yangi xabar ham, tahrirlangani ham)
  async function jonat(suhbat: Suhbat, savol: string, biriktirilgan: Nusxa[]): Promise<void> {
    const idlar = biriktirilgan.map((b) => b.id)
    setKutmoqda(true)
    setOqim('')

    setXabarlar((oldingi) => [
      ...oldingi,
      {
        id: -Date.now(),
        suhbatId: suhbat!.id,
        rol: 'men',
        matn: savol,
        provayder: null,
        model: null,
        xato: 0,
        xatoTuri: null,
        vaqt: Date.now(),
        fayllar: biriktirilgan
      }
    ])

    await window.ling.chatYubor(suhbat.id, savol, idlar)
    setOqim('')
    setKutmoqda(false)
    setXabarlar(await window.ling.chatXabarlar(suhbat.id))
    suhbatlarniYukla()
  }

  // --- Xabarni tahrirlash va nusxalash ---
  const [tahrir, setTahrir] = useState<{ id: number; matn: string } | null>(null)
  const [nusxalangan, setNusxalangan] = useState<number | null>(null)

  async function xabarniNusxala(xabar: Xabar): Promise<void> {
    await window.ling.chatNusxala(xabar.matn)
    setNusxalangan(xabar.id)
    setTimeout(() => setNusxalangan((v) => (v === xabar.id ? null : v)), 1400)
  }

  // Tahrirlangan savol qayta yuboriladi: shu xabardan keyingi javoblar o'chib, yangisi yoziladi
  async function tahrirniSaqla(xabar: Xabar): Promise<void> {
    if (!joriy || !tahrir || kutmoqda) return
    const yangiMatn = tahrir.matn.trim()
    setTahrir(null)
    // O'zgarmagan bo'lsa yoki xabar hali saqlanmagan bo'lsa — hech narsa qilmaymiz
    if (!yangiMatn || yangiMatn === xabar.matn.trim() || xabar.id < 0) return
    const joyi = xabarlar.findIndex((x) => x.id === xabar.id)
    await window.ling.chatQirq(joriy.id, xabar.id)
    setXabarlar((oldingi) => oldingi.slice(0, Math.max(joyi, 0)))
    await jonat(
      joriy,
      yangiMatn,
      (xabar.fayllar ?? []).filter((f) => f.manba !== 'ai')
    )
  }

  const hozirgiKuchlar = modellar.find((m) => m.id === joriy?.model)?.kuchlar ?? []

  return (
    <div className="flex h-full min-h-0 gap-4">
      {/* Chap ustun: suhbatlar */}
      <aside className="flex w-60 shrink-0 flex-col gap-3">
        <button
          onClick={yangiSuhbat}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#1d3b66] text-sm font-bold text-[#d6e6ff] transition hover:bg-[#25497d]"
        >
          <span className="text-lg leading-none">+</span> Yangi suhbat
        </button>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {suhbatlar.length === 0 && (
            <p className="px-2 pt-2 text-xs text-[#909296]">Hali suhbat yo&apos;q</p>
          )}
          {suhbatlar.map((suhbat, i) =>
            ochirishSorov === suhbat.id ? (
              // O'chirishdan oldin tasdiq: tasodifan bosilsa suhbat yo'qolmaydi
              <div
                key={suhbat.id}
                className="anim-pop flex flex-col gap-2 rounded-2xl bg-[#1f1416] px-3 py-2.5"
              >
                <div className="truncate text-sm font-semibold text-[#f2b8b5]">
                  &quot;{suhbat.nom}&quot; o&apos;chirilsinmi?
                </div>
                <div className="flex gap-1.5">
                  <button
                    autoFocus
                    onClick={() => suhbatniOchir(suhbat.id)}
                    className="flex-1 rounded-xl bg-[#8c1d18] py-1.5 text-xs font-bold text-[#ffdad6] hover:bg-[#a52a23]"
                  >
                    Ha, o&apos;chirish
                  </button>
                  <button
                    onClick={() => setOchirishSorov(null)}
                    className="flex-1 rounded-xl bg-[#3a3b3f] py-1.5 text-xs font-bold text-[#edeef0] hover:bg-[#46474b]"
                  >
                    Yo&apos;q
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={suhbat.id}
                style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
                className={`anim-paydo group flex items-center gap-1 rounded-2xl px-3 py-2.5 transition ${
                  joriy?.id === suhbat.id ? 'bg-[#3a3b3f]' : 'hover:bg-[#1f2023]'
                }`}
              >
                <button onClick={() => ochish(suhbat)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-semibold">{suhbat.nom}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#909296]">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        suhbat.provayder === 'claude' ? 'bg-[#f2f3f5]' : 'bg-[#7cb7ff]'
                      }`}
                    />
                    {suhbat.provayder === 'claude' ? 'Claude' : 'Gemini'}
                  </div>
                </button>
                <button
                  onClick={() => setOchirishSorov(suhbat.id)}
                  className="shrink-0 px-1 text-[#909296] opacity-0 transition hover:text-[#f2b8b5] group-hover:opacity-100"
                  title="Suhbatni o'chirish"
                >
                  &#10005;
                </button>
              </div>
            )
          )}
        </div>
      </aside>

      {/* O'ng: suhbat oynasi */}
      <section
        onDragOver={(h) => {
          if (!h.dataTransfer.types.includes('Files')) return
          h.preventDefault()
          setSudralmoqda(true)
        }}
        onDragLeave={(h) => {
          if (!h.currentTarget.contains(h.relatedTarget as Node)) setSudralmoqda(false)
        }}
        onDrop={tashlandi}
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col rounded-3xl bg-[#1a1b1e] transition ${
          sudralmoqda ? 'ring-2 ring-[#7cb7ff]' : ''
        }`}
      >
        {sudralmoqda && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-[#111214]/80 text-base font-bold text-[#d6e6ff]">
            Faylni shu yerga tashlang — chatga biriktiriladi
          </div>
        )}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#28292c] px-6 py-4">
          <div className="min-w-0">
            <div className="truncate text-[17px] font-bold">
              {joriy?.nom ?? 'Suhbat tanlanmagan'}
            </div>
            <div className="text-xs text-[#909296]">
              {xabarlar.length ? `${xabarlar.length} ta xabar` : 'Yangi suhbat'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-2xl bg-[#28292c] p-1">
              {PROVAYDERLAR.map((p) => (
                <button
                  key={p.id}
                  onClick={() => provayderniAlmashtir(p.id)}
                  disabled={!joriy}
                  className={`rounded-xl px-4 py-1.5 text-sm font-bold transition disabled:opacity-40 ${
                    joriy?.provayder === p.id
                      ? 'bg-[#f2f3f5] text-[#111214]'
                      : 'text-[#c4c6ca] hover:text-[#e8e9eb]'
                  }`}
                >
                  {p.nom}
                </button>
              ))}
            </div>

            <Tanlov
              sarlavha="MODEL"
              qiymat={joriy?.model ?? ''}
              elementlar={modellar.map((m) => ({ id: m.id, nom: m.nom }))}
              ozgardi={modelniAlmashtir}
              kenglik="w-52"
            />

            <Tanlov
              sarlavha="KUCH"
              qiymat={joriy?.kuch ?? 'medium'}
              elementlar={hozirgiKuchlar.map((k) => ({
                id: k,
                nom: KUCH_NOMLARI[k]
              }))}
              ozgardi={(k) => kuchniAlmashtir(k as Kuch)}
              kenglik="w-36"
            />
          </div>
        </header>

        {/* Xabarlar */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {/* Suhbat almashganda xabarlar yangidan yumshoq chiqadi */}
          <div key={joriy?.id ?? 0} className="anim-bolim mx-auto flex max-w-3xl flex-col gap-5">
            {xabarlar.length === 0 && !oqim && !kutmoqda && (
              <div className="anim-paydo pt-16 text-center">
                <p className="text-lg font-semibold text-[#c4c6ca]">Savolingizni yozing</p>
                <p className="mt-2 text-sm text-[#909296]">
                  Rasm, PDF yoki HTML yaratishni so&apos;rang. Nest&apos;dan yoki kompyuterdan fayl
                  biriktirsangiz ham bo&apos;ladi
                </p>
              </div>
            )}

            {/* Kalit — tartib raqami: vaqtinchalik xabar bazadagisi bilan almashganda qayta paydo bo'lmaydi */}
            {xabarlar.map((xabar, i) => (
              <div
                key={i}
                className={`group/xabar ${xabar.rol === 'men' ? 'anim-paydo flex justify-end' : ''}`}
              >
                <div
                  className={
                    xabar.rol === 'men'
                      ? tahrir?.id === xabar.id
                        ? 'w-full'
                        : 'flex max-w-[85%] flex-col items-end'
                      : 'w-full'
                  }
                >
                  {xabar.rol === 'ai' && (
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#909296]">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          xabar.provayder === 'claude' ? 'bg-[#f2f3f5]' : 'bg-[#7cb7ff]'
                        }`}
                      />
                      {xabar.provayder === 'claude' ? 'Claude' : 'Gemini'}
                      <span className="font-normal">· {vaqtMatni(xabar.vaqt)}</span>
                      {xabar.xato ? (
                        <span className="rounded-full bg-[#3a1d1c] px-2 py-0.5 text-[11px] font-bold text-[#f2b8b5]">
                          xato ({XATO_NOMLARI[xabar.xatoTuri ?? 'boshqa']})
                        </span>
                      ) : null}
                    </div>
                  )}
                  {tahrir?.id === xabar.id ? (
                    // Tahrirlash oynasi: saqlansa savol qayta yuboriladi
                    <div className="anim-pop flex flex-col gap-2 rounded-3xl bg-[#1d3b66] p-3">
                      <textarea
                        autoFocus
                        value={tahrir.matn}
                        onChange={(h) => setTahrir({ id: xabar.id, matn: h.target.value })}
                        onKeyDown={(h) => {
                          if (h.key === 'Enter' && !h.shiftKey) {
                            h.preventDefault()
                            tahrirniSaqla(xabar)
                          }
                          if (h.key === 'Escape') setTahrir(null)
                        }}
                        rows={Math.min(8, Math.max(2, tahrir.matn.split('\n').length))}
                        className="w-full resize-none rounded-2xl bg-[#15294a] px-3 py-2.5 text-[15px] leading-relaxed text-[#d6e6ff] outline-none"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#a9c8f0]">
                          Saqlansa, bundan keyingi javoblar o&apos;chib, yangidan yoziladi
                        </span>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            onClick={() => setTahrir(null)}
                            className="rounded-xl bg-[#25497d] px-3 py-1.5 text-xs font-bold text-[#d6e6ff] hover:bg-[#2d5690]"
                          >
                            Bekor
                          </button>
                          <button
                            onClick={() => tahrirniSaqla(xabar)}
                            disabled={!tahrir.matn.trim()}
                            className="rounded-xl bg-[#f2f3f5] px-3 py-1.5 text-xs font-bold text-[#111214] hover:bg-white disabled:opacity-40"
                          >
                            Saqlash va yuborish
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`whitespace-pre-wrap text-[15px] leading-relaxed select-text ${
                        xabar.rol === 'men'
                          ? 'rounded-3xl rounded-br-lg bg-[#1d3b66] px-4 py-3 text-[#d6e6ff]'
                          : xabar.xato
                            ? 'rounded-2xl border border-[#8c1d18] bg-[#1f1416] px-4 py-3 text-[#f2b8b5]'
                            : 'text-[#e8e9eb]'
                      }`}
                    >
                      {xabar.matn}
                    </div>
                  )}
                  {xabar.fayllar && xabar.fayllar.length > 0 && <Fayllar fayllar={xabar.fayllar} />}

                  {/* Xabar ostidagi amallar: sichqoncha ustiga kelganda ko'rinadi */}
                  {tahrir?.id !== xabar.id && (
                    <div className="mt-1 flex gap-0.5 opacity-0 transition group-hover/xabar:opacity-100">
                      <button
                        onClick={() => xabarniNusxala(xabar)}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#909296] hover:bg-[#28292c] hover:text-[#e8e9eb]"
                        title="Matnni nusxalash"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {nusxalangan === xabar.id ? (
                            <path d="M5 12l5 5 9-10" />
                          ) : (
                            <>
                              <rect x="8" y="8" width="12" height="12" rx="3" />
                              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                            </>
                          )}
                        </svg>
                        {nusxalangan === xabar.id ? 'Nusxalandi' : 'Nusxa'}
                      </button>
                      {xabar.rol === 'men' && xabar.id > 0 && !kutmoqda && (
                        <button
                          onClick={() => setTahrir({ id: xabar.id, matn: xabar.matn })}
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#909296] hover:bg-[#28292c] hover:text-[#e8e9eb]"
                          title="Xabarni tahrirlash"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 20h4L19 9l-4-4L4 16z" />
                            <path d="M13.5 6.5l4 4" />
                          </svg>
                          Tahrirlash
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {oqim && (
              <div className="anim-paydo w-full">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#909296]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      joriy?.provayder === 'claude' ? 'bg-[#f2f3f5]' : 'bg-[#7cb7ff]'
                    }`}
                  />
                  {joriy?.provayder === 'claude' ? 'Claude' : 'Gemini'}
                </div>
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#e8e9eb]">
                  {oqim}
                  <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-[#7cb7ff] align-middle" />
                </div>
              </div>
            )}

            {kutmoqda && !oqim && (
              <div className="anim-paydo flex items-center gap-2 text-sm text-[#909296]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#7cb7ff]" />
                {joriy?.provayder === 'claude' ? 'Claude' : 'Gemini'} o&apos;ylayapti…
              </div>
            )}

            <div ref={oxiri} />
          </div>
        </div>

        {/* Yozish qatori */}
        <div className="shrink-0 border-t border-[#28292c] px-6 py-4">
          <div className="relative mx-auto max-w-3xl">
            {nestOchiq && (
              <div className="anim-panel absolute bottom-full left-0 z-10 mb-3 max-h-96 w-full overflow-y-auto rounded-3xl bg-[#333437] p-2 shadow-2xl">
                <button
                  onClick={kompyuterdan}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[#1d3b66] px-3 py-2.5 text-left transition hover:bg-[#25497d]"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d6e6ff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <rect x="3" y="4" width="18" height="12" rx="2.5" />
                    <path d="M8 20h8M12 16v4" />
                  </svg>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-[#d6e6ff]">
                      Kompyuterdan tanlash
                    </span>
                    <span className="block text-[11px] text-[#a9c8f0]">
                      Rasm, PDF, HTML yoki boshqa fayl — sudrab tashlasa ham bo&apos;ladi
                    </span>
                  </span>
                </button>
                <div className="px-3 pb-2 pt-3 text-[11px] font-bold tracking-wide text-[#909296]">
                  NEST&apos;DAN BIRIKTIRISH
                </div>
                {nusxalar.length === 0 && (
                  <p className="px-3 pb-2 text-sm text-[#c4c6ca]">Nest bo&apos;sh</p>
                )}
                {nusxalar.map((nusxa) => (
                  <button
                    key={nusxa.id}
                    onClick={() => {
                      setBiriktirmalar((o) =>
                        o.some((x) => x.id === nusxa.id) ? o : [...o, nusxa]
                      )
                      setNestOchiq(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-[#3a3b3f]"
                  >
                    {nusxa.tur === 'rasm' && nusxa.fayl ? (
                      <img
                        src={`ling-rasm://${nusxa.fayl}?kichik`}
                        loading="lazy"
                        decoding="async"
                        alt=""
                        className="h-8 w-11 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="shrink-0 rounded-md bg-[#28292c] px-2 py-1 text-[10px] font-bold text-[#7cb7ff]">
                        {nusxa.tur === 'video'
                          ? 'VIDEO'
                          : nusxa.tur === 'fayl'
                            ? kengaytma(nusxa.matn)
                            : 'MATN'}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">{nusxa.matn}</span>
                  </button>
                ))}
              </div>
            )}

            {biriktirmalar.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {biriktirmalar.map((b) => (
                  <span
                    key={b.id}
                    className="flex items-center gap-2 rounded-xl bg-[#28292c] py-1.5 pl-3 pr-2 text-xs"
                  >
                    {b.tur === 'rasm' && b.fayl ? (
                      <img
                        src={`ling-rasm://${b.fayl}?kichik`}
                        alt=""
                        className="h-6 w-8 rounded-md object-cover"
                      />
                    ) : (
                      <span className="font-bold text-[#7cb7ff]">
                        {b.tur === 'video'
                          ? 'Video'
                          : b.tur === 'fayl'
                            ? kengaytma(b.matn)
                            : 'Matn'}
                      </span>
                    )}
                    <span className="max-w-40 truncate text-[#c4c6ca]">{b.matn}</span>
                    <button
                      onClick={() => setBiriktirmalar((o) => o.filter((x) => x.id !== b.id))}
                      className="px-1 text-[#909296] hover:text-[#e8e9eb]"
                    >
                      &#10005;
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 rounded-3xl bg-[#28292c] p-2">
              <button
                onClick={nestniOch}
                className={`h-11 shrink-0 rounded-2xl px-4 text-sm font-bold transition ${
                  nestOchiq ? 'bg-[#f2f3f5] text-[#111214]' : 'bg-[#3a3b3f] text-[#edeef0]'
                }`}
                title="Nest'dan yoki kompyuterdan biriktirish"
              >
                + Biriktirish
              </button>

              <textarea
                value={matn}
                onChange={(h) => setMatn(h.target.value)}
                onKeyDown={(h) => {
                  if (h.key === 'Enter' && !h.shiftKey) {
                    h.preventDefault()
                    yubor()
                  }
                }}
                rows={1}
                placeholder="Ling'ga yozing…"
                className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-[15px] outline-none placeholder:text-[#909296]"
              />

              <button
                onClick={yubor}
                disabled={kutmoqda || !matn.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f2f3f5] text-[#111214] transition disabled:opacity-30"
                title="Yuborish (Enter)"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5" />
                  <path d="M6 11l6-6 6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
