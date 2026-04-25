import { useEffect, useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router'

const sidebarItems = [
  { label: 'Dashboard', icon: '📊' },
  { label: 'Usuarios', icon: '👥' },
  { label: 'Pensionados', icon: '👴' },
  { label: 'Configuración', icon: '⚙️' },
  { label: 'Bitácora', icon: '📋' },
]

interface UsuarioInterno {
  id: string
  user_id: string
  nombre: string
  correo: string
  rol: 'admin' | 'operador'
  estatus: boolean
  fecha_alta: string
}

const VACIO = { nombre: '', correo: '', password: '', rol: 'operador' as 'admin' | 'operador' }

export default function GestionUsuarios() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioInterno[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<UsuarioInterno | null>(null)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const navigate = useNavigate()

  useEffect(() => { cargarUsuarios() }, [])

  async function cargarUsuarios() {
    setCargando(true)
    const { data } = await supabase
      .from('usuarios_internos')
      .select('*')
      .order('fecha_alta', { ascending: false })
    setUsuarios(data ?? [])
    setCargando(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm(VACIO)
    setError('')
    setModalAbierto(true)
  }

  function abrirEditar(u: UsuarioInterno) {
    setEditando(u)
    setForm({ nombre: u.nombre, correo: u.correo, password: '', rol: u.rol })
    setError('')
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setEditando(null)
    setForm(VACIO)
    setError('')
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.correo.trim()) {
      setError('El nombre y el correo son obligatorios.')
      return
    }
    if (!editando && !form.password.trim()) {
      setError('La contraseña es obligatoria para nuevos usuarios.')
      return
    }
    if (!editando && form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setGuardando(true)
    setError('')

    if (editando) {
      // Solo actualizar datos en usuarios_internos
      const { error: err } = await supabase
        .from('usuarios_internos')
        .update({ nombre: form.nombre.trim(), rol: form.rol })
        .eq('id', editando.id)

      if (err) { setError('Error al actualizar: ' + err.message); setGuardando(false); return }

      await registrarBitacora('modificar_usuario', editando.id, `Modificó usuario: ${form.nombre}`)
    } else {
      const { error: fnErr } = await supabase.functions.invoke('crear-usuario', {
        body: {
          nombre: form.nombre.trim(),
          correo: form.correo.trim(),
          password: form.password,
          rol: form.rol,
        }
      })

      if (fnErr) {
        setError('Error al crear usuario: ' + fnErr.message)
        setGuardando(false)
        return
      }

      await registrarBitacora('alta_usuario', form.correo, `Alta de usuario: ${form.nombre} (${form.rol})`)
    }

    await cargarUsuarios()
    setGuardando(false)
    cerrarModal()
  }

  async function toggleEstatus(u: UsuarioInterno) {
    const nuevoEstatus = !u.estatus
    const { error: err } = await supabase
      .from('usuarios_internos')
      .update({ estatus: nuevoEstatus })
      .eq('id', u.id)

    if (err) { alert('Error al cambiar estatus: ' + err.message); return }

    await registrarBitacora(
      nuevoEstatus ? 'activar_usuario' : 'desactivar_usuario',
      u.id,
      `${nuevoEstatus ? 'Activó' : 'Desactivó'} usuario: ${u.nombre}`
    )
    cargarUsuarios()
  }

  async function registrarBitacora(accion: string, registroId: string, descripcion: string) {
    await supabase.rpc('registrar_bitacora', {
      p_accion: accion,
      p_tabla: 'usuarios_internos',
      p_registro_id: registroId,
      p_descripcion: descripcion,
    })
  }

  const filtrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.correo.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="h-screen flex flex-col">
      <Navbar roleColor="bg-purple-100 text-purple-800" />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activeIndex={1}
          onItemClick={(index) => {
            if (index === 0) navigate('/admin')
            if (index === 2) navigate('/admin/pensionados')
            if (index === 3) navigate('/admin/configuracion')
            if (index === 4) navigate('/admin/bitacora')
          }}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <h1>Gestión de Usuarios</h1>
            <button
              onClick={abrirNuevo}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              + Nuevo usuario
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full max-w-sm px-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {cargando ? (
              <div className="p-12 text-center text-muted-foreground">Cargando usuarios...</div>
            ) : filtrados.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No se encontraron usuarios.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm">Nombre</th>
                    <th className="px-6 py-4 text-left text-sm">Correo</th>
                    <th className="px-6 py-4 text-left text-sm">Rol</th>
                    <th className="px-6 py-4 text-left text-sm">Estatus</th>
                    <th className="px-6 py-4 text-left text-sm">Fecha alta</th>
                    <th className="px-6 py-4 text-left text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(u => (
                    <tr key={u.id} className="border-t border-border hover:bg-accent/50">
                      <td className="px-6 py-4 text-sm">{u.nombre}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{u.correo}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.rol === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                          }`}>
                          {u.rol === 'admin' ? 'Administrador' : 'Operador'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.estatus
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {u.estatus ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(u.fecha_alta).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-3">
                        <button
                          onClick={() => abrirEditar(u)}
                          className="text-primary hover:underline"
                        >
                          Editar
                        </button>
                        {/* No se puede desactivar a sí mismo */}
                        {u.user_id !== usuario?.id && (
                          <button
                            onClick={() => toggleEstatus(u)}
                            className={u.estatus ? 'text-destructive hover:underline' : 'text-green-600 hover:underline'}
                          >
                            {u.estatus ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Modal alta / edición */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="mb-6">{editando ? 'Editar usuario' : 'Nuevo usuario interno'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nombre completo"
                />
              </div>

              {!editando && (
                <div>
                  <label className="block text-sm mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={e => setForm({ ...form, correo: e.target.value })}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              )}

              {!editando && (
                <div>
                  <label className="block text-sm mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm mb-1">Rol</label>
                <select
                  value={form.rol}
                  onChange={e => setForm({ ...form, rol: e.target.value as 'admin' | 'operador' })}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="operador">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={cerrarModal}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}