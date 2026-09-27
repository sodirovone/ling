import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

// Nest'ga tushgan har bir nusxa (matn yoki rasm)
export const nusxalar = sqliteTable('nusxalar', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tur: text('tur').notNull().default('matn'), // 'matn' | 'rasm' | 'video' | 'fayl'
  matn: text('matn').notNull(), // rasm uchun: qisqa tavsif; video/fayl uchun: fayl nomi
  fayl: text('fayl'), // rasm: rasmlar papkasidagi nomi; video/fayl: to'liq yo'li
  manba: text('manba').notNull().default('tizim'),
  vaqt: integer('vaqt').notNull(),
  ochirilgan: integer('ochirilgan').notNull().default(0), // 0 = faol, 1 = o'chirilgan
  ochirilganVaqt: integer('ochirilgan_vaqt')
})

// Qo'lda yoziladigan tezkor so'zlar: "karta" -> karta raqami
export const tezkorSozlar = sqliteTable('tezkor_sozlar', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nom: text('nom').notNull(),
  qiymat: text('qiymat').notNull(),
  maxfiy: integer('maxfiy').notNull().default(0), // 1 bo'lsa ekranda **** ko'rinadi
  vaqt: integer('vaqt').notNull()
})

// Dastur sozlamalari: kalit -> qiymat
export const sozlamalar = sqliteTable('sozlamalar', {
  kalit: text('kalit').primaryKey(),
  qiymat: text('qiymat').notNull()
})

export type Nusxa = typeof nusxalar.$inferSelect
export type TezkorSoz = typeof tezkorSozlar.$inferSelect

// Chat suhbatlari
export const suhbatlar = sqliteTable('suhbatlar', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nom: text('nom').notNull(),
  provayder: text('provayder').notNull(), // 'claude' | 'gemini'
  model: text('model').notNull(),
  kuch: text('kuch').notNull().default('medium'),
  vaqt: integer('vaqt').notNull()
})

// Suhbatdagi xabarlar
export const xabarlar = sqliteTable('xabarlar', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  suhbatId: integer('suhbat_id').notNull(),
  rol: text('rol').notNull(), // 'men' | 'ai'
  matn: text('matn').notNull(),
  provayder: text('provayder'),
  model: text('model'),
  xato: integer('xato').notNull().default(0),
  xatoTuri: text('xato_turi'), // 'topilmadi' | 'kirilmagan' | 'limit' | 'boshqa'
  vaqt: integer('vaqt').notNull()
})

// Xabarga biriktirilgan Nest elementlari
export const biriktirmalar = sqliteTable('biriktirmalar', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  xabarId: integer('xabar_id').notNull(),
  nusxaId: integer('nusxa_id').notNull()
})

export type Suhbat = typeof suhbatlar.$inferSelect
export type Xabar = typeof xabarlar.$inferSelect
