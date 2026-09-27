import { useEffect, useRef, useState } from 'react'

// Ekranning pastki chap burchagidagi doimiy tugma.
// Windows ob-havo widjeti turgan joyni qoplaydi; bosilganda Nest ochiladi yoki yopiladi.
export default function Tugma() {
  const tugma = useRef<HTMLButtonElement>(null)
  // Nest tugmasi sozlamalarda o'zgartirilishi mumkin
  const [yozuv, setYozuv] = useState('Ctrl + Shift + V')

  useEffect(() => {
    window.ling.tugmaYozuvi().then(setYozuv)
    return window.ling.tugmaOzgardi(setYozuv)
  }, [])

  // Nest yopilib, tugma qaytganda birdan emas, yumshoq paydo bo'ladi
  useEffect(
    () =>
      window.ling.tugmaKorsatilganda(() => {
        const el = tugma.current
        // Oyna hali ko'rinmayotgan bo'lsa animatsiya qilmaymiz — tugma darhol ko'rinsin
        if (!el || document.visibilityState !== 'visible') return
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 320,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
        })
        // Har qanday holatda ham tugma ko'rinmas bo'lib qolmasin
        setTimeout(() => anim.finish(), 500)
      }),
    []
  )

  return (
    <button
      ref={tugma}
      onClick={() => window.ling.nestAlmashtir()}
      title={`Nest (${yozuv})`}
      className="flex h-screen w-screen items-center gap-3 bg-[#111214] pl-3 text-left transition hover:bg-[#1d3b66]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1f2023]">
        <svg
          width="18"
          height="18"
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
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[13px] font-bold text-[#e8e9eb]">Nest</span>
        <span className="text-[11px] text-[#909296]">{yozuv}</span>
      </span>
    </button>
  )
}
