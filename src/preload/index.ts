import { contextBridge, ipcRenderer, webUtils } from 'electron'

export type Nusxa = {
  id: number
  tur: 'matn' | 'rasm' | 'video' | 'fayl'
  matn: string
  fayl: string | null
  manba: string
  vaqt: number
  ochirilgan: number
  ochirilganVaqt: number | null
}

export type TezkorSoz = {
  id: number
  nom: string
  qiymat: string
  maxfiy: number
  vaqt: number
}

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

export type Suhbat = {
  id: number
  nom: string
  provayder: Provayder
  model: string
  kuch: Kuch
  vaqt: number
}

export type Xabar = {
  id: number
  suhbatId: number
  rol: 'men' | 'ai'
  matn: string
  provayder: string | null
  model: string | null
  xato: number
  xatoTuri: 'topilmadi' | 'kirilmagan' | 'limit' | 'boshqa' | null
  vaqt: number
  // Xabarga biriktirilgan yoki AI yaratgan rasm/fayllar
  fayllar?: Nusxa[]
}

export type Sorov = {
  qidiruv?: string
  tur?: 'matn' | 'rasm' | 'video' | 'fayl'
  oldin?: { vaqt: number; id: number }
  chegara?: number
}

export type Sozlamalar = {
  nestTugmasi: string
  burchak: boolean
  avto: boolean
  avtoMumkin: boolean
  muddat: number
  musiqaPapka: string | null
}

export type CliHolat = {
  id: 'claude' | 'gemini'
  nom: string
  topildi: boolean
  versiya: string | null
  yol: string | null
}

export type Statistika = { nusxa: number; tezkor: number; suhbat: number; hajm: number }

export type Trek = { yol: string; nomi: string }

export type MusiqaPapka = { papka: string | null; treklar: Trek[] }

export type TashqiHolat = {
  bor: boolean
  nom: string
  ijrochi: string
  ilova: string
  holat: string
  pauzaMumkin: boolean
  keyingiMumkin: boolean
  oldingiMumkin: boolean
  xato?: string
}

const ling = {
  // Nusxalar
  royxat: (sorov: Sorov = {}): Promise<Nusxa[]> => ipcRenderer.invoke('nusxalar:royxat', sorov),
  nusxala: (id: number): Promise<boolean> => ipcRenderer.invoke('nusxalar:nusxala', id),
  ochirish: (id: number): Promise<boolean> => ipcRenderer.invoke('nusxalar:ochirish', id),

  // O'chirilganlar
  ochirilganRoyxat: (): Promise<Nusxa[]> => ipcRenderer.invoke('ochirilgan:royxat'),
  tiklash: (id: number): Promise<boolean> => ipcRenderer.invoke('ochirilgan:tiklash', id),
  butunlayOchirish: (id: number): Promise<boolean> => ipcRenderer.invoke('ochirilgan:butunlay', id),
  ochirilganMuddat: (): Promise<number> => ipcRenderer.invoke('ochirilgan:muddat'),

  // Tezkor so'zlar
  tezkorRoyxat: (qidiruv = ''): Promise<TezkorSoz[]> =>
    ipcRenderer.invoke('tezkor:royxat', qidiruv),
  tezkorQoshish: (nom: string, qiymat: string, maxfiy: boolean): Promise<TezkorSoz | null> =>
    ipcRenderer.invoke('tezkor:qoshish', nom, qiymat, maxfiy),
  tezkorOchirish: (id: number): Promise<boolean> => ipcRenderer.invoke('tezkor:ochirish', id),
  tezkorNusxala: (id: number): Promise<boolean> => ipcRenderer.invoke('tezkor:nusxala', id),

  // Chat
  chatSuhbatlar: (): Promise<Suhbat[]> => ipcRenderer.invoke('chat:suhbatlar'),
  chatModellar: (provayder: Provayder): Promise<Model[]> =>
    ipcRenderer.invoke('chat:modellar', provayder),
  chatYangi: (provayder: Provayder, model: string, kuch: Kuch): Promise<Suhbat> =>
    ipcRenderer.invoke('chat:yangi', provayder, model, kuch),
  chatXabarlar: (suhbatId: number): Promise<Xabar[]> =>
    ipcRenderer.invoke('chat:xabarlar', suhbatId),
  chatSuhbatOchirish: (suhbatId: number): Promise<boolean> =>
    ipcRenderer.invoke('chat:suhbatOchirish', suhbatId),
  chatSozla: (
    suhbatId: number,
    provayder: Provayder,
    model: string,
    kuch: Kuch
  ): Promise<boolean> => ipcRenderer.invoke('chat:sozla', suhbatId, provayder, model, kuch),
  chatYubor: (
    suhbatId: number,
    matn: string,
    biriktirmaIdlar: number[] = []
  ): Promise<{ matn: string; xato: boolean }> =>
    ipcRenderer.invoke('chat:yubor', suhbatId, matn, biriktirmaIdlar),
  // Kompyuterdan biriktirish: oyna orqali tanlash yoki sudrab tashlash
  chatKompyuterdan: (): Promise<Nusxa[]> => ipcRenderer.invoke('chat:kompyuterdan'),
  chatFayllardan: (fayllar: File[]): Promise<Nusxa[]> =>
    ipcRenderer.invoke(
      'chat:yollardan',
      fayllar.map((f) => webUtils.getPathForFile(f)).filter(Boolean)
    ),
  chatQirq: (suhbatId: number, xabarId: number): Promise<boolean> =>
    ipcRenderer.invoke('chat:qirq', suhbatId, xabarId),
  chatNusxala: (matn: string): Promise<boolean> => ipcRenderer.invoke('chat:nusxala', matn),
  faylOch: (id: number): Promise<boolean> => ipcRenderer.invoke('fayl:och', id),
  faylPapkada: (id: number): Promise<boolean> => ipcRenderer.invoke('fayl:papkada', id),
  chatBolakKelganda: (ishla: (malumot: { suhbatId: number; bolak: string }) => void) => {
    const tinglovchi = (_h: unknown, malumot: { suhbatId: number; bolak: string }): void =>
      ishla(malumot)
    ipcRenderer.on('chat:bolak', tinglovchi)
    return () => {
      ipcRenderer.removeListener('chat:bolak', tinglovchi)
    }
  },

  // Pleyer
  pleyerPapka: (): Promise<MusiqaPapka> => ipcRenderer.invoke('pleyer:papka'),
  pleyerPapkaTanla: (): Promise<MusiqaPapka | null> => ipcRenderer.invoke('pleyer:papkaTanla'),
  tashqiHolat: (): Promise<TashqiHolat> => ipcRenderer.invoke('pleyer:tashqi'),
  tashqiBuyruq: (buyruq: 'almashtir' | 'keyingi' | 'oldingi'): Promise<boolean> =>
    ipcRenderer.invoke('pleyer:tashqiBuyruq', buyruq),
  tashqiOzgarganda: (ishla: (holat: TashqiHolat) => void) => {
    const tinglovchi = (_h: unknown, holat: TashqiHolat): void => ishla(holat)
    ipcRenderer.on('pleyer:tashqi', tinglovchi)
    return () => {
      ipcRenderer.removeListener('pleyer:tashqi', tinglovchi)
    }
  },

  // Sozlamalar
  sozlamalar: (): Promise<Sozlamalar> => ipcRenderer.invoke('sozlamalar:ol'),
  tugmaYozuvi: (): Promise<string> => ipcRenderer.invoke('sozlamalar:tugmaYozuvi'),
  tugmaOzgardi: (ishla: (yozuv: string) => void) => {
    const tinglovchi = (_h: unknown, yozuv: string): void => ishla(yozuv)
    ipcRenderer.on('sozlamalar:tugmaOzgardi', tinglovchi)
    return () => {
      ipcRenderer.removeListener('sozlamalar:tugmaOzgardi', tinglovchi)
    }
  },
  nestTugmasiniSaqla: (tugma: string): Promise<{ boldi: boolean; tugma: string }> =>
    ipcRenderer.invoke('sozlamalar:tugma', tugma),
  burchakniSaqla: (yoq: boolean): Promise<boolean> => ipcRenderer.invoke('sozlamalar:burchak', yoq),
  avtoniSaqla: (yoq: boolean): Promise<boolean> => ipcRenderer.invoke('sozlamalar:avto', yoq),
  muddatniSaqla: (kun: number): Promise<boolean> => ipcRenderer.invoke('sozlamalar:muddat', kun),
  clilar: (): Promise<CliHolat[]> => ipcRenderer.invoke('sozlamalar:clilar'),
  statistika: (): Promise<Statistika> => ipcRenderer.invoke('sozlamalar:statistika'),
  zaxiraOl: (): Promise<string | null> => ipcRenderer.invoke('sozlamalar:zaxira'),

  // Nest paneli
  nestAlmashtir: (): Promise<boolean> => ipcRenderer.invoke('nest:almashtir'),
  nestYashir: (): Promise<boolean> => ipcRenderer.invoke('nest:yashir'),
  asosiyniOchish: (): Promise<boolean> => ipcRenderer.invoke('nest:asosiyni-ochish'),

  // Panel yopilishidan oldin — chiqish animatsiyasi uchun
  nestYopilganda: (ishla: () => void) => {
    const tinglovchi = (): void => ishla()
    ipcRenderer.on('nest:yopilmoqda', tinglovchi)
    return () => {
      ipcRenderer.removeListener('nest:yopilmoqda', tinglovchi)
    }
  },

  // Burchakdagi tugma qayta ko'rsatilganda — yumshoq paydo bo'lishi uchun
  tugmaKorsatilganda: (ishla: () => void) => {
    const tinglovchi = (): void => ishla()
    ipcRenderer.on('tugma:korsatildi', tinglovchi)
    return () => {
      ipcRenderer.removeListener('tugma:korsatildi', tinglovchi)
    }
  },

  nestKorsatilganda: (ishla: () => void) => {
    const tinglovchi = (): void => ishla()
    ipcRenderer.on('nest:korsatildi', tinglovchi)
    return () => {
      ipcRenderer.removeListener('nest:korsatildi', tinglovchi)
    }
  },

  yangilanganda: (ishla: () => void) => {
    const tinglovchi = (): void => ishla()
    ipcRenderer.on('nusxalar:yangilandi', tinglovchi)
    return () => {
      ipcRenderer.removeListener('nusxalar:yangilandi', tinglovchi)
    }
  }
}

contextBridge.exposeInMainWorld('ling', ling)

export type Ling = typeof ling
