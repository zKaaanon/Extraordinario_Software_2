import { useEffect, useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import StatsCard from './StatsCard'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router'

const sidebarItems = [
  { label: 'Dashboard', icon: '📊' },
  { label: 'Usuarios', icon: '👥' },
  { label: 'Pensionados', icon: '👴' },
  { label: 'Configuración', icon: '⚙️' },
  { label: 'Bitácora', icon: '📋' },
]

type EstadoValidacion = 'vigente' | 'proxima_a_vencer' | 'vencida' | 'en_revision' | 'sin_fecha'

interface PensionadoFila {
  id: string
  nombre_completo: string
  curp: string
  numero_pensionado: string
  estado_validacion: EstadoValidacion
  fecha_proxima_validacion: string | null
}

interface Contadores {
  total: number
  vigentes: number
  proximos: number
  vencidos: number
  en_revision: number
}

const BADGE: Record<EstadoValidacion, { label: string; clase: string }> = {
  vigente: { label: 'Vigente', clase: 'bg-green-100 text-green-800' },
  proxima_a_vencer: { label: 'Próximo a vencer', clase: 'bg-yellow-100 text-yellow-800' },
  vencida: { label: 'Vencido', clase: 'bg-red-100 text-red-800' },
  en_revision: { label: 'En revisión', clase: 'bg-blue-100 text-blue-800' },
  sin_fecha: { label: 'Sin fecha', clase: 'bg-gray-100 text-gray-600' },
}

export default function AdminDashboard() {
  const [pensionados, setPensionados] = useState<PensionadoFila[]>([])
  const [contadores, setContadores] = useState<Contadores>({ total: 0, vigentes: 0, proximos: 0, vencidos: 0, en_revision: 0 })
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const navigate = useNavigate()

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)

    const { data, error } = await supabase
      .from('v_pensionados_estado')
      .select('id, nombre_completo, curp, numero_pensionado, estado_validacion, fecha_proxima_validacion, estatus')
      .eq('estatus', 'activo')
      .order('nombre_completo')

    if (error) {
      console.error('Error cargando pensionados:', error)
      setCargando(false)
      return
    }

    const filas: PensionadoFila[] = data ?? []
    setPensionados(filas)

    setContadores({
      total: filas.length,
      vigentes: filas.filter(p => p.estado_validacion === 'vigente').length,
      proximos: filas.filter(p => p.estado_validacion === 'proxima_a_vencer').length,
      vencidos: filas.filter(p => p.estado_validacion === 'vencida').length,
      en_revision: filas.filter(p => p.estado_validacion === 'en_revision').length,
    })

    setCargando(false)
  }

  const filtrados = pensionados.filter(p => {
    const coincideBusqueda =
      p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.curp.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.numero_pensionado.toLowerCase().includes(busqueda.toLowerCase())

    const coincideEstado =
      filtroEstado === 'todos' || p.estado_validacion === filtroEstado

    return coincideBusqueda && coincideEstado
  })

  return (
    <div className="h-screen flex flex-col">
      <Navbar roleColor="bg-purple-100 text-purple-800" />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activeIndex={0}
          onItemClick={(i) => {
            if (i === 0) navigate('/admin')
            if (i === 1) navigate('/admin/usuarios')
            if (i === 2) navigate('/admin/pensionados')
            if (i === 3) navigate('/admin/configuracion')
            if (i === 4) navigate('/admin/bitacora')
          }}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <h1>Dashboard</h1>
            <button
              onClick={cargarDatos}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ↻ Actualizar
            </button>
          </div>

          {/* Tarjetas de conteo */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <StatsCard title="Total pensionados" value={contadores.total} icon="👥" bgColor="bg-blue-100" textColor="text-blue-600" />
            <StatsCard title="Vigentes" value={contadores.vigentes} icon="✅" bgColor="bg-green-100" textColor="text-green-600" />
            <StatsCard title="Próximos a vencer" value={contadores.proximos} icon="⚠️" bgColor="bg-yellow-100" textColor="text-yellow-600" />
            <StatsCard title="Vencidos" value={contadores.vencidos} icon="❌" bgColor="bg-red-100" textColor="text-red-600" />
          </div>

          {/* Barra de búsqueda y filtro */}
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Buscar por nombre, CURP o número de pensionado..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 px-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="px-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="todos">Todos los estados</option>
              <option value="vigente">Vigente</option>
              <option value="proxima_a_vencer">Próximo a vencer</option>
              <option value="en_revision">En revisión</option>
              <option value="vencida">Vencido</option>
            </select>
          </div>

          {/* Tabla */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {cargando ? (
              <div className="p-12 text-center text-muted-foreground">Cargando pensionados...</div>
            ) : filtrados.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                {busqueda || filtroEstado !== 'todos'
                  ? 'No se encontraron resultados con ese filtro.'
                  : 'Aún no hay pensionados registrados.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm">Nombre completo</th>
                      <th className="px-6 py-4 text-left text-sm">CURP</th>
                      <th className="px-6 py-4 text-left text-sm">Número pensionado</th>
                      <th className="px-6 py-4 text-left text-sm">Estado</th>
                      <th className="px-6 py-4 text-left text-sm">Próx. validación</th>
                      <th className="px-6 py-4 text-left text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(p => {
                      const badge = BADGE[p.estado_validacion] ?? BADGE.sin_fecha
                      const fecha = p.fecha_proxima_validacion
                        ? new Date(p.fecha_proxima_validacion).toLocaleDateString('es-MX')
                        : '—'
                      return (
                        <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                          <td className="px-6 py-4 text-sm">{p.nombre_completo}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{p.curp}</td>
                          <td className="px-6 py-4 text-sm">{p.numero_pensionado}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.clase}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">{fecha}</td>
                          <td className="px-6 py-4 text-sm">
                            <button className="text-primary hover:underline">Ver expediente</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pie de tabla */}
          {!cargando && filtrados.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Mostrando {filtrados.length} de {pensionados.length} pensionados
            </p>
          )}
        </main>
      </div>
    </div>
  )
}