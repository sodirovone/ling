import { app } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { createReadStream, readdirSync, statSync, writeFileSync } from 'fs'
import { extname, join, relative, isAbsolute } from 'path'
import { Readable } from 'stream'

// --- O'z musiqa papkasi ---

export type Trek = { yol: string; nomi: string }

const MUSIQA_TURLARI: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.webm': 'audio/webm'
}

const ENG_KOP_TREK = 3000

// Papka va uning ichki papkalaridagi (3 qavatgacha) musiqa fayllari, nomi bo'yicha tartiblangan
export function musiqaRoyxati(papka: string): Trek[] {
  const natija: Trek[] = []

  function aylan(joriy: string, qavat: number): void {
    if (qavat > 3 || natija.length >= ENG_KOP_TREK) return
    let elementlar
    try {
      elementlar = readdirSync(joriy, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of elementlar) {
      if (natija.length >= ENG_KOP_TREK) return
      const yol = join(joriy, e.name)
      if (e.isDirectory()) aylan(yol, qavat + 1)
      else if (MUSIQA_TURLARI[extname(e.name).toLowerCase()]) {
        natija.push({ yol, nomi: e.name.replace(/\.[^.]+$/, '') })
      }
    }
  }

  aylan(papka, 0)
  return natija.sort((a, b) => a.nomi.localeCompare(b.nomi, 'uz', { numeric: true }))
}

// ling-musiqa://f/<yo'l> — <audio> oldinga-orqaga surish uchun Range so'rovlarini qo'llaydi.
// Faqat tanlangan papka ichidagi fayllar beriladi
export function musiqaJavob(sorov: Request, papka: string | undefined): Response {
  const yol = decodeURIComponent(new URL(sorov.url).pathname.slice(1))
  const nisbiy = papka ? relative(papka, yol) : '..'
  const tur = MUSIQA_TURLARI[extname(yol).toLowerCase()]
  if (!tur || nisbiy.startsWith('..') || isAbsolute(nisbiy))
    return new Response(null, { status: 403 })

  let hajm: number
  try {
    hajm = statSync(yol).size
  } catch {
    return new Response(null, { status: 404 })
  }

  const oraliq = /bytes=(\d*)-(\d*)/.exec(sorov.headers.get('range') ?? '')
  const bosh = oraliq?.[1] ? Number(oraliq[1]) : 0
  const oxir = oraliq?.[2] ? Math.min(Number(oraliq[2]), hajm - 1) : hajm - 1
  const oqim = Readable.toWeb(createReadStream(yol, { start: bosh, end: oxir })) as ReadableStream

  return new Response(oqim, {
    status: oraliq ? 206 : 200,
    headers: {
      'Content-Type': tur,
      'Content-Length': String(oxir - bosh + 1),
      'Accept-Ranges': 'bytes',
      ...(oraliq ? { 'Content-Range': `bytes ${bosh}-${oxir}/${hajm}` } : {})
    }
  })
}

// --- Tashqi pleyer (Spotify, brauzer va h.k.) ---
// Windows'ning media boshqaruvi (klaviaturadagi media tugmalari ishlatadigan xizmat)
// doimiy PowerShell jarayoni orqali kuzatiladi. Holat o'zgarganda JSON qator chiqaradi,
// stdin'dan "almashtir" / "keyingi" / "oldingi" buyruqlarini oladi.

export type TashqiHolat = {
  bor: boolean
  nom: string
  ijrochi: string
  ilova: string
  holat: string // 'Playing' | 'Paused' | 'Stopped' | ...
  pauzaMumkin: boolean
  keyingiMumkin: boolean
  oldingiMumkin: boolean
  xato?: string
}

const BOSH_HOLAT: TashqiHolat = {
  bor: false,
  nom: '',
  ijrochi: '',
  ilova: '',
  holat: '',
  pauzaMumkin: false,
  keyingiMumkin: false,
  oldingiMumkin: false
}

const SKRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$umumiy = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation${'`'}1' })[0]
function Kut($amal, $tur) { $v = $umumiy.MakeGenericMethod($tur).Invoke($null, @($amal)); $null = $v.Wait(3000); $v.Result }

$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$T = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
$P = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
$boshqaruvchi = Kut ($T::RequestAsync()) $T
if (-not $boshqaruvchi) {
  [Console]::Out.WriteLine('{"bor":false,"xato":"Windows media boshqaruvi topilmadi"}')
  exit 1
}

# [Console]::In.ReadLineAsync() .NET Framework'da bloklaydi, shuning uchun oqimning o'zidan o'qiymiz
$kirish = [Console]::OpenStandardInput()
$bufer = New-Object byte[] 256
$qator = $kirish.ReadAsync($bufer, 0, $bufer.Length)
$oldingi = ''

while ($true) {
  # Ling'ning o'zi (Electron) ham media sessiya ochadi — uni tashqi deb hisoblamaymiz
  $sessiyalar = @($boshqaruvchi.GetSessions() | Where-Object { $_.SourceAppUserModelId -notmatch 'electron|ling' })
  $tanlangan = $sessiyalar | Where-Object { "$($_.GetPlaybackInfo().PlaybackStatus)" -eq 'Playing' } | Select-Object -First 1
  if (-not $tanlangan) { $tanlangan = $sessiyalar | Select-Object -First 1 }

  if ($qator.IsCompleted) {
    $soni = $qator.Result
    # Ling yopilsa stdin ham yopiladi — jarayon tugaydi
    if ($soni -le 0) { break }
    $buyruqlar = [Text.Encoding]::ASCII.GetString($bufer, 0, $soni) -split '\s+'
    if ($tanlangan) {
      foreach ($buyruq in $buyruqlar) {
        switch ($buyruq) {
          'almashtir' { $null = $tanlangan.TryTogglePlayPauseAsync() }
          'keyingi' { $null = $tanlangan.TrySkipNextAsync() }
          'oldingi' { $null = $tanlangan.TrySkipPreviousAsync() }
        }
      }
    }
    $qator = $kirish.ReadAsync($bufer, 0, $bufer.Length)
    Start-Sleep -Milliseconds 250
    continue
  }

  if ($tanlangan) {
    $x = Kut ($tanlangan.TryGetMediaPropertiesAsync()) $P
    $i = $tanlangan.GetPlaybackInfo()
    $holat = [ordered]@{
      bor = $true
      nom = "$($x.Title)"
      ijrochi = "$($x.Artist)"
      ilova = "$($tanlangan.SourceAppUserModelId)"
      holat = "$($i.PlaybackStatus)"
      pauzaMumkin = [bool]($i.Controls.IsPauseEnabled -or $i.Controls.IsPlayEnabled)
      keyingiMumkin = [bool]$i.Controls.IsNextEnabled
      oldingiMumkin = [bool]$i.Controls.IsPreviousEnabled
    }
  } else {
    $holat = [ordered]@{ bor = $false; nom = ''; ijrochi = ''; ilova = ''; holat = ''; pauzaMumkin = $false; keyingiMumkin = $false; oldingiMumkin = $false }
  }

  $json = New-Object PSObject -Property $holat | ConvertTo-Json -Compress
  if ($json -ne $oldingi) {
    [Console]::Out.WriteLine($json)
    [Console]::Out.Flush()
    $oldingi = $json
  }
  Start-Sleep -Milliseconds 700
}
`

let jarayon: ChildProcessWithoutNullStreams | null = null
let tashqiHolat: TashqiHolat = BOSH_HOLAT
let qaytaUrinish = 0
let tinglovchi: (holat: TashqiHolat) => void = () => {}

export function tashqiniKuzat(ozgarganda: (holat: TashqiHolat) => void): void {
  tinglovchi = ozgarganda
  if (jarayon) return

  const fayl = join(app.getPath('userData'), 'tashqi-pleyer.ps1')
  // BOM bilan — aks holda PowerShell 5.1 o'zbekcha izohlarni noto'g'ri o'qiydi
  writeFileSync(fayl, '﻿' + SKRIPT, 'utf8')

  jarayon = spawn(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', fayl],
    { windowsHide: true }
  )

  let qoldiq = ''
  jarayon.stdout.on('data', (malumot: Buffer) => {
    qoldiq += malumot.toString('utf8')
    const qatorlar = qoldiq.split('\n')
    qoldiq = qatorlar.pop() ?? ''
    for (const qator of qatorlar) {
      try {
        tashqiHolat = { ...BOSH_HOLAT, ...JSON.parse(qator.trim()) }
        qaytaUrinish = 0
        tinglovchi(tashqiHolat)
      } catch {
        // JSON bo'lmagan qator
      }
    }
  })

  jarayon.on('error', (xato) => {
    console.error('Tashqi pleyer kuzatuvchisi ishga tushmadi:', xato)
  })

  // Jarayon kutilmaganda to'xtasa, bir necha marta qayta ishga tushiramiz
  jarayon.on('close', () => {
    jarayon = null
    if (chiqmoqda || qaytaUrinish >= 3) return
    qaytaUrinish++
    setTimeout(() => tashqiniKuzat(tinglovchi), 5000)
  })
}

export function tashqiHolatiniOl(): TashqiHolat {
  return tashqiHolat
}

export function tashqiBuyruq(buyruq: 'almashtir' | 'keyingi' | 'oldingi'): boolean {
  if (!jarayon) return false
  jarayon.stdin.write(buyruq + '\n')
  return true
}

let chiqmoqda = false

export function tashqiniTochtat(): void {
  chiqmoqda = true
  jarayon?.stdin.end()
  jarayon?.kill()
  jarayon = null
}
