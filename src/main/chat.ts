import { execFile, spawn } from 'child_process'
import { app } from 'electron'
import { extname, join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs'

export type Provayder = 'claude' | 'gemini'
export type Kuch = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type Model = { id: string; nom: string; kuchlar: Kuch[] }

export const KUCH_NOMLARI: Record<Kuch, string> = {
  low: 'Past',
  medium: "O'rta",
  high: 'Yuqori',
  xhigh: 'Juda yuqori',
  max: 'Maksimal'
}

// Claude Code CLI odatda PATH da bo'ladi; agy Windows'da LOCALAPPDATA ichida
export function agyYol(): string {
  const mahalliy = join(process.env['LOCALAPPDATA'] ?? '', 'agy', 'bin', 'agy.exe')
  return existsSync(mahalliy) ? mahalliy : 'agy'
}

const CLAUDE_KUCHLAR: Kuch[] = ['low', 'medium', 'high', 'xhigh', 'max']

export const CLAUDE_MODELLAR: Model[] = [
  { id: 'claude-opus-5-5', nom: 'Opus 5.5', kuchlar: CLAUDE_KUCHLAR },
  { id: 'claude-opus-5', nom: 'Opus 5', kuchlar: CLAUDE_KUCHLAR },
  { id: 'claude-opus-5[1m]', nom: 'Opus 5 · 1M kontekst', kuchlar: CLAUDE_KUCHLAR },
  { id: 'claude-sonnet-5', nom: 'Sonnet 5', kuchlar: CLAUDE_KUCHLAR },
  { id: 'claude-haiku-4-5-20251001', nom: 'Haiku 4.5', kuchlar: CLAUDE_KUCHLAR },
  { id: 'claude-fable-5-1', nom: 'Fable 5.1', kuchlar: CLAUDE_KUCHLAR }
]

// AI'lar Ling papkasiga tegmasin — alohida papkada ishlaydi.
// Har suhbatning o'z papkasi bor: AI yaratgan fayllar (HTML, PDF) shu yerda qoladi
export function ishPapkasi(suhbatId?: number): string {
  const asos = join(app.getPath('userData'), 'chat-ish')
  const yol = suhbatId ? join(asos, `suhbat-${suhbatId}`) : asos
  mkdirSync(yol, { recursive: true })
  return yol
}

// agy generate_image rasmlarini o'z "brain" papkasiga saqlaydi
const AGY_BRAIN = join(homedir(), '.gemini', 'antigravity-cli', 'brain')
const RASM_KENGAYTMALAR = ['.png', '.jpg', '.jpeg', '.webp']

function rasmMi(yol: string): boolean {
  return RASM_KENGAYTMALAR.includes(extname(yol).toLowerCase())
}

// Papkadagi `dan` vaqtidan keyin yaratilgan fayllar (bir qavat ichkarigacha)
function yangiFayllar(papka: string, dan: number, chuqurlik = 1): string[] {
  const natija: string[] = []
  if (!existsSync(papka)) return natija
  for (const nomi of readdirSync(papka)) {
    // .claude, .agents kabi CLI'ning ichki papkalari — foydalanuvchi fayli emas
    if (nomi.startsWith('.')) continue
    const yol = join(papka, nomi)
    try {
      const holat = statSync(yol)
      if (holat.isDirectory()) {
        if (chuqurlik > 0 && holat.mtimeMs >= dan - 1000)
          natija.push(...yangiFayllar(yol, dan, chuqurlik - 1))
      } else if (holat.mtimeMs >= dan - 1000 && holat.size > 0) {
        natija.push(yol)
      }
    } catch {
      // o'qib bo'lmadi
    }
  }
  return natija
}

// agy shu so'rov davomida chizgan rasmlar
function agyRasmlari(dan: number): string[] {
  return yangiFayllar(AGY_BRAIN, dan, 2).filter(rasmMi)
}

// Ling boshqa Claude sessiyasi ichidan ishga tushirilgan bo'lsa, uning muhit o'zgaruvchilari
// CLI'ni chalg'itadi. Shuning uchun bolaga toza muhit beramiz.
function tozaMuhit(): NodeJS.ProcessEnv {
  const muhit: NodeJS.ProcessEnv = { ...process.env }
  for (const kalit of Object.keys(muhit)) {
    if (kalit.startsWith('CLAUDE_') || kalit === 'CLAUDECODE' || kalit.startsWith('ANTHROPIC_')) {
      delete muhit[kalit]
    }
  }
  return muhit
}

// `qobiq` — buyruq .cmd bo'lsa kerak bo'ladi (claude), .exe uchun kerak emas (agy).
// Qobiqsiz ishlatilganda parametrlarni qo'shtirnoqqa olish shart emas, shuning uchun
// uzun va ko'p qatorli so'rovni to'g'ridan-to'g'ri parametr qilib berish xavfsiz.
function buyruqIshlat(
  buyruq: string,
  parametrlar: string[],
  kirish: string,
  qatorda: (qator: string) => void,
  qobiq = true,
  papka = ishPapkasi()
): Promise<{ kod: number; xatoMatn: string }> {
  return new Promise((bajar) => {
    const jarayon = spawn(buyruq, parametrlar, {
      cwd: papka,
      shell: qobiq,
      windowsHide: true,
      env: tozaMuhit()
    })

    let qoldiq = ''
    let xatoMatn = ''

    jarayon.stdout.on('data', (malumot: Buffer) => {
      qoldiq += malumot.toString()
      const qatorlar = qoldiq.split('\n')
      qoldiq = qatorlar.pop() ?? ''
      for (const qator of qatorlar) if (qator.trim()) qatorda(qator)
    })

    jarayon.stderr.on('data', (malumot: Buffer) => {
      xatoMatn += malumot.toString()
    })

    jarayon.on('error', (xato) => {
      xatoMatn += String(xato)
      bajar({ kod: -1, xatoMatn })
    })

    jarayon.on('close', (kod) => {
      if (qoldiq.trim()) qatorda(qoldiq)
      bajar({ kod: kod ?? 0, xatoMatn })
    })

    jarayon.stdin.write(kirish)
    jarayon.stdin.end()
  })
}

// Gemini modellari CLI dan olinadi va keshlanadi
let geminiKesh: Model[] | null = null

// agy modellarida kuch nomga kirgan: "gemini-3.8-flash-high" -> model "gemini-3.8-flash", kuch "high"
function kuchniAjrat(id: string, nom: string): { asos: string; nom: string; kuch: Kuch | null } {
  for (const kuch of ['low', 'medium', 'high'] as Kuch[]) {
    if (id.endsWith(`-${kuch}`)) {
      return {
        asos: id.slice(0, -(kuch.length + 1)),
        nom: nom.replace(/\s*\((High|Medium|Low)\)\s*$/i, '').trim(),
        kuch
      }
    }
  }
  return { asos: id, nom, kuch: null }
}

export async function geminiModellar(): Promise<Model[]> {
  if (geminiKesh) return geminiKesh

  const topilgan = new Map<string, Model>()
  await buyruqIshlat(
    agyYol(),
    ['models'],
    '',
    (qator) => {
      const [id, ...nomBolaklari] = qator.split('\t')
      if (!id || !nomBolaklari.length || id.startsWith('Fetching')) return
      const { asos, nom, kuch } = kuchniAjrat(id.trim(), nomBolaklari.join(' ').trim())
      const mavjud = topilgan.get(asos)
      if (mavjud) {
        if (kuch && !mavjud.kuchlar.includes(kuch)) mavjud.kuchlar.push(kuch)
      } else {
        topilgan.set(asos, { id: asos, nom, kuchlar: kuch ? [kuch] : [] })
      }
    },
    false
  )

  // Kuchlar tartibi doim bir xil bo'lsin
  const tartib: Kuch[] = ['low', 'medium', 'high']
  const royxat = [...topilgan.values()].map((m) => ({
    ...m,
    kuchlar: tartib.filter((k) => m.kuchlar.includes(k))
  }))

  geminiKesh = royxat.length
    ? royxat
    : [{ id: 'gemini-3.7-flash', nom: 'Gemini 3.7 Flash', kuchlar: tartib }]
  return geminiKesh
}

export async function modellar(provayder: Provayder): Promise<Model[]> {
  return provayder === 'claude' ? CLAUDE_MODELLAR : geminiModellar()
}

// Xato turlari: chatda har biri uchun tushunarli yo'l-yo'riq chiqadi
export type XatoTuri = 'topilmadi' | 'kirilmagan' | 'limit' | 'boshqa'

// `fayllar` — AI shu javobda yaratgan fayllarning to'liq yo'llari (rasm, HTML, PDF)
export type Javob = {
  matn: string
  xato: boolean
  xatoTuri: XatoTuri | null
  fayllar: string[]
}

const PROVAYDER_NOMI: Record<Provayder, string> = {
  claude: 'Claude Code',
  gemini: 'Antigravity (agy)'
}

// CLI o'rnatilganmi? `where` topa olmasa — yo'q
function borMi(buyruq: string): Promise<boolean> {
  if (existsSync(buyruq)) return Promise.resolve(true)
  return new Promise((bajar) => {
    execFile('where', [buyruq], { windowsHide: true }, (xato) => bajar(!xato))
  })
}

function xatoniAniqla(matn: string): XatoTuri {
  if (/is not recognized|ENOENT|^topilmadi$/i.test(matn)) return 'topilmadi'
  if (
    /usage limit|limit reached|hit your (usage )?limit|rate.?limit|quota|RESOURCE_EXHAUSTED|\b429\b|too many requests|out of credits/i.test(
      matn
    )
  )
    return 'limit'
  if (
    /\/login|not logged|log ?in|sign ?in|authenticat|unauthori[sz]ed|\b401\b|credential|invalid api key|oauth/i.test(
      matn
    )
  )
    return 'kirilmagan'
  return 'boshqa'
}

function xatoMatni(provayder: Provayder, tur: XatoTuri, asl: string): string {
  const nom = PROVAYDER_NOMI[provayder]
  switch (tur) {
    case 'topilmadi':
      return provayder === 'claude'
        ? `${nom} topilmadi.

O'rnatish: PowerShell'da \`irm https://claude.ai/install.ps1 | iex\` buyrug'ini bajaring, keyin \`claude\` deb yozib akkauntingizga kiring va Ling'ni qayta oching.`
        : `${nom} topilmadi.

O'rnatish: Antigravity CLI'ni o'rnating, keyin terminalda \`agy\` deb yozib Google akkauntingizga kiring va Ling'ni qayta oching.`
    case 'kirilmagan':
      return provayder === 'claude'
        ? `${nom} akkauntga kirmagan.

Terminalda \`claude\` deb yozing va \`/login\` orqali obunangizga kiring, keyin xabarni qayta yuboring.`
        : `${nom} akkauntga kirmagan.

Terminalda \`agy\` deb yozib Google akkauntingizga kiring, keyin xabarni qayta yuboring.`
    case 'limit':
      return `Limit tugadi, keyinroq urinib ko'ring.

${nom} obunasining limiti tugagan. Limit yangilangach shu suhbatda davom etishingiz mumkin yoki yuqoridan boshqa provayderni tanlang.`
    default:
      return asl.trim() || `${nom} javob bermadi`
  }
}

// Rasmni doim agy chizadi (generate_image). Claude rasm kerak bo'lsa javobida
// [[RASM: tavsif]] belgisini qoldiradi, Ling shu tavsif bilan agy'ni chaqiradi.
export const RASM_BELGISI = /\[\[RASM:\s*([\s\S]+?)\]\]/g

export async function rasmYarat(tavsif: string, papka: string): Promise<string[]> {
  const dan = Date.now()
  const buyruq = agyYol()
  if (!(await borMi(buyruq))) return []
  const sorov = [
    'generate_image vositasi yordamida quyidagi rasmni yarat.',
    'Hech qanday buyruq, terminal yoki python ishlatma — faqat generate_image.',
    'Rasmni yaratgach, faqat "Tayyor" deb javob ber.',
    '',
    `Tavsif: ${tavsif}`
  ].join('\n')
  await buyruqIshlat(
    buyruq,
    ['-p', sorov, '--output-format', 'stream-json', '--mode', 'accept-edits'],
    '',
    () => {},
    false,
    papka
  )
  return agyRasmlari(dan)
}

// Bitta so'rov yuboradi. Javob bo'lak-bo'lak `bolakda` orqali qaytadi.
// `papka` — suhbatning ish papkasi: AI yaratgan fayllar shu yerdan yig'ib olinadi
export async function soraw(
  provayder: Provayder,
  model: string,
  kuch: Kuch,
  matn: string,
  bolakda: (bolak: string) => void,
  papka = ishPapkasi(),
  oqishPapkalari: string[] = []
): Promise<Javob> {
  const boshlanish = Date.now()
  // Biriktirilgan rasm/fayllar turgan papkalarni ham o'qiy olsin
  const qoshimcha = oqishPapkalari.flatMap((p) => ['--add-dir', p])
  let javob = ''
  let xato = false
  let xatoIzoh = ''

  function qosh(bolak: string): void {
    if (!bolak) return
    javob += bolak
    bolakda(bolak)
  }

  function xatoQaytar(asl: string): Javob {
    const tur = xatoniAniqla(asl)
    return { matn: xatoMatni(provayder, tur, asl), xato: true, xatoTuri: tur, fayllar: [] }
  }

  const buyruq = provayder === 'claude' ? 'claude' : agyYol()
  if (!(await borMi(buyruq))) return xatoQaytar('topilmadi')

  let natija: { kod: number; xatoMatn: string }

  if (provayder === 'claude') {
    // acceptEdits — Claude suhbat papkasiga fayl (HTML, PDF uchun .pdf.html) yoza oladi,
    // lekin buyruq ishga tushira olmaydi
    natija = await buyruqIshlat(
      'claude',
      [
        '-p',
        '--output-format',
        'stream-json',
        '--verbose',
        '--model',
        model,
        '--effort',
        kuch,
        '--permission-mode',
        'acceptEdits',
        '--allowedTools',
        'Write,Edit,Read',
        // Qobiq orqali ishlagani uchun bo'sh joyli yo'llar qo'shtirnoqqa olinadi
        ...qoshimcha.map((q) => (q.includes(' ') ? `"${q}"` : q))
      ],
      matn,
      (qator) => {
        try {
          const hodisa = JSON.parse(qator)
          if (hodisa.type === 'assistant' && hodisa.message?.content) {
            // Limit yoki kirish xatosi ham shu yerda oddiy matn bo'lib keladi
            if (hodisa.error) {
              xato = true
              for (const bolak of hodisa.message.content) {
                if (bolak.type === 'text' && bolak.text) xatoIzoh += bolak.text + '\n'
              }
              xatoIzoh += String(hodisa.error)
              return
            }
            for (const bolak of hodisa.message.content) {
              if (bolak.type === 'text' && bolak.text) qosh(bolak.text)
            }
          }
          if (hodisa.type === 'result' && hodisa.is_error) {
            xato = true
            xatoIzoh += `\n${hodisa.result ?? ''} ${hodisa.subtype ?? ''}`
          }
        } catch {
          // JSON bo'lmagan qator — e'tiborsiz qoldiramiz
        }
      },
      true,
      papka
    )
  } else {
    // agy modellarida kuch nomga kiradi: gemini-3.8-flash + high -> gemini-3.8-flash-high
    const royxat = await geminiModellar()
    const topilgan = royxat.find((m) => m.id === model)
    const geminiKuch = topilgan?.kuchlar.includes(kuch) ? kuch : (topilgan?.kuchlar.at(-1) ?? null)
    const toliqModel = geminiKuch ? model + '-' + geminiKuch : model

    natija = await buyruqIshlat(
      buyruq,
      // accept-edits — agy generate_image bilan rasm chiza oladi va papkaga fayl yoza oladi
      [
        '-p',
        matn,
        '--output-format',
        'stream-json',
        '--model',
        toliqModel,
        '--mode',
        'accept-edits',
        ...qoshimcha
      ],
      '',
      (qator) => {
        try {
          const hodisa = JSON.parse(qator)
          if (hodisa.event === 'step_update' && hodisa.step_update?.text_delta) {
            qosh(hodisa.step_update.text_delta)
          }
          if (hodisa.event === 'result') {
            if (hodisa.result?.status !== 'SUCCESS') {
              xato = true
              xatoIzoh += String(hodisa.result?.error ?? hodisa.result?.status ?? '')
            }
            // Agar bo'laklar kelmagan bo'lsa, yakuniy javobni olamiz
            else if (!javob && hodisa.result?.response) qosh(hodisa.result.response)
          }
        } catch {
          // JSON bo'lmagan qator
        }
      },
      false,
      papka
    )
  }

  // AI yaratgan fayllar: suhbat papkasidagi yangilari + agy chizgan rasmlar
  const fayllar = yangiFayllar(papka, boshlanish)
  if (provayder === 'gemini') fayllar.push(...agyRasmlari(boshlanish))

  // Claude so'ragan rasmlarni agy chizadi
  const tavsiflar = [...javob.matchAll(RASM_BELGISI)].map((m) => m[1].trim()).slice(0, 3)
  if (tavsiflar.length) {
    javob = javob.replace(RASM_BELGISI, '').trim()
    for (const tavsif of tavsiflar) {
      bolakda('\n\nRasm chizilmoqda (agy)…')
      fayllar.push(...(await rasmYarat(tavsif, papka)))
    }
    if (!fayllar.some(rasmMi)) javob += '\n\n(Rasmni chizib bo‘lmadi — agy javob bermadi.)'
  }

  // Javob umuman kelmagan bo'lsa — sababini aniqlab, yo'l-yo'riq beramiz
  if (!javob.trim()) {
    if (fayllar.length) return { matn: 'Tayyor', xato: false, xatoTuri: null, fayllar }
    const asl = [xatoIzoh, natija.xatoMatn].filter(Boolean).join('\n')
    if (xato || natija.kod !== 0) return xatoQaytar(asl)
    return { matn: 'Javob bo’sh keldi', xato: true, xatoTuri: 'boshqa', fayllar }
  }

  // Javob yarim yo'lda uzilgan bo'lsa ham limitni ko'rsatamiz
  if (xato) {
    const tur = xatoniAniqla(xatoIzoh + natija.xatoMatn)
    if (tur === 'limit') {
      const izoh = xatoMatni(provayder, 'limit', '')
      return { matn: `${javob.trim()}\n\n— ${izoh}`, xato: true, xatoTuri: 'limit', fayllar }
    }
  }
  return { matn: javob.trim(), xato, xatoTuri: xato ? 'boshqa' : null, fayllar }
}
