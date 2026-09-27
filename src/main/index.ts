import {
  app,
  BrowserWindow,
  clipboard,
  ClipboardItem,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  net,
  powerMonitor,
  protocol,
  screen,
  shell,
  Tray
} from 'electron'
import { basename, extname, join } from 'path'
import {
  copyFileSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  watch
} from 'fs'
import { createHash } from 'crypto'
import { execFile } from 'child_process'
import { pathToFileURL } from 'url'
import {
  royxat,
  bittasi,
  qoshishMatn,
  qoshishRasm,
  qoshishVideo,
  ochirish,
  kotarish,
  tezkorRoyxat,
  tezkorBittasi,
  tezkorQoshish,
  tezkorOchirish,
  ochirilganRoyxat,
  tiklash,
  butunlayOchirish,
  eskilarniTozala,
  ochirilganMuddat,
  sozlamaOqish,
  sozlamaYozish,
  rasmlarPapka,
  seed,
  suhbatRoyxat,
  suhbatYarat,
  suhbatBittasi,
  suhbatYangila,
  suhbatOchirish,
  xabarRoyxat,
  xabarQoshish,
  biriktirmaQoshish,
  biriktirmaRoyxat,
  xabarlarniQirq,
  OCHIRILGAN_MUDDAT_KALIT,
  qoshishFayl,
  type Sorov
} from './db'
import type { Nusxa } from './schema'

import { ishPapkasi, modellar, soraw, type Kuch, type Provayder } from './chat'
import {
  musiqaJavob,
  musiqaRoyxati,
  tashqiBuyruq,
  tashqiHolatiniOl,
  tashqiniKuzat,
  tashqiniTochtat
} from './pleyer'
import { toliqEkranniKuzat, toliqEkranniTochtat } from './toliqEkran'
import { cliHolati, statistika, zaxiraOl } from './sozlamalar'

// Nest paneli o'lchami va burchakdan masofasi
const NEST_KENGLIK = 404
const NEST_BALANDLIK = 560
const STANDART_TUGMA = 'Control+Shift+V'
const TUGMA_KALIT = 'nest_tugma'
const BURCHAK_KALIT = 'burchak_yoqilgan'
let nestTugmasi = STANDART_TUGMA
let burchakYoqilgan = true

let asosiyOyna: BrowserWindow | null = null
let nestOyna: BrowserWindow | null = null
let tugmaOyna: BrowserWindow | null = null
let tray: Tray | null = null
let chiqmoqda = false
let nestSabab: 'burchak' | 'tugma' | null = null
let toliqEkran = false
let yopishTaymer: ReturnType<typeof setTimeout> | null = null

// Ishlab chiqish nusxasini faqat `npm run dev` ochishi mumkin. Kompyuter qayta yoqilganda
// Windows electron.exe'ni o'zi "tiklab" ochib yuborishi mumkin — bunda darhol yopilamiz.
const begonaIshga = !app.isPackaged && !process.env['NODE_ENV_ELECTRON_VITE']

// Windows bilan birga ochilganda (--fonda) asosiy oyna ko'rinmaydi — Ling tray'da jim ishlaydi
const fondaOchildi = process.argv.includes('--fonda')

// Faqat bitta Ling ishlasin: ikkinchi marta ochilsa, mavjud oyna ko'rsatiladi
const yagona = !begonaIshga && app.requestSingleInstanceLock()
if (!yagona) {
  app.quit()
} else {
  app.on('second-instance', () => {
    asosiyOyna?.show()
    asosiyOyna?.focus()
  })
}

// Rasmlarni oynada ko'rsatish uchun o'z protokolimiz: ling-rasm://<fayl nomi>
protocol.registerSchemesAsPrivileged([
  { scheme: 'ling-rasm', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  // stream — <audio> musiqani bo'laklab o'qishi va oldinga surishi uchun
  {
    scheme: 'ling-musiqa',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
])

const MUSIQA_PAPKA_KALIT = 'pleyer_papka'
let musiqaPapka: string | undefined

function manzil(qism = ''): { url?: string; fayl?: string } {
  const asos = process.env['ELECTRON_RENDERER_URL']
  if (asos) return { url: `${asos}${qism}` }
  return { fayl: join(__dirname, '../renderer/index.html') }
}

function sahifaniYukla(oyna: BrowserWindow, qism = ''): void {
  const m = manzil(qism)
  if (m.url) oyna.loadURL(m.url)
  else oyna.loadFile(m.fayl!, { hash: qism.replace('#', '') })
}

// Kompyuter uyqudan qaytganda yoki dev server hali tayyor bo'lmaganda sahifa
// yuklanmay qolishi mumkin (ERR_NETWORK_IO_SUSPENDED). Bunda oyna bo'sh qoladi,
// shuning uchun uzilishda bir necha marta qayta urinamiz.
function yukla(oyna: BrowserWindow, qism = ''): void {
  let urinish = 0

  oyna.webContents.on('did-fail-load', (_h, kod, tavsif) => {
    // -3 = so'rov bekor qilindi (yangi yuklash boshlandi), bu xato emas
    if (kod === -3 || oyna.isDestroyed() || urinish >= 8) return
    urinish += 1
    console.error(`[${qism || 'asosiy'}] yuklanmadi (${kod} ${tavsif}), ${urinish}-urinish`)
    setTimeout(() => {
      if (!oyna.isDestroyed()) sahifaniYukla(oyna, qism)
    }, 800 * urinish)
  })

  oyna.webContents.on('did-finish-load', () => {
    urinish = 0
  })

  sahifaniYukla(oyna, qism)
}

// Kompyuter uyqudan qaytganda bo'sh qolgan oynalarni tiklaymiz
function uyqudanKeyinTiklash(oynalar: () => (BrowserWindow | null)[]): void {
  powerMonitor.on('resume', () => {
    for (const oyna of oynalar()) {
      if (!oyna || oyna.isDestroyed()) continue
      if (oyna.webContents.getURL()) continue // sahifa joyida
      oyna.webContents.reload()
    }
  })
}

function asosiyOynaYarat(): void {
  asosiyOyna = new BrowserWindow({
    width: 1040,
    height: 760,
    backgroundColor: '#111214',
    title: 'Ling',
    icon: join(app.getAppPath(), 'build/ikonka.png'),
    show: !fondaOchildi,
    autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false }
  })

  yukla(asosiyOyna)

  // Oyna ichidagi xatolar terminalda ham ko'rinsin — nosozlikni topish oson bo'ladi
  asosiyOyna.webContents.on('console-message', (hodisa) => {
    if (hodisa.level === 'error' || hodisa.level === 'warning') {
      console.error(`[oyna ${hodisa.level}]`, hodisa.message)
    }
  })
  asosiyOyna.webContents.on('did-fail-load', (_h, kod, tavsif) => {
    console.error('[oyna] yuklanmadi:', kod, tavsif)
  })
  asosiyOyna.webContents.on('render-process-gone', (_h, sabab) => {
    console.error('[oyna] jarayon yiqildi:', sabab.reason)
  })

  // X bosilganda dastur o'chmaydi — tray'da qolib, nusxalarni yig'ishda davom etadi
  asosiyOyna.on('close', (hodisa) => {
    if (chiqmoqda) return
    hodisa.preventDefault()
    asosiyOyna?.hide()
  })
}

function nestJoylash(oyna: BrowserWindow): void {
  // workArea emas, butun ekran: panel vazifalar paneli ustida, eng burchakda tursin
  const ekran = screen.getPrimaryDisplay().bounds
  oyna.setBounds({
    x: ekran.x,
    y: ekran.y + ekran.height - NEST_BALANDLIK,
    width: NEST_KENGLIK,
    height: NEST_BALANDLIK
  })
}

function nestOynaYarat(): void {
  nestOyna = new BrowserWindow({
    width: NEST_KENGLIK,
    height: NEST_BALANDLIK,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  nestOyna.setAlwaysOnTop(true, 'screen-saver')
  nestOyna.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  nestOyna.on('blur', () => {
    if (nestSabab !== 'burchak') nestYashir()
  })
  yukla(nestOyna, '#nest')
}

// Tugma ob-havo widjeti turgan joyni to'liq qoplaydi
const TUGMA_KENGLIK = 180

// Vazifalar paneli balandligi: butun ekran va ish maydoni farqi
function vazifalarPaneliBalandligi(): number {
  const ekran = screen.getPrimaryDisplay()
  const farq = ekran.bounds.height - ekran.workArea.height
  return farq > 8 ? farq : 44
}

function tugmaJoylash(oyna: BrowserWindow): void {
  const ekran = screen.getPrimaryDisplay().bounds
  const balandlik = vazifalarPaneliBalandligi()
  oyna.setBounds({
    x: ekran.x,
    y: ekran.y + ekran.height - balandlik,
    width: TUGMA_KENGLIK,
    height: balandlik
  })
}

// Burchakdagi doimiy kichik tugma — Windows widjeti o'rnini egallaydi
function tugmaOynaYarat(): void {
  tugmaOyna = new BrowserWindow({
    width: TUGMA_KENGLIK,
    height: vazifalarPaneliBalandligi(),
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  tugmaOyna.setAlwaysOnTop(true, 'screen-saver')
  tugmaOyna.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  tugmaOyna.once('ready-to-show', () => {
    tugmaJoylash(tugmaOyna!)
    tugmaOyna!.showInactive()
  })
  yukla(tugmaOyna, '#tugma')
}

// Tugmani qayta ko'rsatish: to'liq ekranda (video, o'yin) ko'rinmaydi
function tugmaniKorsat(): void {
  if (!tugmaOyna || toliqEkran || tugmaOyna.isVisible()) return
  tugmaJoylash(tugmaOyna)
  // Avval ko'rsatamiz, keyin animatsiya: yashirin oynada animatsiya qotib qolib,
  // tugma ko'rinmas (shaffof) bo'lib qolardi
  tugmaOyna.showInactive()
  tugmaOyna.webContents.send('tugma:korsatildi')
}

function toliqEkranOzgardi(toliq: boolean): void {
  toliqEkran = toliq
  if (toliq) {
    tugmaOyna?.hide()
    // Burchakdan tasodifan ochilgan panel ham video ustida qolmasin
    if (nestOyna?.isVisible() && nestSabab === 'burchak') nestYashir()
  } else if (!nestOyna?.isVisible()) {
    tugmaniKorsat()
  }
}

function nestKorsat(sabab: 'burchak' | 'tugma' = 'tugma'): void {
  if (!nestOyna) return
  // Yopilish animatsiyasi o'rtasida qayta ochilsa — yopishni bekor qilamiz
  if (yopishTaymer) {
    clearTimeout(yopishTaymer)
    yopishTaymer = null
  }
  nestSabab = sabab
  // Animatsiya ko'rsatishdan OLDIN boshlansin — aks holda bir kadr tayyor panel ko'rinib qoladi
  nestOyna.webContents.send('nest:korsatildi')
  nestJoylash(nestOyna)
  // Burchakdan ochilsa fokus olmaydi (ish buzilmasin), tugma yoki tezkor tugma bilan ochilsa
  // fokus oladi — shunda qidiruvga darhol yozish mumkin va ortiqcha yopilib ketmaydi
  if (sabab === 'burchak') nestOyna.showInactive()
  else {
    nestOyna.show()
    nestOyna.focus()
  }
  nestOyna.setAlwaysOnTop(true, 'screen-saver')
  tugmaOyna?.hide()
  nestOyna.webContents.send('nusxalar:yangilandi')
}

// Panel birdan yo'qolmaydi: avval yumshoq so'nadi, keyin oyna yashiriladi
const YOPISH_ANIMATSIYASI = 180

function nestYashir(): void {
  nestSabab = null
  if (!nestOyna?.isVisible()) {
    tugmaniKorsat()
    return
  }
  if (yopishTaymer) return
  nestOyna.webContents.send('nest:yopilmoqda')
  yopishTaymer = setTimeout(() => {
    yopishTaymer = null
    nestOyna?.hide()
    tugmaniKorsat()
  }, YOPISH_ANIMATSIYASI)
}

function nestAlmashtir(): void {
  if (nestOyna?.isVisible() && !yopishTaymer) nestYashir()
  else nestKorsat()
}

// Kursor pastki chap burchakka tegsa Nest chiqadi, paneldan uzoqlashsa yopiladi
function burchakniKuzat(): void {
  setInterval(() => {
    if (!nestOyna) return
    const nuqta = screen.getCursorScreenPoint()
    const ekran = screen.getPrimaryDisplay().bounds
    const burchakda = nuqta.x <= ekran.x + 4 && nuqta.y >= ekran.y + ekran.height - 2

    // To'liq ekranda (video, o'yin) tugma ham, burchak ham ishlamaydi — tezkor tugma ishlaydi
    if (toliqEkran) return

    // Tugma boshqa oynalar ostida qolib ketmasin
    if (tugmaOyna && !nestOyna.isVisible()) {
      tugmaniKorsat()
      tugmaOyna.setAlwaysOnTop(true, 'screen-saver')
      tugmaOyna.moveTop()
    }

    if (burchakda && burchakYoqilgan && !nestOyna.isVisible()) {
      nestKorsat('burchak')
      return
    }

    if (nestOyna.isVisible() && nestSabab === 'burchak' && !nestOyna.isFocused()) {
      const chek = nestOyna.getBounds()
      const tashqarida =
        nuqta.x < chek.x - 24 ||
        nuqta.x > chek.x + chek.width + 24 ||
        nuqta.y < chek.y - 24 ||
        nuqta.y > chek.y + chek.height + 24
      if (tashqarida) nestYashir()
    }
  }, 220)
}

function trayYarat(): void {
  tray = new Tray(join(app.getAppPath(), 'build/tray.png'))
  tray.setToolTip('Ling')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Ling'ni ochish",
        click: () => {
          asosiyOyna?.show()
          asosiyOyna?.focus()
        }
      },
      { label: 'Nest', click: nestAlmashtir },
      { type: 'separator' },
      {
        label: 'Chiqish',
        click: () => {
          chiqmoqda = true
          app.quit()
        }
      }
    ])
  )
  tray.on('click', nestAlmashtir)
}

// --- Nusxa buferi ---
// Electron 44 da bufer API'si MIME turlari bilan ishlaydi: clipboard.read() -> ClipboardItem[]

const RASM_TURI = 'image/png'

function barmoq(bayt: Buffer): string {
  return createHash('sha1').update(bayt).digest('hex')
}

async function buferdagiRasm(): Promise<Buffer | null> {
  const elementlar = await clipboard.read()
  for (const element of elementlar) {
    if (element.types.includes(RASM_TURI)) {
      const blob = (await element.getType(RASM_TURI)) as Blob
      return Buffer.from(await blob.arrayBuffer())
    }
  }
  return null
}

// Faylni Windows buferiga FAYL sifatida qo'yamiz (Telegram, Explorer, pochtaga qo'yish uchun).
// Electron buferi fayl formatini qo'llamaydi, shuning uchun PowerShell orqali.
function faylniBuferga(yol: string): Promise<boolean> {
  const xavfsiz = yol.replace(/'/g, "''")
  return new Promise((bajar) => {
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', `Set-Clipboard -LiteralPath '${xavfsiz}'`],
      (xato) => {
        if (xato) console.error('Faylni buferga qo-yib bo-lmadi:', xato)
        bajar(!xato)
      }
    )
  })
}

async function rasmniBuferga(bayt: Buffer): Promise<void> {
  const blob = new Blob([new Uint8Array(bayt)], { type: RASM_TURI })
  await clipboard.write([new ClipboardItem({ [RASM_TURI]: blob })])
}

let oxirgiMatn = ''
let oxirgiRasm = ''

// Nest'dan rasm nusxa olinganda Windows uni qayta kodlaydi va barmoq izi o'zgaradi.
// Shuning uchun o'zimiz qo'ygan rasmni qisqa vaqt ichida yangi nusxa deb hisoblamaymiz.
let ozimizYozdi = 0
const OZIMIZ_OYNASI = 2500

function hammagaXabar(): void {
  asosiyOyna?.webContents.send('nusxalar:yangilandi')
  nestOyna?.webContents.send('nusxalar:yangilandi')
}

async function buferniTekshir(): Promise<void> {
  const rasm = await buferdagiRasm()
  if (rasm) {
    const yangiBarmoq = barmoq(rasm)
    if (yangiBarmoq !== oxirgiRasm) {
      oxirgiRasm = yangiBarmoq
      // Bu rasmni Ling'ning o'zi buferga qo'ygan bo'lsa, ro'yxatga takror qo'shmaymiz
      if (Date.now() - ozimizYozdi < OZIMIZ_OYNASI) return
      const faylNomi = `${Date.now()}.png`
      writeFileSync(join(rasmlarPapka, faylNomi), rasm)
      await qoshishRasm(faylNomi, `Rasm ${(rasm.length / 1024).toFixed(0)} KB`)
      hammagaXabar()
    }
    return
  }

  const matn = await clipboard.readText()
  if (matn && matn !== oxirgiMatn) {
    oxirgiMatn = matn
    const yangi = await qoshishMatn(matn, 'tizim')
    if (yangi) hammagaXabar()
  }
}

async function buferniKuzat(): Promise<void> {
  oxirgiMatn = await clipboard.readText()
  const boshlangich = await buferdagiRasm()
  if (boshlangich) oxirgiRasm = barmoq(boshlangich)
  setInterval(() => {
    buferniTekshir().catch((xato) => console.error('Bufer xatosi:', xato))
  }, 800)
}

const kichiklarPapka = join(rasmlarPapka, 'kichik')
mkdirSync(kichiklarPapka, { recursive: true })

// 4K skrinshotni ro'yxatda to'liq o'lchamda ochish sekin — 96 px balandlikdagi nusxa yetadi.
// Yasab bo'lmasa, asl fayl qaytadi
function kichikRasm(nomi: string): string {
  const asl = join(rasmlarPapka, nomi)
  const kichik = join(kichiklarPapka, nomi.replace(/\.[^.]+$/, '') + '.jpg')
  if (existsSync(kichik)) return kichik
  try {
    const rasm = nativeImage.createFromPath(asl)
    if (rasm.isEmpty()) return asl
    const { height } = rasm.getSize()
    const natija = height > 96 ? rasm.resize({ height: 96, quality: 'good' }) : rasm
    writeFileSync(kichik, natija.toJPEG(80))
    return kichik
  } catch {
    return asl
  }
}

// Kompyuterdan biriktirilgan hujjatlar nusxasi shu yerda saqlanadi (asl fayl ko'chsa ham yo'qolmaydi)
const hujjatlarPapka = join(app.getPath('userData'), 'fayllar')
mkdirSync(hujjatlarPapka, { recursive: true })

const RASM_KENGAYTMALAR = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif']

// AI "nom.pdf.html" yozsa, Ling uni ko'rinmas oynada ochib haqiqiy PDF'ga aylantiradi
async function pdfYasa(htmlYol: string): Promise<string | null> {
  const pdfYol = htmlYol.replace(/\.pdf\.html?$/i, '.pdf')
  const oyna = new BrowserWindow({ show: false, webPreferences: { javascript: true } })
  try {
    await oyna.loadFile(htmlYol)
    const bayt = await oyna.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
    writeFileSync(pdfYol, bayt)
    return pdfYol
  } catch (xato) {
    console.error('PDF yasab bo-lmadi:', xato)
    return null
  } finally {
    oyna.destroy()
  }
}

// Faylni Nest'ga qo'shadi: rasm bo'lsa PNG qilib rasmlar papkasiga, qolganlari "fayl" turi.
// `nusxala` — kompyuterdan kelgan faylni Ling papkasiga ko'chirib olish kerakmi
async function faylniNestgaQosh(
  yol: string,
  manba: 'ai' | 'kompyuter',
  nusxala = false
): Promise<Nusxa | null> {
  const nomi = basename(yol)
  const kengaytma = extname(nomi).toLowerCase()

  if (RASM_KENGAYTMALAR.includes(kengaytma)) {
    const rasm = nativeImage.createFromPath(yol)
    if (rasm.isEmpty()) return null
    const png = rasm.toPNG()
    const faylNomi = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`
    writeFileSync(join(rasmlarPapka, faylNomi), png)
    const { width, height } = rasm.getSize()
    const tavsif = manba === 'ai' ? `AI rasmi ${width}×${height}` : nomi
    return qoshishRasm(faylNomi, tavsif, manba)
  }

  let manzilYol = yol
  if (/\.pdf\.html?$/i.test(nomi)) {
    const pdf = await pdfYasa(yol)
    if (pdf) manzilYol = pdf
  } else if (nusxala) {
    manzilYol = join(hujjatlarPapka, `${Date.now()}-${nomi}`)
    copyFileSync(yol, manzilYol)
  }
  return qoshishFayl(manzilYol, basename(manzilYol), manba)
}

async function yollardanQosh(yollar: string[]): Promise<Nusxa[]> {
  const qoshilgan: Nusxa[] = []
  for (const yol of yollar.slice(0, 10)) {
    try {
      if (!statSync(yol).isFile()) continue
      const nusxa = await faylniNestgaQosh(yol, 'kompyuter', true)
      if (nusxa) qoshilgan.push(nusxa)
    } catch (xato) {
      console.error('Faylni biriktirib bo-lmadi:', yol, xato)
    }
  }
  if (qoshilgan.length) hammagaXabar()
  return qoshilgan
}

// Nusxaning diskdagi to'liq yo'li
function toliqYol(nusxa: Nusxa): string | null {
  if (!nusxa.fayl) return null
  return nusxa.tur === 'rasm' ? join(rasmlarPapka, nusxa.fayl) : nusxa.fayl
}

function rasmFaylniOchir(fayl: string | null): void {
  if (!fayl) return
  rmSync(join(rasmlarPapka, fayl), { force: true })
  rmSync(join(kichiklarPapka, fayl.replace(/\.[^.]+$/, '') + '.jpg'), { force: true })
}

// Windows bilan birga ishga tushish (birinchi ishga tushishda yoqiladi)
const AVTO_KALIT = 'avto_ishga_tushish'

async function avtoIshgaTushishSozla(): Promise<void> {
  // Ishlab chiqish rejimida Windows'ga bo'sh electron.exe yozilib qoladi va kompyuter
  // yoqilganda Ling o'rniga Electron'ning standart oynasi ochiladi. Shuning uchun
  // avtomatik ishga tushish faqat o'rnatilgan (.exe) Ling uchun yoziladi.
  if (!app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: false })
    app.setLoginItemSettings({ openAtLogin: false, args: ['--fonda'] })
    return
  }

  const saqlangan = await sozlamaOqish(AVTO_KALIT)
  const yoqilgan = saqlangan === undefined ? true : saqlangan === '1'
  if (saqlangan === undefined) await sozlamaYozish(AVTO_KALIT, '1')
  app.setLoginItemSettings({ openAtLogin: yoqilgan, args: ['--fonda'] })
}

async function avtoIshgaTushishmi(): Promise<boolean> {
  const saqlangan = await sozlamaOqish(AVTO_KALIT)
  return saqlangan === undefined ? true : saqlangan === '1'
}

// "Control+Shift+V" -> "Ctrl + Shift + V" (tugma va sozlamalarda ko'rsatish uchun)
function tugmaYozuvi(tugma: string): string {
  return tugma.replace('Control', 'Ctrl').split('+').join(' + ')
}

function sozlamalarIpc(): void {
  ipcMain.handle('sozlamalar:ol', async () => ({
    nestTugmasi,
    burchak: burchakYoqilgan,
    avto: await avtoIshgaTushishmi(),
    // Ishlab chiqish rejimida Windows'ga yozilmaydi — tugma faqat o'rnatilgan Ling'da ishlaydi
    avtoMumkin: app.isPackaged,
    muddat: await ochirilganMuddat(),
    musiqaPapka: musiqaPapka ?? null
  }))

  ipcMain.handle('sozlamalar:tugmaYozuvi', () => tugmaYozuvi(nestTugmasi))

  // Yangi tugma darhol ishlaydi, eskisi o'chadi. Band bo'lsa — eskisi qoladi
  ipcMain.handle('sozlamalar:tugma', async (_h, yangi: string) => {
    if (!yangi || yangi === nestTugmasi) return { boldi: true, tugma: nestTugmasi }
    globalShortcut.unregister(nestTugmasi)
    let boldi = false
    try {
      boldi = globalShortcut.register(yangi, nestAlmashtir)
    } catch {
      boldi = false
    }
    if (!boldi) {
      globalShortcut.register(nestTugmasi, nestAlmashtir)
      return { boldi: false, tugma: nestTugmasi }
    }
    nestTugmasi = yangi
    await sozlamaYozish(TUGMA_KALIT, yangi)
    tugmaOyna?.webContents.send('sozlamalar:tugmaOzgardi', tugmaYozuvi(yangi))
    return { boldi: true, tugma: yangi }
  })

  ipcMain.handle('sozlamalar:burchak', async (_h, yoq: boolean) => {
    burchakYoqilgan = yoq
    await sozlamaYozish(BURCHAK_KALIT, yoq ? '1' : '0')
    return true
  })

  ipcMain.handle('sozlamalar:avto', async (_h, yoq: boolean) => {
    await sozlamaYozish(AVTO_KALIT, yoq ? '1' : '0')
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: yoq, args: ['--fonda'] })
    return true
  })

  // 0 — cheksiz (hech qachon o'chmaydi)
  ipcMain.handle('sozlamalar:muddat', async (_h, kun: number) => {
    await sozlamaYozish(OCHIRILGAN_MUDDAT_KALIT, String(kun))
    for (const fayl of await eskilarniTozala(kun)) rasmFaylniOchir(fayl)
    hammagaXabar()
    return true
  })

  ipcMain.handle('sozlamalar:clilar', () => cliHolati())
  ipcMain.handle('sozlamalar:statistika', () => statistika())

  ipcMain.handle('sozlamalar:zaxira', async () => {
    const natija = await dialog.showOpenDialog(asosiyOyna!, {
      title: 'Zaxira qayerga saqlansin?',
      properties: ['openDirectory', 'createDirectory']
    })
    if (natija.canceled || !natija.filePaths[0]) return null
    try {
      const papka = zaxiraOl(natija.filePaths[0])
      shell.showItemInFolder(join(papka, 'ling.db'))
      return papka
    } catch (xato) {
      console.error('Zaxira olib bo-lmadi:', xato)
      return null
    }
  })
}

// Windows ekran yozuvlarini saqlaydigan papkalar
function videoPapkalar(): string[] {
  const videolar = app.getPath('videos')
  return [videolar, join(videolar, 'Captures'), join(videolar, 'Screen Recordings')].filter((p) =>
    existsSync(p)
  )
}

const VIDEO_KENGAYTMALAR = ['.mp4', '.mkv', '.mov', '.webm']

function videoMi(nomi: string): boolean {
  return VIDEO_KENGAYTMALAR.some((k) => nomi.toLowerCase().endsWith(k))
}

// Faqat dastur ishga tushgandan keyin paydo bo'lgan yangi yozuvlar Nest'ga tushadi
function videolarniKuzat(): void {
  const boshlanish = Date.now()

  for (const papka of videoPapkalar()) {
    try {
      watch(papka, { persistent: false }, (_hodisa, nomi) => {
        if (!nomi || !videoMi(String(nomi))) return
        const yol = join(papka, String(nomi))
        setTimeout(async () => {
          try {
            const holat = statSync(yol)
            // Yozuv tugaganini kutamiz: fayl hajmi 0 bo'lmasin
            if (!holat.size || holat.mtimeMs < boshlanish - 60_000) return
            const yangi = await qoshishVideo(yol, String(nomi))
            if (yangi) hammagaXabar()
          } catch {
            // fayl o'chirilgan yoki hali yozilyapti
          }
        }, 1500)
      })
    } catch (xato) {
      console.error('Video papkani kuzatib bo-lmadi:', papka, xato)
    }
  }
}

// Dastur ilk marta ochilganda oxirgi 3 ta yozuvni qo'shamiz
async function songgiVideolarniQosh(): Promise<void> {
  const fayllar: { yol: string; nomi: string; vaqt: number }[] = []
  for (const papka of videoPapkalar()) {
    for (const nomi of readdirSync(papka)) {
      if (!videoMi(nomi)) continue
      const yol = join(papka, nomi)
      try {
        fayllar.push({ yol, nomi, vaqt: statSync(yol).mtimeMs })
      } catch {
        // o'qib bo'lmadi
      }
    }
  }
  fayllar.sort((a, b) => b.vaqt - a.vaqt)
  for (const fayl of fayllar.slice(0, 3)) await qoshishVideo(fayl.yol, fayl.nomi)
}

app.whenReady().then(async () => {
  // Yopilayotgan nusxa hech qanday oyna ochmasin
  if (!yagona) return

  // Standart menyu qatori (File, Edit, View, Window) Ling'ga kerak emas
  Menu.setApplicationMenu(null)

  // ling-rasm://<nom>?kichik — ro'yxat uchun kichraytirilgan nusxa (birinchi so'ralganda yasaladi)
  protocol.handle('ling-rasm', (sorov) => {
    const m = new URL(sorov.url)
    const nomi = decodeURIComponent(m.hostname || m.pathname.slice(1))
    const asl = join(rasmlarPapka, nomi)
    const yol = m.searchParams.has('kichik') ? kichikRasm(nomi) : asl
    return net.fetch(pathToFileURL(yol).toString())
  })

  await seed()
  musiqaPapka = await sozlamaOqish(MUSIQA_PAPKA_KALIT)
  protocol.handle('ling-musiqa', (sorov) => musiqaJavob(sorov, musiqaPapka))

  if (!process.env['LING_PROFIL']) await avtoIshgaTushishSozla()

  // Foydalanuvchi sozlamalari: Nest tugmasi va burchakdan ochish
  nestTugmasi = (await sozlamaOqish(TUGMA_KALIT)) ?? STANDART_TUGMA
  burchakYoqilgan = (await sozlamaOqish(BURCHAK_KALIT)) !== '0'
  sozlamalarIpc()

  // Muddati o'tgan o'chirilganlarni tozalaymiz
  const muddat = await ochirilganMuddat()
  for (const fayl of await eskilarniTozala(muddat)) rasmFaylniOchir(fayl)

  // Nusxalar
  ipcMain.handle('nusxalar:royxat', (_h, sorov: Sorov = {}) => royxat(sorov))

  ipcMain.handle('nusxalar:nusxala', async (_h, id: number) => {
    const nusxa = await bittasi(id)
    if (!nusxa) return false
    if ((nusxa.tur === 'video' || nusxa.tur === 'fayl') && nusxa.fayl) {
      // Video/hujjat fayl sifatida nusxa olinadi; ishlamasa hech bo'lmasa yo'li qoladi
      const boldi = await faylniBuferga(nusxa.fayl)
      if (!boldi) {
        await clipboard.writeText(nusxa.fayl)
        oxirgiMatn = nusxa.fayl
      }
    } else if (nusxa.tur === 'rasm' && nusxa.fayl) {
      const bayt = readFileSync(join(rasmlarPapka, nusxa.fayl))
      ozimizYozdi = Date.now()
      await rasmniBuferga(bayt)
      // Windows rasmni qayta kodlashi mumkin — buferdagi haqiqiy holatni o'qib olamiz
      const qaytgan = await buferdagiRasm()
      oxirgiRasm = barmoq(qaytgan ?? bayt)
      ozimizYozdi = Date.now()
    } else {
      await clipboard.writeText(nusxa.matn)
      oxirgiMatn = nusxa.matn
    }
    await kotarish(id)
    return true
  })

  ipcMain.handle('nusxalar:ochirish', async (_h, id: number) => {
    await ochirish(id)
    hammagaXabar()
    return true
  })

  // O'chirilganlar
  ipcMain.handle('ochirilgan:royxat', () => ochirilganRoyxat())

  ipcMain.handle('ochirilgan:tiklash', async (_h, id: number) => {
    await tiklash(id)
    hammagaXabar()
    return true
  })

  ipcMain.handle('ochirilgan:butunlay', async (_h, id: number) => {
    rasmFaylniOchir(await butunlayOchirish(id))
    return true
  })

  ipcMain.handle('ochirilgan:muddat', () => ochirilganMuddat())

  // Tezkor so'zlar
  ipcMain.handle('tezkor:royxat', (_h, qidiruv = '') => tezkorRoyxat(qidiruv))

  ipcMain.handle('tezkor:qoshish', (_h, nom: string, qiymat: string, maxfiy: boolean) =>
    tezkorQoshish(nom, qiymat, maxfiy)
  )

  ipcMain.handle('tezkor:ochirish', async (_h, id: number) => {
    await tezkorOchirish(id)
    return true
  })

  ipcMain.handle('tezkor:nusxala', async (_h, id: number) => {
    const soz = await tezkorBittasi(id)
    if (!soz) return false
    await clipboard.writeText(soz.qiymat)
    oxirgiMatn = soz.qiymat
    return true
  })

  // Chat
  ipcMain.handle('chat:suhbatlar', () => suhbatRoyxat())

  ipcMain.handle('chat:modellar', (_h, provayder: Provayder) => modellar(provayder))

  ipcMain.handle('chat:yangi', (_h, provayder: Provayder, model: string, kuch: string) =>
    suhbatYarat(provayder, model, kuch)
  )

  // Har xabar o'z biriktirmalari bilan: foydalanuvchi biriktirganlari va AI yaratgan fayllar
  ipcMain.handle('chat:xabarlar', async (_h, suhbatId: number) => {
    const royxat = await xabarRoyxat(suhbatId)
    return Promise.all(royxat.map(async (x) => ({ ...x, fayllar: await biriktirmaRoyxat(x.id) })))
  })

  // Xabarni tahrirlash: shu xabardan boshlab suhbat kesiladi, keyin qayta yuboriladi
  ipcMain.handle('chat:qirq', async (_h, suhbatId: number, xabarId: number) => {
    await xabarlarniQirq(suhbatId, xabarId)
    return true
  })

  // Xabar matnini nusxalash (oddiy Ctrl+C kabi — Nest'ga ham tushadi)
  ipcMain.handle('chat:nusxala', async (_h, matn: string) => {
    await clipboard.writeText(matn)
    return true
  })

  // Kompyuterdan fayl tanlash: tanlanganlar Nest'ga qo'shiladi va chatga biriktiriladi
  ipcMain.handle('chat:kompyuterdan', async () => {
    const natija = await dialog.showOpenDialog(asosiyOyna!, {
      title: 'Biriktirish uchun fayl tanlang',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Rasmlar va hujjatlar',
          extensions: [
            'png',
            'jpg',
            'jpeg',
            'webp',
            'gif',
            'bmp',
            'pdf',
            'html',
            'txt',
            'md',
            'docx',
            'csv',
            'json'
          ]
        },
        { name: 'Barcha fayllar', extensions: ['*'] }
      ]
    })
    if (natija.canceled) return []
    return yollardanQosh(natija.filePaths)
  })

  // Oynaga sudrab tashlangan fayllar
  ipcMain.handle('chat:yollardan', (_h, yollar: string[]) => yollardanQosh(yollar))

  // Faylni Windows'dagi o'z dasturida ochish (rasm — rasm ko'rgichda, PDF — brauzerda)
  ipcMain.handle('fayl:och', async (_h, id: number) => {
    const nusxa = await bittasi(id)
    const yol = nusxa ? toliqYol(nusxa) : null
    if (!yol || !existsSync(yol)) return false
    return (await shell.openPath(yol)) === ''
  })

  ipcMain.handle('fayl:papkada', async (_h, id: number) => {
    const nusxa = await bittasi(id)
    const yol = nusxa ? toliqYol(nusxa) : null
    if (!yol || !existsSync(yol)) return false
    shell.showItemInFolder(yol)
    return true
  })

  ipcMain.handle('chat:suhbatOchirish', async (_h, suhbatId: number) => {
    await suhbatOchirish(suhbatId)
    return true
  })

  ipcMain.handle(
    'chat:sozla',
    async (_h, suhbatId: number, provayder: Provayder, model: string, kuch: string) => {
      await suhbatYangila(suhbatId, { provayder, model, kuch })
      return true
    }
  )

  ipcMain.handle(
    'chat:yubor',
    async (hodisa, suhbatId: number, matn: string, biriktirmaIdlar: number[] = []) => {
      const suhbat = await suhbatBittasi(suhbatId)
      if (!suhbat) return { matn: 'Suhbat topilmadi', xato: true }

      // Foydalanuvchi xabarini saqlaymiz
      const menXabar = await xabarQoshish(suhbatId, 'men', matn)
      for (const nusxaId of biriktirmaIdlar) await biriktirmaQoshish(menXabar.id, nusxaId)

      // Suhbat nomi birinchi savoldan olinadi
      if (suhbat.nom === 'Yangi suhbat') {
        await suhbatYangila(suhbatId, { nom: matn.slice(0, 40) })
      }

      // AI uchun to'liq matn: ko'rsatma + tarix + biriktirmalar + yangi savol
      const tarix = await xabarRoyxat(suhbatId)
      const provayder = suhbat.provayder as Provayder
      const papka = ishPapkasi(suhbatId)
      const qatorlar: string[] = [
        "Sen Ling dasturining yordamchisisan. Foydalanuvchi bilan o'zbek tilida (lotin yozuvida) gaplash.",
        "Javobing qisqa va aniq bo'lsin. Terminal buyrug'i yoki python ishga tushirma.",
        '',
        "Fayl yaratish mumkin — Ling ularni foydalanuvchiga chatda va Nest'da ko'rsatadi:",
        provayder === 'gemini'
          ? "- Rasm so'ralsa: generate_image vositasi bilan chiz (buyruq yoki python emas)."
          : "- Rasm so'ralsa: o'zing chizma. Javobingda alohida qatorda [[RASM: rasmning batafsil inglizcha tavsifi]] yoz — Ling rasmni chizdirib beradi.",
        "- HTML sahifa so'ralsa: joriy papkaga .html fayl yoz (CSS va JS ichida bo'lsin).",
        "- PDF so'ralsa: joriy papkaga nomi .pdf.html bilan tugaydigan HTML yoz (masalan hisobot.pdf.html), A4 uchun chiroyli bezalgan bo'lsin — Ling uni PDF'ga aylantiradi.",
        "- Fayllarni faqat joriy papkaga yoz. Javobingda fayl yo'lini yozish shart emas, qisqa izoh yetadi."
      ]

      const oldingilar = tarix.slice(0, -1)
      if (oldingilar.length) {
        qatorlar.push('', '--- Suhbat tarixi ---')
        for (const x of oldingilar) {
          qatorlar.push(`${x.rol === 'men' ? 'Foydalanuvchi' : 'Yordamchi'}: ${x.matn}`)
        }
      }

      if (biriktirmaIdlar.length) {
        qatorlar.push('', '--- Biriktirilgan ---')
        for (const nusxaId of biriktirmaIdlar) {
          const nusxa = await bittasi(nusxaId)
          if (!nusxa) continue
          if (nusxa.tur === 'matn') qatorlar.push(`Matn: ${nusxa.matn}`)
          else if (nusxa.tur === 'rasm' && nusxa.fayl)
            qatorlar.push(`Rasm fayli (o'qib ko'r): ${join(rasmlarPapka, nusxa.fayl)}`)
          else if (nusxa.tur === 'fayl' && nusxa.fayl)
            qatorlar.push(`Fayl (o'qib ko'r): ${nusxa.fayl}`)
          else if (nusxa.fayl) qatorlar.push(`Video fayli: ${nusxa.fayl}`)
        }
      }

      qatorlar.push('', '--- Foydalanuvchining yangi savoli ---', matn)

      const javob = await soraw(
        provayder,
        suhbat.model,
        (suhbat.kuch ?? 'medium') as Kuch,
        qatorlar.join('\n'),
        (bolak) => hodisa.sender.send('chat:bolak', { suhbatId, bolak }),
        papka,
        biriktirmaIdlar.length ? [rasmlarPapka, hujjatlarPapka] : []
      )

      const aiXabar = await xabarQoshish(suhbatId, 'ai', javob.matn, {
        provayder: suhbat.provayder,
        model: suhbat.model,
        xato: javob.xato,
        xatoTuri: javob.xatoTuri
      })

      // AI yaratgan rasm/HTML/PDF: Nest'ga qo'shiladi va shu javobga biriktiriladi.
      // PDF uchun yozilgan .pdf.html o'zi alohida ko'rsatilmaydi — undan PDF yasaladi
      for (const yol of javob.fayllar.slice(0, 12)) {
        try {
          const nusxa = await faylniNestgaQosh(yol, 'ai')
          if (nusxa) await biriktirmaQoshish(aiXabar.id, nusxa.id)
        } catch (xato) {
          console.error('AI faylini qo-shib bo-lmadi:', yol, xato)
        }
      }
      if (javob.fayllar.length) hammagaXabar()

      return { matn: javob.matn, xato: javob.xato }
    }
  )

  // Pleyer: o'z papkasi
  ipcMain.handle('pleyer:papka', () => ({
    papka: musiqaPapka ?? null,
    treklar: musiqaPapka ? musiqaRoyxati(musiqaPapka) : []
  }))

  ipcMain.handle('pleyer:papkaTanla', async () => {
    const natija = await dialog.showOpenDialog(asosiyOyna!, {
      title: 'Musiqa papkasini tanlang',
      properties: ['openDirectory']
    })
    if (natija.canceled || !natija.filePaths[0]) return null
    musiqaPapka = natija.filePaths[0]
    await sozlamaYozish(MUSIQA_PAPKA_KALIT, musiqaPapka)
    return { papka: musiqaPapka, treklar: musiqaRoyxati(musiqaPapka) }
  })

  // Pleyer: tashqi (Spotify, brauzer)
  ipcMain.handle('pleyer:tashqi', () => tashqiHolatiniOl())
  ipcMain.handle('pleyer:tashqiBuyruq', (_h, buyruq: 'almashtir' | 'keyingi' | 'oldingi') =>
    tashqiBuyruq(buyruq)
  )

  // Nest paneli
  ipcMain.handle('nest:almashtir', () => {
    nestAlmashtir()
    return true
  })

  ipcMain.handle('nest:yashir', () => {
    nestYashir()
    return true
  })

  ipcMain.handle('nest:asosiyni-ochish', () => {
    nestYashir()
    asosiyOyna?.show()
    asosiyOyna?.focus()
    return true
  })

  await songgiVideolarniQosh()

  asosiyOynaYarat()
  nestOynaYarat()
  tugmaOynaYarat()
  trayYarat()
  burchakniKuzat()
  toliqEkranniKuzat(toliqEkranOzgardi)
  videolarniKuzat()
  tashqiniKuzat((holat) => asosiyOyna?.webContents.send('pleyer:tashqi', holat))
  await buferniKuzat()

  uyqudanKeyinTiklash(() => [asosiyOyna, nestOyna, tugmaOyna])

  // Nest tugmasi sozlamadan olinadi; band bo'lsa standartiga qaytamiz
  if (!globalShortcut.register(nestTugmasi, nestAlmashtir) && nestTugmasi !== STANDART_TUGMA) {
    nestTugmasi = STANDART_TUGMA
    globalShortcut.register(nestTugmasi, nestAlmashtir)
  }

  // Muddati o'tgan o'chirilganlar har 6 soatda ham tozalanadi (Ling kunlab ochiq turadi)
  setInterval(
    async () => {
      for (const fayl of await eskilarniTozala(await ochirilganMuddat())) rasmFaylniOchir(fayl)
    },
    6 * 60 * 60 * 1000
  )

  screen.on('display-metrics-changed', () => {
    if (tugmaOyna) tugmaJoylash(tugmaOyna)
    if (nestOyna?.isVisible()) nestJoylash(nestOyna)
  })

  app.on('activate', () => {
    if (asosiyOyna) asosiyOyna.show()
    else asosiyOynaYarat()
  })
})

// Tray'da qolamiz: oynalar yopilsa ham dastur ishlashda davom etadi
app.on('window-all-closed', () => {})

app.on('before-quit', () => {
  chiqmoqda = true
  tashqiniTochtat()
  toliqEkranniTochtat()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
