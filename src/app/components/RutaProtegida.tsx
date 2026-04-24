import { Navigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import type { Rol } from '../../lib/supabase'

interface RutaProtegidaProps {
  children: React.ReactNode
  rol: Rol
}

export default function RutaProtegida({ children, rol }: RutaProtegidaProps) {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4">🏛️</div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/" replace />
  }

  if (usuario.rol !== rol) {
    const destino = usuario.rol === 'admin'
      ? '/admin'
      : usuario.rol === 'operador'
        ? '/operador'
        : '/pensionado'
    return <Navigate to={destino} replace />
  }

  return <>{children}</>
}