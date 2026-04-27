import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, type UsuarioSesion, type Rol } from '../lib/supabase'

interface AuthContextType {
  usuario: UsuarioSesion | null
  cargando: boolean
  cerrarSesion: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  cargando: true,
  cerrarSesion: async () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [cargando, setCargando] = useState(true)

  // Resuelve el rol y nombre del usuario autenticado
  async function resolverUsuario(userId: string, email: string): Promise<UsuarioSesion | null> {
    // 1. Buscar en usuarios_internos (admin u operador)
    const { data: interno } = await supabase
      .from('usuarios_internos')
      .select('nombre, rol, estatus')
      .eq('user_id', userId)
      .single()

    if (interno && interno.estatus) {
      return { id: userId, email, nombre: interno.nombre, rol: interno.rol as Rol }
    }

    // 2. Buscar en pensionados
    const { data: pensionado } = await supabase
      .from('pensionados')
      .select('nombre_completo, estatus')
      .eq('user_id', userId)
      .single()

    if (pensionado && pensionado.estatus === 'activo') {
      return { id: userId, email, nombre: pensionado.nombre_completo, rol: 'pensionado' }
    }

    return null
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          const u = await resolverUsuario(session.user.id, session.user.email ?? '')
          setUsuario(u)
        }
      } catch (err) {
        console.error('Error resolviendo sesión inicial:', err)
        setUsuario(null)
      } finally {
        setCargando(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const u = await resolverUsuario(session.user.id, session.user.email ?? '')
          setUsuario(u)
        } else {
          setUsuario(null)
        }
      } catch (err) {
        console.error('Error en cambio de sesión:', err)
        setUsuario(null)
      } finally {
        setCargando(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cerrarSesion() {
    await supabase.auth.signOut()
    setUsuario(null)
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