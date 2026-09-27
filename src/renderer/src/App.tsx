import type { Ling } from '../../preload'
import Asosiy from './Asosiy'
import NestPanel from './NestPanel'
import Tugma from './Tugma'

declare global {
  interface Window {
    ling: Ling
  }
}

// Bitta bundle, ikkita oyna: manzil oxiridagi #nest Nest panelini ochadi
export default function App() {
  const yol = window.location.hash
  if (yol.includes('tugma')) return <Tugma />
  if (yol.includes('nest')) return <NestPanel />
  return <Asosiy />
}
