import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { supabase, limpiarStorageSesion, type UsuarioSesion, type Rol } from '../lib/supabase'

interface AuthContextType {
  usuario: UsuarioSesion | null
  cargando: boolean
  cerrarSesion: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  cargando: true,
  cerrarSesion: async () => {},
})


const STALE_TOKEN_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'invalid_grant',
])

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [cargando, setCargando] = useState(true)
  const sesionInicialResuelta = useRef(false)
  const montado = useRef(true)

  async function resolverUsuario(userId: string, email: string): Promise<UsuarioSesion | null> {
    const { data: interno } = await supabase
      .from('usuarios_internos')
      .select('nombre, rol, estatus')
      .eq('user_id', userId)
      .single()

    if (interno?.estatus) {
      return { id: userId, email, nombre: interno.nombre, rol: interno.rol as Rol }
    }

    const { data: pensionado } = await supabase
      .from('pensionados')
      .select('nombre_completo, estatus')
      .eq('user_id', userId)
      .single()

    if (pensionado?.estatus === 'activo') {
      return { id: userId, email, nombre: pensionado.nombre_completo, rol: 'pensionado' }
    }

    return null
  }

  function esTokenCaducado(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const code = (error as Record<string, unknown>).code
    const message = String((error as Record<string, unknown>).message ?? '')
    return (
      (typeof code === 'string' && STALE_TOKEN_CODES.has(code)) ||
      message.toLowerCase().includes('refresh token')
    )
  }

  useEffect(() => {
    montado.current = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!sesionInicialResuelta.current) return

        if (event === 'SIGNED_OUT') {
          if (montado.current) setUsuario(null)
          return
        }
        if (event === 'INITIAL_SESSION') return

        if (session?.user) {
          try {
            const u = await resolverUsuario(session.user.id, session.user.email ?? '')
            if (montado.current) setUsuario(u)
          } catch (err) {
            console.error('Error resolviendo sesión (listener):', err)
            if (montado.current) setUsuario(null)
          }
        } else {
          if (montado.current) setUsuario(null)
        }
      }
    )

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      try {
        if (error) {
          if (esTokenCaducado(error)) {
            console.warn('Refresh token inválido — limpiando sesión local.')
            await limpiarStorageSesion()
          } else {
            console.error('Error obteniendo sesión inicial:', error)
          }
          if (montado.current) setUsuario(null)
          return
        }

        if (session?.user) {
          const u = await resolverUsuario(session.user.id, session.user.email ?? '')
          if (montado.current) setUsuario(u)
        } else {
          if (montado.current) setUsuario(null)
        }
      } catch (err) {
        if (esTokenCaducado(err)) {
          console.warn('Refresh token inválido (excepción) — limpiando sesión local.')
          await limpiarStorageSesion()
        } else {
          console.error('Error resolviendo sesión inicial:', err)
        }
        if (montado.current) setUsuario(null)
      } finally {
        sesionInicialResuelta.current = true
        if (montado.current) setCargando(false)
      }
    })

    return () => {
      montado.current = false
      subscription.unsubscribe()
    }
  }, [])

  async function cerrarSesion() {
    setUsuario(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}