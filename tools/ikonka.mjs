// Ling ikonkalarini yasaydi: node tools/ikonka.mjs
//   build/ikonka.png — oyna va o'rnatuvchi uchun (256 px)
//   build/tray.png   — vazifalar paneli burchagi uchun (32 px)
// Ko'rinishi: qora doira ichida ingichka oq halqa, atrofida yengil ko'k yorug'lik
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const FON = [17, 18, 20] // #111214
const HALQA = [236, 244, 255] // oqish, biroz ko'kimtir
const NUR = [124, 183, 255] // #7CB7FF

// Bir piksel ichida 4x4 nuqta tekshirib, chetlarni silliq qilamiz
const SILLIQ = 4

function rasmYasa(olcham, { qalinlik, nurKengligi, nurKuchi }) {
  const markaz = olcham / 2
  const fonRadius = olcham / 2 - 0.5
  const halqaRadius = olcham * 0.3
  const qatorlar = []

  for (let y = 0; y < olcham; y++) {
    const qator = Buffer.alloc(1 + olcham * 4)
    for (let x = 0; x < olcham; x++) {
      let fonUlush = 0
      let halqaUlush = 0
      let nur = 0
      for (let sy = 0; sy < SILLIQ; sy++) {
        for (let sx = 0; sx < SILLIQ; sx++) {
          const px = x + (sx + 0.5) / SILLIQ - markaz
          const py = y + (sy + 0.5) / SILLIQ - markaz
          const d = Math.hypot(px, py)
          if (d > fonRadius) continue
          fonUlush += 1
          const farq = Math.abs(d - halqaRadius)
          if (farq <= qalinlik / 2) halqaUlush += 1
          nur += nurKuchi * Math.exp(-((farq / nurKengligi) ** 2))
        }
      }
      const jami = SILLIQ * SILLIQ
      const a = fonUlush / jami
      const h = fonUlush ? halqaUlush / fonUlush : 0
      const n = fonUlush ? Math.min(1, nur / fonUlush) : 0

      // Fon -> ustiga nur -> ustiga halqa
      const rang = FON.map((f, i) => {
        const nurli = f + (NUR[i] - f) * n
        return Math.round(nurli + (HALQA[i] - nurli) * h)
      })
      const j = 1 + x * 4
      qator[j] = rang[0]
      qator[j + 1] = rang[1]
      qator[j + 2] = rang[2]
      qator[j + 3] = Math.round(a * 255)
    }
    qatorlar.push(qator)
  }
  return pngQil(olcham, qatorlar)
}

function bolak(turi, malumot) {
  const uzunlik = Buffer.alloc(4)
  uzunlik.writeUInt32BE(malumot.length)
  const tana = Buffer.concat([Buffer.from(turi, 'ascii'), malumot])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(zlib.crc32(tana) >>> 0)
  return Buffer.concat([uzunlik, tana, crc])
}

function pngQil(olcham, qatorlar) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(olcham, 0)
  ihdr.writeUInt32BE(olcham, 4)
  ihdr[8] = 8 // bit chuqurligi
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bolak('IHDR', ihdr),
    bolak('IDAT', zlib.deflateSync(Buffer.concat(qatorlar))),
    bolak('IEND', Buffer.alloc(0))
  ])
}

const chiqish = path.join(import.meta.dirname, '..', 'build')
fs.mkdirSync(chiqish, { recursive: true })

// Katta ikonkada halqa ingichka; kichigida ko'rinib turishi uchun biroz qalinroq
const katta = rasmYasa(256, { qalinlik: 5, nurKengligi: 16, nurKuchi: 0.55 })
const kichik = rasmYasa(32, { qalinlik: 1.8, nurKengligi: 2.6, nurKuchi: 0.6 })

fs.writeFileSync(path.join(chiqish, 'ikonka.png'), katta)
fs.writeFileSync(path.join(chiqish, 'tray.png'), kichik)
console.log('build/ikonka.png va build/tray.png yasaldi')
