// Sinov bazasiga ko'p nusxa yozadi va asosiy so'rovlar tezligini o'lchaydi.
// Ishlatish: node tools/sinov-nusxalar.mjs <papka> [soni]
// Keyin Ling'ni shu papka bilan ochish: LING_PROFIL=<papka> npm run dev
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'fs'
import { join } from 'path'

const papka = process.argv[2]
const soni = Number(process.argv[3] ?? 10000)
if (!papka) {
  console.error('Papka kerak: node tools/sinov-nusxalar.mjs <papka> [soni]')
  process.exit(1)
}
mkdirSync(papka, { recursive: true })
const db = new DatabaseSync(join(papka, 'ling.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS nusxalar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matn TEXT NOT NULL,
    manba TEXT NOT NULL DEFAULT 'tizim',
    vaqt INTEGER NOT NULL,
    tur TEXT NOT NULL DEFAULT 'matn',
    fayl TEXT,
    ochirilgan INTEGER NOT NULL DEFAULT 0,
    ochirilgan_vaqt INTEGER
  );
  CREATE INDEX IF NOT EXISTS nusxalar_faol_vaqt ON nusxalar (ochirilgan, vaqt DESC, id DESC);
  CREATE INDEX IF NOT EXISTS nusxalar_tur_vaqt ON nusxalar (ochirilgan, tur, vaqt DESC, id DESC);
`)

const sozlar = ['salom', 'uchrashuv', 'https://github.com/ling', 'npm run dev', 'hisobot', 'const x = 1', 'Toshkent', 'narx 120 000 so‘m']
const qosh = db.prepare('INSERT INTO nusxalar (matn, manba, vaqt, tur) VALUES (?, ?, ?, ?)')
const hozir = Date.now()
db.exec('BEGIN')
for (let i = 0; i < soni; i++) {
  const matn = `${sozlar[i % sozlar.length]} #${i} ` + 'lorem ipsum '.repeat(i % 40)
  qosh.run(matn, 'sinov', hozir - i * 1000, 'matn')
}
// Bir nechta juda katta nusxa: 2 MB matn
for (let i = 0; i < 5; i++) qosh.run(`KATTA ${i} ` + 'x'.repeat(2_000_000), 'sinov', hozir + i, 'matn')
db.exec('COMMIT')

function olch(nom, fn) {
  const t = performance.now()
  const natija = fn()
  console.log(`${nom}: ${(performance.now() - t).toFixed(1)} ms, ${natija.length} qator, ~${Math.round(JSON.stringify(natija).length / 1024)} KB`)
}

const jami = db.prepare('SELECT count(*) AS n FROM nusxalar').get().n
console.log(`Jami: ${jami} nusxa`)
const ustun = 'id, tur, substr(matn, 1, 300) AS matn, fayl, manba, vaqt'
olch('Birinchi sahifa (60)', () =>
  db.prepare(`SELECT ${ustun} FROM nusxalar WHERE ochirilgan = 0 ORDER BY vaqt DESC, id DESC LIMIT 60`).all())
olch('Qidiruv "uchrashuv"', () =>
  db.prepare(`SELECT ${ustun} FROM nusxalar WHERE ochirilgan = 0 AND matn LIKE ? ESCAPE char(92) ORDER BY vaqt DESC, id DESC LIMIT 60`).all('%uchrashuv%'))
olch('Qidiruv topilmaydigan so\'z', () =>
  db.prepare(`SELECT ${ustun} FROM nusxalar WHERE ochirilgan = 0 AND matn LIKE ? ESCAPE char(92) ORDER BY vaqt DESC, id DESC LIMIT 60`).all('%yoqsoz%'))
olch('Eski usul (to\'liq matn, 200)', () =>
  db.prepare(`SELECT * FROM nusxalar WHERE ochirilgan = 0 ORDER BY vaqt DESC LIMIT 200`).all())
