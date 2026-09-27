import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { and, desc, eq, gte, inArray, like, lt, or, sql } from 'drizzle-orm'
import {
  nusxalar,
  tezkorSozlar,
  sozlamalar,
  suhbatlar,
  xabarlar,
  biriktirmalar,
  type Nusxa,
  type TezkorSoz,
  type Suhbat,
  type Xabar
} from './schema'

// Sinov uchun alohida ma'lumot papkasi: LING_PROFIL=<papka> (haqiqiy nusxalarga tegmaydi)
if (process.env['LING_PROFIL']) app.setPath('userData', process.env['LING_PROFIL'])

// Yangi kompyuterda ma'lumot papkasi hali bo'lmaydi — bazani ochishdan oldin yaratamiz
mkdirSync(app.getPath('userData'), { recursive: true })

// Electron ichidagi Node'ning o'z SQLite'i — qo'shimcha kutubxona kerak emas
export const bazaFayli = join(app.getPath('userData'), 'ling.db')
const sqlite = new DatabaseSync(bazaFayli)

// Rasmlar shu papkada saqlanadi
export const rasmlarPapka = join(app.getPath('userData'), 'rasmlar')
mkdirSync(rasmlarPapka, { recursive: true })

function ustunlar(jadval: string): string[] {
  return sqlite
    .prepare(`PRAGMA table_info(${jadval})`)
    .all()
    .map((q) => String(q.name))
}

// Migratsiya: eski nusxalar omon qoladi, faqat yangi ustun va jadvallar qo'shiladi
function migratsiya(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS nusxalar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matn TEXT NOT NULL,
      manba TEXT NOT NULL DEFAULT 'tizim',
      vaqt INTEGER NOT NULL
    )
  `)

  const bor = ustunlar('nusxalar')
  if (!bor.includes('tur'))
    sqlite.exec(`ALTER TABLE nusxalar ADD COLUMN tur TEXT NOT NULL DEFAULT 'matn'`)
  if (!bor.includes('fayl')) sqlite.exec(`ALTER TABLE nusxalar ADD COLUMN fayl TEXT`)
  if (!bor.includes('ochirilgan'))
    sqlite.exec(`ALTER TABLE nusxalar ADD COLUMN ochirilgan INTEGER NOT NULL DEFAULT 0`)
  if (!bor.includes('ochirilgan_vaqt'))
    sqlite.exec(`ALTER TABLE nusxalar ADD COLUMN ochirilgan_vaqt INTEGER`)

  const suhbatUstunlar = ustunlar('suhbatlar')
  if (suhbatUstunlar.length && !suhbatUstunlar.includes('kuch'))
    sqlite.exec(`ALTER TABLE suhbatlar ADD COLUMN kuch TEXT NOT NULL DEFAULT 'medium'`)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tezkor_sozlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      qiymat TEXT NOT NULL,
      maxfiy INTEGER NOT NULL DEFAULT 0,
      vaqt INTEGER NOT NULL
    )
  `)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sozlamalar (
      kalit TEXT PRIMARY KEY,
      qiymat TEXT NOT NULL
    )
  `)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS suhbatlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      provayder TEXT NOT NULL,
      model TEXT NOT NULL,
      kuch TEXT NOT NULL DEFAULT 'medium',
      vaqt INTEGER NOT NULL
    )
  `)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS xabarlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suhbat_id INTEGER NOT NULL,
      rol TEXT NOT NULL,
      matn TEXT NOT NULL,
      provayder TEXT,
      model TEXT,
      xato INTEGER NOT NULL DEFAULT 0,
      vaqt INTEGER NOT NULL
    )
  `)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS biriktirmalar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      xabar_id INTEGER NOT NULL,
      nusxa_id INTEGER NOT NULL
    )
  `)

  if (!ustunlar('xabarlar').includes('xato_turi'))
    sqlite.exec(`ALTER TABLE xabarlar ADD COLUMN xato_turi TEXT`)

  // Minglab nusxada ro'yxat va o'chirilganlar tez ochilishi uchun indekslar
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS nusxalar_faol_vaqt ON nusxalar (ochirilgan, vaqt DESC, id DESC);
    CREATE INDEX IF NOT EXISTS nusxalar_tur_vaqt ON nusxalar (ochirilgan, tur, vaqt DESC, id DESC);
    CREATE INDEX IF NOT EXISTS nusxalar_ochirilgan_vaqt ON nusxalar (ochirilgan, ochirilgan_vaqt DESC);
    CREATE INDEX IF NOT EXISTS xabarlar_suhbat ON xabarlar (suhbat_id, vaqt);
    CREATE INDEX IF NOT EXISTS biriktirmalar_xabar ON biriktirmalar (xabar_id);
  `)
}

migratsiya()

// Drizzle so'rovlarini node:sqlite'ga uzatamiz
export const db = drizzle(async (sorov, parametrlar, usul) => {
  const buyruq = sqlite.prepare(sorov)
  if (usul === 'run') {
    buyruq.run(...(parametrlar as never[]))
    return { rows: [] }
  }
  const qatorlar = buyruq.all(...(parametrlar as never[])).map((qator) => Object.values(qator))
  return usul === 'get' ? { rows: qatorlar[0] ?? [] } : { rows: qatorlar }
})

// --- Nusxalar ---

// `oldin` — shu nusxadan keyingi (eskiroq) sahifa; `chegara` — sahifa hajmi
export type Sorov = {
  qidiruv?: string
  tur?: 'matn' | 'rasm' | 'video' | 'fayl'
  oldin?: { vaqt: number; id: number }
  chegara?: number
}

// Ro'yxatda ko'rsatiladigan matn uzunligi. To'liq matn faqat nusxa olinganda o'qiladi
const QISQA_MATN = 300

// Ro'yxat uchun ustunlar: uzun matn bazaning o'zida qisqartiriladi,
// shunda megabaytlik nusxa oynaga uzatilmaydi va ro'yxatni qotirmaydi
const royxatUstunlari = {
  id: nusxalar.id,
  tur: nusxalar.tur,
  matn: sql<string>`substr(${nusxalar.matn}, 1, ${QISQA_MATN})`,
  fayl: nusxalar.fayl,
  manba: nusxalar.manba,
  vaqt: nusxalar.vaqt,
  ochirilgan: nusxalar.ochirilgan,
  ochirilganVaqt: nusxalar.ochirilganVaqt
}

// LIKE ichidagi % va _ oddiy belgi sifatida qidirilsin
function likeNaqsh(matn: string): string {
  return `%${matn.replace(/[\\%_]/g, (b) => '\\' + b)}%`
}

export async function royxat(sorov: Sorov = {}): Promise<Nusxa[]> {
  const chegara = Math.min(Math.max(sorov.chegara ?? 60, 1), 1000)
  const shartlar = [eq(nusxalar.ochirilgan, 0)]
  if (sorov.tur) shartlar.push(eq(nusxalar.tur, sorov.tur))
  const q = sorov.qidiruv?.trim()
  if (q) shartlar.push(sql`${nusxalar.matn} LIKE ${likeNaqsh(q)} ESCAPE '\\'`)
  if (sorov.oldin) {
    const { vaqt, id } = sorov.oldin
    shartlar.push(or(lt(nusxalar.vaqt, vaqt), and(eq(nusxalar.vaqt, vaqt), lt(nusxalar.id, id)))!)
  }
  return db
    .select(royxatUstunlari)
    .from(nusxalar)
    .where(and(...shartlar))
    .orderBy(desc(nusxalar.vaqt), desc(nusxalar.id))
    .limit(chegara)
}

export async function bittasi(id: number): Promise<Nusxa | undefined> {
  const qator = await db.select().from(nusxalar).where(eq(nusxalar.id, id))
  return qator[0]
}

async function borMi(shart: ReturnType<typeof eq>): Promise<Nusxa | undefined> {
  const qator = await db
    .select()
    .from(nusxalar)
    .where(and(eq(nusxalar.ochirilgan, 0), shart))
    .limit(1)
  return qator[0]
}

// Matn nusxasi. Bir xil matn allaqachon bo'lsa — yangisini yozmay, eskisini tepaga ko'taramiz
export async function qoshishMatn(matn: string, manba = 'tizim'): Promise<Nusxa | null> {
  const tozalangan = matn.trim()
  if (!tozalangan) return null

  const mavjud = await borMi(eq(nusxalar.matn, tozalangan))
  if (mavjud) {
    await db.update(nusxalar).set({ vaqt: Date.now() }).where(eq(nusxalar.id, mavjud.id))
    return { ...mavjud, vaqt: Date.now() }
  }

  const yangi = await db
    .insert(nusxalar)
    .values({ tur: 'matn', matn: tozalangan, manba, vaqt: Date.now() })
    .returning()
  return yangi[0] ?? null
}

// Rasm nusxasi: fayl allaqachon diskka yozilgan bo'ladi
export async function qoshishRasm(
  faylNomi: string,
  tavsif: string,
  manba = 'tizim'
): Promise<Nusxa | null> {
  const yangi = await db
    .insert(nusxalar)
    .values({ tur: 'rasm', matn: tavsif, fayl: faylNomi, manba, vaqt: Date.now() })
    .returning()
  return yangi[0] ?? null
}

// O'chirish: yozuv bazada qoladi, faqat belgi qo'yiladi (S3'da tiklash qo'shiladi)
export async function ochirish(id: number): Promise<void> {
  await db
    .update(nusxalar)
    .set({ ochirilgan: 1, ochirilganVaqt: Date.now() })
    .where(eq(nusxalar.id, id))
}

export async function kotarish(id: number): Promise<void> {
  await db.update(nusxalar).set({ vaqt: Date.now() }).where(eq(nusxalar.id, id))
}

// --- Tezkor so'zlar ---

export async function tezkorRoyxat(qidiruv = ''): Promise<TezkorSoz[]> {
  const q = qidiruv.trim()
  const shart = q
    ? or(like(tezkorSozlar.nom, `%${q}%`), like(tezkorSozlar.qiymat, `%${q}%`))
    : undefined
  const sorov = db.select().from(tezkorSozlar)
  return (shart ? sorov.where(shart) : sorov).orderBy(desc(tezkorSozlar.vaqt))
}

export async function tezkorBittasi(id: number): Promise<TezkorSoz | undefined> {
  const qator = await db.select().from(tezkorSozlar).where(eq(tezkorSozlar.id, id))
  return qator[0]
}

export async function tezkorQoshish(
  nom: string,
  qiymat: string,
  maxfiy = false
): Promise<TezkorSoz | null> {
  if (!nom.trim() || !qiymat.trim()) return null
  const yangi = await db
    .insert(tezkorSozlar)
    .values({ nom: nom.trim(), qiymat: qiymat.trim(), maxfiy: maxfiy ? 1 : 0, vaqt: Date.now() })
    .returning()
  return yangi[0] ?? null
}

export async function tezkorOchirish(id: number): Promise<void> {
  await db.delete(tezkorSozlar).where(eq(tezkorSozlar.id, id))
}

// --- Sozlamalar ---

export async function sozlamaOqish(kalit: string): Promise<string | undefined> {
  const qator = await db.select().from(sozlamalar).where(eq(sozlamalar.kalit, kalit))
  return qator[0]?.qiymat
}

export async function sozlamaYozish(kalit: string, qiymat: string): Promise<void> {
  await db
    .insert(sozlamalar)
    .values({ kalit, qiymat })
    .onConflictDoUpdate({ target: sozlamalar.kalit, set: { qiymat } })
}

// Birinchi ishga tushishda 4 ta namuna yozuv
export async function seed(): Promise<void> {
  const bormi = (await db.select({ id: nusxalar.id }).from(nusxalar).limit(1)).length > 0
  if (bormi) return
  const namunalar = [
    'npm run dev',
    'https://m3.material.io/styles',
    'Ertaga soat 10:00 da uchrashuv',
    'const nest = createWindow()'
  ]
  const hozir = Date.now()
  for (const [i, matn] of namunalar.entries()) {
    await db
      .insert(nusxalar)
      .values({ tur: 'matn', matn, manba: 'namuna', vaqt: hozir - (namunalar.length - i) * 60_000 })
  }
}

export { sql }

// --- O'chirilganlar ---

export async function ochirilganRoyxat(chegara = 500): Promise<Nusxa[]> {
  return db
    .select(royxatUstunlari)
    .from(nusxalar)
    .where(eq(nusxalar.ochirilgan, 1))
    .orderBy(desc(nusxalar.ochirilganVaqt))
    .limit(chegara)
}

export async function tiklash(id: number): Promise<void> {
  await db
    .update(nusxalar)
    .set({ ochirilgan: 0, ochirilganVaqt: null, vaqt: Date.now() })
    .where(eq(nusxalar.id, id))
}

export async function butunlayOchirish(id: number): Promise<string | null> {
  const nusxa = await bittasi(id)
  await db.delete(nusxalar).where(eq(nusxalar.id, id))
  return nusxa?.fayl ?? null
}

// Muddati o'tgan o'chirilganlarni butunlay tozalaydi. 0 = cheksiz saqlash
export async function eskilarniTozala(kunlar: number): Promise<string[]> {
  if (!kunlar) return []
  const chegara = Date.now() - kunlar * 24 * 60 * 60 * 1000
  const eskilar = await db
    .select()
    .from(nusxalar)
    .where(and(eq(nusxalar.ochirilgan, 1), lt(nusxalar.ochirilganVaqt, chegara)))
  for (const eski of eskilar) {
    await db.delete(nusxalar).where(eq(nusxalar.id, eski.id))
  }
  return eskilar.map((e) => e.fayl).filter((f): f is string => Boolean(f))
}

export const OCHIRILGAN_MUDDAT_KALIT = 'ochirilgan_muddat_kun'
export const OCHIRILGAN_MUDDAT_STANDART = 30

export async function ochirilganMuddat(): Promise<number> {
  const qiymat = await sozlamaOqish(OCHIRILGAN_MUDDAT_KALIT)
  return qiymat === undefined ? OCHIRILGAN_MUDDAT_STANDART : Number(qiymat)
}

// --- Ekran yozuvlari (video) ---

export async function qoshishVideo(yol: string, nomi: string): Promise<Nusxa | null> {
  // Bir xil fayl ikki marta tushmasin
  const mavjud = await db
    .select()
    .from(nusxalar)
    .where(and(eq(nusxalar.tur, 'video'), eq(nusxalar.fayl, yol)))
    .limit(1)
  if (mavjud[0]) return null

  const yangi = await db
    .insert(nusxalar)
    .values({ tur: 'video', matn: nomi, fayl: yol, manba: 'yozuv', vaqt: Date.now() })
    .returning()
  return yangi[0] ?? null
}

// --- Hujjatlar (AI yaratgan yoki kompyuterdan biriktirilgan HTML, PDF va boshqalar) ---

export async function qoshishFayl(yol: string, nomi: string, manba: string): Promise<Nusxa | null> {
  const yangi = await db
    .insert(nusxalar)
    .values({ tur: 'fayl', matn: nomi, fayl: yol, manba, vaqt: Date.now() })
    .returning()
  return yangi[0] ?? null
}

// --- Chat ---

export async function suhbatRoyxat(): Promise<Suhbat[]> {
  return db.select().from(suhbatlar).orderBy(desc(suhbatlar.vaqt)).limit(100)
}

export async function suhbatYarat(
  provayder: string,
  model: string,
  kuch = 'medium',
  nom = 'Yangi suhbat'
): Promise<Suhbat> {
  const yangi = await db
    .insert(suhbatlar)
    .values({ nom, provayder, model, kuch, vaqt: Date.now() })
    .returning()
  return yangi[0]
}

export async function suhbatBittasi(id: number): Promise<Suhbat | undefined> {
  const qator = await db.select().from(suhbatlar).where(eq(suhbatlar.id, id))
  return qator[0]
}

export async function suhbatYangila(
  id: number,
  qiymatlar: Partial<{ nom: string; provayder: string; model: string; kuch: string }>
): Promise<void> {
  await db
    .update(suhbatlar)
    .set({ ...qiymatlar, vaqt: Date.now() })
    .where(eq(suhbatlar.id, id))
}

export async function suhbatOchirish(id: number): Promise<void> {
  await db.delete(xabarlar).where(eq(xabarlar.suhbatId, id))
  await db.delete(suhbatlar).where(eq(suhbatlar.id, id))
}

export async function xabarRoyxat(suhbatId: number): Promise<Xabar[]> {
  return db.select().from(xabarlar).where(eq(xabarlar.suhbatId, suhbatId)).orderBy(xabarlar.vaqt)
}

export async function xabarQoshish(
  suhbatId: number,
  rol: 'men' | 'ai',
  matn: string,
  qoshimcha: { provayder?: string; model?: string; xato?: boolean; xatoTuri?: string | null } = {}
): Promise<Xabar> {
  const yangi = await db
    .insert(xabarlar)
    .values({
      suhbatId,
      rol,
      matn,
      provayder: qoshimcha.provayder ?? null,
      model: qoshimcha.model ?? null,
      xato: qoshimcha.xato ? 1 : 0,
      xatoTuri: qoshimcha.xatoTuri ?? null,
      vaqt: Date.now()
    })
    .returning()
  await db.update(suhbatlar).set({ vaqt: Date.now() }).where(eq(suhbatlar.id, suhbatId))
  return yangi[0]
}

export async function biriktirmaQoshish(xabarId: number, nusxaId: number): Promise<void> {
  await db.insert(biriktirmalar).values({ xabarId, nusxaId })
}

export async function biriktirmaRoyxat(xabarId: number): Promise<Nusxa[]> {
  const qatorlar = await db.select().from(biriktirmalar).where(eq(biriktirmalar.xabarId, xabarId))
  const natija: Nusxa[] = []
  for (const q of qatorlar) {
    const nusxa = await bittasi(q.nusxaId)
    if (nusxa) natija.push(nusxa)
  }
  return natija
}

// Xabar tahrirlanganda: shu xabar va undan keyingi hamma xabarlar o'chiriladi,
// keyin tahrirlangan matn qayta yuboriladi (javob yangidan yoziladi)
export async function xabarlarniQirq(suhbatId: number, xabarId: number): Promise<void> {
  const keyingilar = await db
    .select({ id: xabarlar.id })
    .from(xabarlar)
    .where(and(eq(xabarlar.suhbatId, suhbatId), gte(xabarlar.id, xabarId)))
  const idlar = keyingilar.map((x) => x.id)
  if (!idlar.length) return
  await db.delete(biriktirmalar).where(inArray(biriktirmalar.xabarId, idlar))
  await db.delete(xabarlar).where(inArray(xabarlar.id, idlar))
}

// --- Sozlamalar sahifasi uchun ---

export async function sanoqlar(): Promise<{ nusxa: number; tezkor: number; suhbat: number }> {
  const bitta = (s: string): number => Number((sqlite.prepare(s).get() as { n: number }).n)
  return {
    nusxa: bitta('SELECT count(*) AS n FROM nusxalar WHERE ochirilgan = 0'),
    tezkor: bitta('SELECT count(*) AS n FROM tezkor_sozlar'),
    suhbat: bitta('SELECT count(*) AS n FROM suhbatlar')
  }
}

// Bazaning to'liq, izchil nusxasi (Ling ishlab turgan paytda ham xavfsiz)
export function bazaniNusxala(yol: string): void {
  sqlite.prepare('VACUUM INTO ?').run(yol)
}
