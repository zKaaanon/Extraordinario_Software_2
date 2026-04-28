import { createClient } from '@supabase/supabase-js'

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Tipos útiles para toda la app
export type Rol = 'admin' | 'operador' | 'pensionado'

export interface UsuarioSesion {
  id: string
  email: string
  nombre: string
  rol: Rol
}

export async function limpiarStorageSesion(): Promise<void> {
  try {
    const keysToRemove = Object.keys(localStorage).filter((k) =>
      k.startsWith('sb-') && k.endsWith('-auth-token')
    )
    keysToRemove.forEach((k) => localStorage.removeItem(k))

    await supabase.auth.signOut({ scope: 'local' })
  } catch {
  }
}