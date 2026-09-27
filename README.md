# Ling

<img src="build/ikonka.png" width="96" align="right" alt="Ling">

**Ling** — Windows uchun shaxsiy yordamchi: nusxalar tarixi (**Nest**) va o'z AI obunangiz bilan ishlaydigan **Chat**. Hamma ma'lumot faqat sizning kompyuteringizda saqlanadi.

*English summary below.*

## Nima qila oladi

- **Nest** — nusxa olgan hamma narsangiz (matn, rasm, skrinshot, ekran yozuvi) bir joyda. Ekranning pastki chap burchagidan yoki `Ctrl + Shift + V` bilan ochiladi, qidiruv bor, bosilsa qayta nusxalanadi.
- **Tezkor so'zlar** — tez-tez yoziladigan narsalar (masalan, manzil). Maxfiylari `****` bilan yashiriladi.
- **Pleyer** — papkadagi musiqa va hozir o'ynayotgan tashqi pleyer (brauzer, Spotify) boshqaruvi.
- **Chat** — Claude yoki Gemini bilan suhbat. Nest'dan yoki kompyuterdan fayl biriktirish, rasm, HTML va PDF yaratish.
- **O'chirilganlar** — Nest'dan o'chirilganlar belgilangan muddatgacha saqlanadi.
- **Sozlamalar** — tugmalar, muddat, Windows bilan ishga tushish, qo'lda zaxira.

## O'rnatish

1. [Releases](../../releases) bo'limidan `Ling Setup.exe` ni yuklab oling va ishga tushiring.
2. O'rnatuvchi imzolanmagan, shuning uchun Windows "Windows protected your PC" deb ogohlantiradi — **More info → Run anyway** bosing.

Talab: Windows 10/11 (64-bit).

## O'z AI'ingizni ulash

Ling API kalit so'ramaydi — kompyuteringizdagi AI dasturlari orqali **o'z obunangiz** bilan ishlaydi. Kamida bittasini o'rnating:

| Provayder | O'rnatish | Kirish |
|---|---|---|
| **Claude** (Claude Pro/Max obunasi) | [Claude Code](https://claude.com/claude-code) — PowerShell'da: `irm https://claude.ai/install.ps1 \| iex` | terminalda `claude` yozib akkauntingizga kiring |
| **Gemini** (Google akkaunti) | [Antigravity CLI](https://antigravity.google) (`agy`) | terminalda `agy` yozib Google akkauntingizga kiring |

Keyin Ling'ni qayta oching: **Sozlamalar → AI ulanishlar** bo'limida "Ulangan" yozuvi chiqadi. Chatda yuqoridan provayder, model va kuchni tanlaysiz.

Rasm yaratishni Gemini (`agy`) bajaradi — shuning uchun rasm uchun `agy` o'rnatilgan bo'lishi kerak.

## Ma'lumotlar qayerda

Hamma narsa `%APPDATA%\Ling` papkasida: baza, rasmlar, biriktirilgan va AI yaratgan fayllar. Hech narsa internetga yuborilmaydi (faqat chatdagi savollaringiz o'zingiz tanlagan AI'ga boradi). Zaxira: **Sozlamalar → Ma'lumotlar → Zaxira olish**.

## Manba koddan ishga tushirish

```bash
npm install
npm run dev
```

O'rnatuvchi yig'ish: `npm run dist` → `dist/Ling Setup.exe`.

Texnologiyalar: Electron, React, TypeScript, Tailwind CSS, SQLite (`node:sqlite` + Drizzle).

---

## English

**Ling** is a personal Windows assistant: a clipboard history panel (**Nest**, opens from the bottom-left corner or `Ctrl + Shift + V`) and a **Chat** that uses *your own* AI subscription through the Claude Code CLI (`claude`) or the Antigravity CLI (`agy`) — no API keys. Chat can attach files, and create images, HTML and PDF. Everything is stored locally in `%APPDATA%\Ling`. The interface is in Uzbek.

Download `Ling Setup.exe` from [Releases](../../releases), install at least one of the CLIs above and sign in, then check **Sozlamalar (Settings) → AI ulanishlar**.

## Litsenziya

[MIT](LICENSE)
