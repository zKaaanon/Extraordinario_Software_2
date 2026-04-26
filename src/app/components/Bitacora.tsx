import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { supabase } from '../../lib/supabase'

const sidebarItems = [
  { label: 'Dashboard',     icon: '📊' },
  { label: 'Usuarios',      icon: '👥' },
  { label: 'Pensionados',   icon: '👴' },
  { label: 'Configuración', icon: '⚙️' },
  { label: 'Bitácora',      icon: '📋' },
]

interface EntradaBitacora {
  id: string
  usuario_nombre: string | null
  accion: string
  tabla_afectada: string | null
  descripcion: string | null
  fecha_hora: string
}

const ACCION_LABEL: Record<string, { label: string; clase: string }> = {
  alta_usuario:           { label: 'Alta usuario',       clase: 'bg-blue-100 text-blue-800' },
  modificar_usuario:      { label: 'Editar usuario',     clase: 'bg-yellow-100 text-yellow-800' },
  activar_usuario:        { label: 'Activar usuario',    clase: 'bg-green-100 text-green-800' },
  desactivar_usuario:     { label: 'Desactivar usuario', clase: 'bg-red-100 text-red-800' },
  alta_pensionado:        { label: 'Alta pensionado',    clase: 'bg-blue-100 text-blue-800' },
  modificar_pensionado:   { label: 'Editar pensionado',  clase: 'bg-yellow-100 text-yellow-800' },
  activar_pensionado:     { label: 'Activar pensionado', clase: 'bg-green-100 text-green-800' },
  desactivar_pensionado:  { label: 'Dar de baja',        clase: 'bg-red-100 text-red-800' },
  modificar_configuracion:{ label: 'Config. sistema',    clase: 'bg-purple-100 text-purple-800' },
}

export default function Bitacora() {
  const navigate = useNavigate()
  const [entradas, setEntradas]   = useState<EntradaBitacora[]>([])
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroAccion, setFiltroAccion] = useState('todas')

  useEffect(() => { cargarBitacora() }, [])

  async function cargarBitacora() {
    setCargando(true)
    const { data, error } = await supabase
      .from('bitacora')
      .select('*')
      .order('fecha_hora', { ascending: false })
      .limit(500)

    if (error) { console.error(error); setCargando(false); return }
    setEntradas(data ?? [])
    setCargando(false)
  }

  const accionesUnicas = [...new Set(entradas.map(e => e.accion))]

  const filtradas = entradas.filter(e => {
    const coincideBusqueda =
      (e.usuario_nombre ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.descripcion    ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      e.accion.toLowerCase().includes(busqueda.toLowerCase())

    const coincideAccion = filtroAccion === 'todas' || e.accion === filtroAccion

    return coincideBusqueda && coincideAccion
  })

  return (
    <div className="h-screen flex flex-col">
      <Navbar roleColor="bg-purple-100 text-purple-800" />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activeIndex={4}
          onItemClick={i => {
            if (i === 0) navigate('/admin')
            if (i === 1) navigate('/admin/usuarios')
            if (i === 2) navigate('/admin/pensionados')
            if (i === 3) navigate('/admin/configuracion')
            if (i === 4) navigate('/admin/bitacora')
          }}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <h1>Bitácora de acciones</h1>
            <button
              onClick={cargarBitacora}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ↻ Actualizar
            </button>
          </div>

          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              type="text"
              placeholder="Buscar por usuario, acción o descripción..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 min-w-48 px-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={filtroAccion}
              onChange={e => setFiltroAccion(e.target.value)}
              className="px-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="todas">Todas las acciones</option>
              {accionesUnicas.map(a => (
                <option key={a} value={a}>{ACCION_LABEL[a]?.label ?? a}</option>
              ))}
            </select>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {cargando ? (
              <div className="p-12 text-center text-muted-foreground">Cargando bitácora...</div>
            ) : filtradas.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No hay registros.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm">Fecha y hora</th>
                      <th className="px-6 py-4 text-left text-sm">Usuario</th>
                      <th className="px-6 py-4 text-left text-sm">Acción</th>
                      <th className="px-6 py-4 text-left text-sm">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map(e => {
                      const badge = ACCION_LABEL[e.accion]
                      return (
                        <tr key={e.id} className="border-t border-border hover:bg-accent/50">
                          <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(e.fecha_hora).toLocaleString('es-MX')}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {e.usuario_nombre ?? '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              badge?.clase ?? 'bg-gray-100 text-gray-600'
                            }`}>
                              {badge?.label ?? e.accion}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {e.descripcion ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!cargando && filtradas.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Mostrando {filtradas.length} de {entradas.length} registros
            </p>
          )}
        </main>
      </div>
    </div>
  )
}