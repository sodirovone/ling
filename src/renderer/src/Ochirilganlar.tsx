import type { Nusxa } from '../../preload'

type Xususiyat = {
  ochirilganlar: Nusxa[]
  muddat: number
  nestgaQaytish: () => void
  tikla: (id: number) => void
  butunlayOchir: (id: number) => void
  hammasiniTikla: () => void
  savatniBoshat: () => void
}

function kunlarOldin(vaqt: number | null): string {
  if (!vaqt) return ''
  const kun = Math.floor((Date.now() - vaqt) / (24 * 60 * 60 * 1000))
  if (kun <= 0) return 'bugun'
  return `${kun} kun oldin`
}

function qolganKun(vaqt: number | null, muddat: number): number | null {
  if (!vaqt || !muddat) return null
  const otgan = Math.floor((Date.now() - vaqt) / (24 * 60 * 60 * 1000))
  return Math.max(0, muddat - otgan)
}

function turNomi(nusxa: Nusxa): string {
  if (nusxa.tur === 'rasm') return 'Rasm'
  if (nusxa.tur === 'video') return 'Video'
  if (nusxa.tur === 'fayl') return 'Fayl'
  return nusxa.matn.startsWith('http') ? 'Havola' : 'Matn'
}

function TurIkonka({ nusxa }: { nusxa: Nusxa }) {
  const yol =
    nusxa.tur === 'rasm' ? (
      <>
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M20 16l-5-5-8 8" />
      </>
    ) : nusxa.tur === 'video' ? (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M10 9.5l5 2.5-5 2.5z" />
      </>
    ) : nusxa.matn.startsWith('http') ? (
      <>
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </>
    ) : (
      <path d="M5 6h14M12 6v13" />
    )

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {yol}
    </svg>
  )
}

export default function Ochirilganlar({
  ochirilganlar,
  muddat,
  nestgaQaytish,
  tikla,
  butunlayOchir,
  hammasiniTikla,
  savatniBoshat
}: Xususiyat) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      {/* Sarlavha */}
      <div className="flex shrink-0 items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <button
            onClick={nestgaQaytish}
            className="flex items-center gap-1.5 text-sm font-bold text-[#7cb7ff] transition hover:text-[#a9cfff]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Nest
          </button>

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
                <path d="M4 7h16" />
                <path d="M9 7V4h6v3" />
                <path d="M6 7l1 13h10l1-13" />
              </svg>
            </span>
            <div>
              <div className="text-[34px] font-extrabold leading-none tracking-tight">
                O&apos;chirilganlar
              </div>
              <div className="mt-1.5 text-sm text-[#c4c6ca]">
                Nest&apos;dan o&apos;chirilgan narsalar shu yerda turadi.{' '}
                {muddat ? `${muddat} kundan keyin butunlay o'chadi.` : 'Cheksiz saqlanadi.'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2.5">
          <button
            onClick={savatniBoshat}
            disabled={ochirilganlar.length === 0}
            className="flex h-12 items-center gap-2 rounded-3xl border border-[#938f99] px-5 text-[15px] font-semibold text-[#f2b8b5] transition hover:bg-[#1f1416] disabled:opacity-40"
          >
            <svg
              width="18"
              height="18"
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
            Savatni bo&apos;shatish
          </button>

          <button
            onClick={hammasiniTikla}
            disabled={ochirilganlar.length === 0}
            className="flex h-12 items-center gap-2 rounded-2xl bg-[#f2f3f5] px-[22px] text-[15px] font-bold text-[#111214] transition hover:bg-white disabled:opacity-40"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12a8 8 0 1 0 2.4-5.7" />
              <path d="M4 4v5h5" />
            </svg>
            Hammasini tiklash
          </button>
        </div>
      </div>

      {/* Kartochkalar */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {ochirilganlar.length === 0 ? (
          <div className="anim-paydo pt-16 text-center">
            <p className="text-lg font-semibold text-[#c4c6ca]">O&apos;chirilganlar bo&apos;sh</p>
            <p className="mt-2 text-sm text-[#909296]">
              {muddat
                ? `Nest'dan o'chirgan nusxalaringiz shu yerda ${muddat} kun saqlanadi`
                : "Nest'dan o'chirgan nusxalaringiz shu yerda saqlanadi"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {ochirilganlar.map((nusxa, i) => {
              const qolgan = qolganKun(nusxa.ochirilganVaqt, muddat)
              const tezOchadi = qolgan !== null && qolgan <= 3
              return (
                <article
                  key={nusxa.id}
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                  className={`anim-paydo flex h-[232px] flex-col gap-3.5 rounded-[28px] bg-[#1f2023] p-[18px] ${
                    tezOchadi ? 'border-2 border-[#8c1d18]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#28292c] text-[#7cb7ff]">
                        <TurIkonka nusxa={nusxa} />
                      </span>
                      <span className="text-sm font-bold text-[#c4c6ca]">{turNomi(nusxa)}</span>
                    </div>

                    {qolgan !== null && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          tezOchadi
                            ? 'bg-[#8c1d18] font-bold text-[#f9dedc]'
                            : 'bg-[#333437] text-[#c4c6ca]'
                        }`}
                      >
                        {qolgan} kun qoldi
                      </span>
                    )}
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden">
                    {nusxa.tur === 'rasm' && nusxa.fayl ? (
                      <img
                        src={`ling-rasm://${nusxa.fayl}?kichik`}
                        loading="lazy"
                        decoding="async"
                        alt=""
                        className="h-full w-full rounded-2xl object-cover opacity-80"
                      />
                    ) : (
                      <p
                        className={`text-[15px] leading-relaxed text-[#e8e9eb] ${
                          nusxa.matn.startsWith('http') ? 'break-all' : ''
                        }`}
                      >
                        {nusxa.matn.length > 120 ? `${nusxa.matn.slice(0, 120)}…` : nusxa.matn}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#909296]">
                      {kunlarOldin(nusxa.ochirilganVaqt)} o&apos;chirildi
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => butunlayOchir(nusxa.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-[#909296] transition hover:bg-[#28292c] hover:text-[#f2b8b5]"
                        title="Butunlay o'chirish"
                      >
                        <svg
                          width="18"
                          height="18"
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
                      </button>

                      <button
                        onClick={() => tikla(nusxa.id)}
                        className="flex h-10 items-center gap-1.5 rounded-full bg-[#3a3b3f] px-3.5 text-sm font-bold text-[#edeef0] transition hover:bg-[#45474a]"
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
                          <path d="M4 12a8 8 0 1 0 2.4-5.7" />
                          <path d="M4 4v5h5" />
                        </svg>
                        Tiklash
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
