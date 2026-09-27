import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'

// Asosiy ekranda biror oyna butun ekranni egallaganmi (YouTube to'liq ekran, video pleyer,
// o'yin)? Shunda burchakdagi Nest tugmasi videoning ustida turib qolmasligi kerak.
// Tekshiruv Windows'ning o'zidan: oldingi oyna o'lchami monitor o'lchamiga tengmi.
// Oddiy kattalashtirilgan (maximize) oyna vazifalar panelini yopmaydi — u hisoblanmaydi.
const SKRIPT = `
param([int]$ota)
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class LingEkran {
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint f);
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO mi);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
  public static int Tekshir() {
    IntPtr h = GetForegroundWindow();
    if (h == IntPtr.Zero) return 0;
    StringBuilder sinf = new StringBuilder(256);
    GetClassName(h, sinf, 256);
    string s = sinf.ToString();
    if (s == "Progman" || s == "WorkerW" || s == "Shell_TrayWnd" || s == "Shell_SecondaryTrayWnd") return 0;
    RECT r;
    if (!GetWindowRect(h, out r)) return 0;
    MONITORINFO mi = new MONITORINFO();
    mi.cbSize = Marshal.SizeOf(mi);
    if (!GetMonitorInfo(MonitorFromWindow(h, 2), ref mi)) return 0;
    if ((mi.dwFlags & 1) == 0) return 0;
    RECT m = mi.rcMonitor;
    return (r.L <= m.L && r.T <= m.T && r.R >= m.R && r.B >= m.B) ? 1 : 0;
  }
}
'@
$oldingi = -1
$sanoq = 0
while ($true) {
  $holat = [LingEkran]::Tekshir()
  if ($holat -ne $oldingi) {
    [Console]::Out.WriteLine($holat)
    [Console]::Out.Flush()
    $oldingi = $holat
  }
  $sanoq++
  if ($sanoq -ge 15) {
    $sanoq = 0
    if (-not (Get-Process -Id $ota -ErrorAction SilentlyContinue)) { exit }
  }
  Start-Sleep -Milliseconds 350
}
`

let jarayon: ChildProcessWithoutNullStreams | null = null
let toxtatildi = false
let qaytaUrinish = 0

export function toliqEkranniKuzat(ozgarganda: (toliq: boolean) => void): void {
  if (jarayon) return
  const fayl = join(app.getPath('userData'), 'toliq-ekran.ps1')
  writeFileSync(fayl, SKRIPT, 'utf8')

  jarayon = spawn(
    'powershell',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      fayl,
      '-ota',
      String(process.pid)
    ],
    { windowsHide: true }
  )

  let qoldiq = ''
  jarayon.stdout.on('data', (malumot: Buffer) => {
    qoldiq += malumot.toString()
    const qatorlar = qoldiq.split('\n')
    qoldiq = qatorlar.pop() ?? ''
    for (const qator of qatorlar) {
      const q = qator.trim()
      if (q === '0' || q === '1') {
        qaytaUrinish = 0
        ozgarganda(q === '1')
      }
    }
  })

  jarayon.on('error', (xato) => console.error("To'liq ekran kuzatuvchisi ishlamadi:", xato))

  // Kutilmaganda to'xtasa, bir necha marta qayta ishga tushiramiz
  jarayon.on('close', () => {
    jarayon = null
    if (toxtatildi || qaytaUrinish >= 3) return
    qaytaUrinish++
    setTimeout(() => toliqEkranniKuzat(ozgarganda), 3000)
  })
}

export function toliqEkranniTochtat(): void {
  toxtatildi = true
  jarayon?.kill()
  jarayon = null
}
