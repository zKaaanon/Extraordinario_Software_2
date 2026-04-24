import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router'

interface NavbarProps {
  roleColor?: string
}

export default function Navbar({ roleColor = 'bg-blue-100 text-blue-800' }: NavbarProps) {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await cerrarSesion()
    navigate('/')
  }

  const rolLabel = usuario?.rol === 'admin'
    ? 'Administrador'
    : usuario?.rol === 'operador'
      ? 'Operador'
      : 'Pensionado'

  return (
    <nav className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏛️</span>
        <span>SistemaPensionados</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm">{usuario?.nombre}</span>
        <span className={`px-3 py-1 rounded-full text-sm ${roleColor}`}>
          {rolLabel}
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}