import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import type { Nusxa, TezkorSoz } from '../../preload'
import Chat from './Chat'
import Nest from './Nest'
import Ochirilganlar from './Ochirilganlar'
import Sozlamalar from './Sozlamalar'
import { useKechiktir } from './useKechiktir'
import { usePleyer } from './usePleyer'

const SAHIFA = 60

type Filtr = 'hammasi' | 'matn' | 'rasm' | 'video' | 'fayl'
type Bolim = 'chat' | 'nest' | 'ochirilgan' | 'sozlamalar'

const BOLIMLAR: { id: Bolim; nom: string }[] = [
  { id: 'chat', nom: 'Chat' },
  { id: 'nest', nom: 'Nest' },
  { id: 'ochirilgan', nom: "O'chirilganlar" },
  { id: 'sozlamalar', nom: 'Sozlamalar' }
]

export default function Asosiy() {
  const [bolim, setBolim] = useState<Bolim>('chat')
  const [qidiruv, setQidiruv] = useState('')
  const [filtr, setFiltr] = useState<Filtr>('hammasi')
  const [nusxalar, setNusxalar] = useState<Nusxa[]>([])
  const [ochirilganlar, setOchirilganlar] = useState<Nusxa[]>([])
  const [muddat, setMuddat] = useState(30)
  const [sozlar, setSozlar] = useState<TezkorSoz[]>([])
  const [belgi, setBelgi] = useState<string | null>(null)
  const [hammasi, setHammasi] = useState(false)
  const pleyer = usePleyer()
  const tugmalar = useRef<Partial<Record<Bolim, HTMLButtonElement | null>>>({})
  const [korsatkich, setKorsatkich] = useState({ left: 0, width: 0 })

  // Bo'lim yoki tugma matni (O'chirilganlar soni) o'zgarsa, fon o'lchami qayta o'lchanadi
  useLayoutEffect(() => {
    const el = tugmalar.current[bolim]
    if (el) setKorsatkich({ left: el.offsetLeft, width: el.offsetWidth })
  }, [bolim, ochirilganlar.length])
  // Qidiruv har harfda emas, yozish to'xtagach bajariladi
  const kechikkanQidiruv = useKechiktir(qidiruv, 150)
  const yuklanmoqda = useRef(false)
  const nusxalarRef = useRef<Nusxa[]>([])
  nusxalarRef.current = nusxalar

  const tur = filtr === 'hammasi' ? undefined : filtr

  // Yangilanganda allaqachon ochilgan sahifalar soni saqlanadi — ro'yxat sakramaydi
  async function yukla(boshidan = false): Promise<void> {
    const chegara = boshidan ? SAHIFA : Math.max(nusxalarRef.current.length, SAHIFA)
    const [n, s, o, m] = await Promise.all([
      window.ling.royxat({ qidiruv: kechikkanQidiruv, tur, chegara }),
      window.ling.tezkorRoyxat(kechikkanQidiruv),
      window.ling.ochirilganRoyxat(),
      window.ling.ochirilganMuddat()
    ])
    setNusxalar(n)
    setHammasi(n.length < chegara)
    setSozlar(s)
    setOchirilganlar(o)
    setMuddat(m)
  }

  async function koproqYukla(): Promise<void> {
    const joriy = nusxalarRef.current
    const oxirgi = joriy.at(-1)
    if (hammasi || yuklanmoqda.current || !oxirgi) return
    yuklanmoqda.current = true
    try {
      const keyingi = await window.ling.royxat({
        qidiruv: kechikkanQidiruv,
        tur,
        oldin: { vaqt: oxirgi.vaqt, id: oxirgi.id },
        chegara: SAHIFA
      })
      setNusxalar([...joriy, ...keyingi])
      setHammasi(keyingi.length < SAHIFA)
    } finally {
      yuklanmoqda.current = false
    }
  }

  useEffect(() => {
    yukla(true)
  }, [kechikkanQidiruv, filtr])

  useEffect(() => window.ling.yangilanganda(() => yukla()), [kechikkanQidiruv, filtr])

  function belgila(kalit: string): void {
    setBelgi(kalit)
    setTimeout(() => setBelgi((oldingi) => (oldingi === kalit ? null : oldingi)), 1500)
  }

  async function nusxala(id: number): Promise<void> {
    await window.ling.nusxala(id)
    belgila(`n${id}`)
    yukla()
  }

  async function sozNusxala(id: number): Promise<void> {
    await window.ling.tezkorNusxala(id)
    belgila(`s${id}`)
  }

  async function sozQoshish(
    hodisa: FormEvent,
    nom: string,
    qiymat: string,
    maxfiy: boolean
  ): Promise<void> {
    hodisa.preventDefault()
    await window.ling.tezkorQoshish(nom, qiymat, maxfiy)
    yukla()
  }

  async function hammasiniTikla(): Promise<void> {
    for (const nusxa of ochirilganlar) await window.ling.tiklash(nusxa.id)
    yukla()
  }

  async function savatniBoshat(): Promise<void> {
    for (const nusxa of ochirilganlar) await window.ling.butunlayOchirish(nusxa.id)
    yukla()
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#111214] p-8">
      <header className="relative mb-5 flex shrink-0 items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Ling</h1>

        <div className="absolute left-1/2 flex -translate-x-1/2 gap-1 rounded-2xl bg-[#1f2023] p-1">
          {/* Tanlangan bo'lim ostidagi fon silliq suriladi */}
          <span
            className="absolute top-1 bottom-1 rounded-xl bg-[#3a3b3f]"
            style={{
              left: korsatkich.left,
              width: korsatkich.width,
              opacity: korsatkich.width ? 1 : 0,
              transition: 'left 420ms var(--silliq), width 420ms var(--silliq)'
            }}
          />
          {BOLIMLAR.map((b) => (
            <button
              key={b.id}
              ref={(el) => {
                tugmalar.current[b.id] = el
              }}
              onClick={() => setBolim(b.id)}
              className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition ${
                bolim === b.id ? 'text-[#edeef0]' : 'text-[#c4c6ca] hover:text-[#e8e9eb]'
              }`}
            >
              {b.nom}
              {b.id === 'ochirilgan' && ochirilganlar.length > 0 && ` (${ochirilganlar.length})`}
            </button>
          ))}
        </div>
      </header>

      <main key={bolim} className="anim-bolim flex min-h-0 flex-1 flex-col">
        {bolim === 'chat' && <Chat />}
        {bolim === 'sozlamalar' && <Sozlamalar />}

        {bolim === 'nest' && (
          <Nest
            nusxalar={nusxalar}
            sozlar={sozlar}
            ochirilganSoni={ochirilganlar.length}
            qidiruv={qidiruv}
            setQidiruv={setQidiruv}
            filtr={filtr}
            setFiltr={setFiltr}
            belgi={belgi}
            hammasiYuklandi={hammasi}
            koproqYukla={koproqYukla}
            nusxala={nusxala}
            ochir={(id) => window.ling.ochirish(id).then(() => yukla())}
            sozNusxala={sozNusxala}
            sozOchir={(id) => window.ling.tezkorOchirish(id).then(() => yukla())}
            sozQoshish={sozQoshish}
            ochirilganlarniOch={() => setBolim('ochirilgan')}
            pleyer={pleyer}
          />
        )}

        {bolim === 'ochirilgan' && (
          <Ochirilganlar
            ochirilganlar={ochirilganlar}
            muddat={muddat}
            nestgaQaytish={() => setBolim('nest')}
            tikla={(id) => window.ling.tiklash(id).then(() => yukla())}
            butunlayOchir={(id) => window.ling.butunlayOchirish(id).then(() => yukla())}
            hammasiniTikla={hammasiniTikla}
            savatniBoshat={savatniBoshat}
          />
        )}
      </main>
    </div>
  )
}
