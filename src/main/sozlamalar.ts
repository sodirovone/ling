import { execFile } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { agyYol } from './chat'
import { bazaFayli, bazaniNusxala, rasmlarPapka, sanoqlar } from './db'

export type CliHolat = {
  id: 'claude' | 'gemini'
  nom: string
  topildi: boolean
  versiya: string | null
  yol: string | null
}

function ishlat(buyruq: string, parametrlar: string[], qobiq: boolean): Promise<string | null> {
  return new Promise((bajar) => {
    execFile(
      buyruq,
      parametrlar,
      { windowsHide: true, timeout: 15_000, shell: qobiq },
      (xato, chiqish) => bajar(xato ? null : String(chiqish).trim())
    )
  })
}

// Claude Code va Antigravity (agy) o'rnatilganmi, qayerda, qaysi versiya
export async function cliHolati(): Promise<CliHolat[]> {
  const [claudeYol, claudeVersiya] = await Promise.all([
    ishlat('where', ['claude'], false),
    ishlat('claude', ['--version'], true)
  ])

  const agy = agyYol()
  const agyBor = agy !== 'agy' || (await ishlat('where', ['agy'], false)) !== null
  const agyVersiya = agyBor ? await ishlat(agy, ['--version'], false) : null

  return [
    {
      id: 'claude',
      nom: 'Claude Code',
      topildi: Boolean(claudeVersiya),
      versiya: claudeVersiya?.replace(/\s*\(Claude Code\)\s*$/, '') ?? null,
      yol: claudeYol?.split(/\r?\n/)[0] ?? null
    },
    {
      id: 'gemini',
      nom: 'Antigravity (agy)',
      topildi: Boolean(agyVersiya),
      versiya: agyVersiya,
      yol: agyBor ? agy : null
    }
  ]
}

// Papkadagi hamma fayllar hajmi (baytda)
function papkaHajmi(papka: string): number {
  if (!existsSync(papka)) return 0
  let jami = 0
  for (const nomi of readdirSync(papka)) {
    const yol = join(papka, nomi)
    try {
      const holat = statSync(yol)
      jami += holat.isDirectory() ? papkaHajmi(yol) : holat.size
    } catch {
      // o'qib bo'lmadi
    }
  }
  return jami
}

function faylHajmi(yol: string): number {
  try {
    return statSync(yol).size
  } catch {
    return 0
  }
}

const hujjatlarPapka = (): string => join(app.getPath('userData'), 'fayllar')
const chatPapka = (): string => join(app.getPath('userData'), 'chat-ish')

export async function statistika(): Promise<{
  nusxa: number
  tezkor: number
  suhbat: number
  hajm: number
}> {
  const sanoq = await sanoqlar()
  // "Baza hajmi" — Ling saqlagan hamma narsa: baza, rasmlar, biriktirilgan va AI fayllari
  const hajm =
    faylHajmi(bazaFayli) +
    faylHajmi(bazaFayli + '-wal') +
    papkaHajmi(rasmlarPapka) +
    papkaHajmi(hujjatlarPapka()) +
    papkaHajmi(chatPapka())
  return { ...sanoq, hajm }
}

// Qo'lda zaxira: tanlangan papka ichida "Ling-zaxira-YYYY-MM-DD-HHMM" papkasi yaratiladi
export function zaxiraOl(manzil: string): string {
  const s = new Date()
  const ikki = (n: number): string => String(n).padStart(2, '0')
  const nomi = `Ling-zaxira-${s.getFullYear()}-${ikki(s.getMonth() + 1)}-${ikki(s.getDate())}-${ikki(s.getHours())}${ikki(s.getMinutes())}`
  const papka = join(manzil, nomi)
  mkdirSync(papka, { recursive: true })

  bazaniNusxala(join(papka, 'ling.db'))
  if (existsSync(rasmlarPapka)) cpSync(rasmlarPapka, join(papka, 'rasmlar'), { recursive: true })
  if (existsSync(hujjatlarPapka()))
    cpSync(hujjatlarPapka(), join(papka, 'fayllar'), { recursive: true })
  if (existsSync(chatPapka())) cpSync(chatPapka(), join(papka, 'chat-ish'), { recursive: true })
  return papka
}
