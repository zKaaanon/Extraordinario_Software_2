import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    // 1. Autenticar con Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !data.user) {
      setError('Correo o contraseña incorrectos')
      setCargando(false)
      return
    }

    const userId = data.user.id

    // 2. Verificar si es usuario interno (admin u operador)
    const { data: interno } = await supabase
      .from('usuarios_internos')
      .select('rol, estatus')
      .eq('user_id', userId)
      .single()

    if (interno) {
      if (!interno.estatus) {
        await supabase.auth.signOut()
        setError('Tu cuenta está desactivada. Contacta al administrador.')
        setCargando(false)
        return
      }
      navigate(interno.rol === 'admin' ? '/admin' : '/operador')
      return
    }

    // 3. Verificar si es pensionado
    const { data: pensionado } = await supabase
      .from('pensionados')
      .select('estatus')
      .eq('user_id', userId)
      .single()

    if (pensionado) {
      if (pensionado.estatus !== 'activo') {
        await supabase.auth.signOut()
        setError('Tu cuenta está inactiva. Contacta al administrador.')
        setCargando(false)
        return
      }
      navigate('/pensionado')
      return
    }

    // Si existe en auth pero no en ninguna tabla
    await supabase.auth.signOut()
    setError('No se encontró un perfil asociado a esta cuenta.')
    setCargando(false)
  }

  return (
    <div className="h-screen w-full flex">
      {/* Panel izquierdo */}
      <div className="w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
        <div className="text-white text-center px-12">
          <div className="text-7xl mb-6">🏛️</div>
          <h2 className="text-white text-3xl font-semibold mb-3">Sistema de Pensionados</h2>
          <p className="text-blue-200 text-lg">Validación de supervivencia</p>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="w-1/2 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="mb-2">SistemaPensionados</h1>
            <p className="text-muted-foreground">Accede a tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="correo@ejemplo.com"
                required
                disabled={cargando}
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                  placeholder="••••••••"
                  required
                  disabled={cargando}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cargando ? 'Verificando...' : 'Iniciar sesión'}
            </button>

            {error && (
              <p className="text-destructive text-center text-sm">{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}