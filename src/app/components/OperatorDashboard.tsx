import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import StatsCard from './StatsCard'
import { supabase } from '../../lib/supabase'

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const sidebarItems = [
  { label: 'Pensionados',   icon: '👴' },
  { label: 'Validaciones',  icon: '✅' },
]

// ─── Tipos ───────────────────────────────────────────────────────────────────

type EstadoValidacion = 'vigente' | 'proxima_a_vencer' | 'vencida' | 'en_revision' | 'sin_fecha'

interface PensionadoFila {
  id: string
  nombre_completo: string
  curp: string
  numero_pensionado: string
  correo: string
  estado_validacion: EstadoValidacion
  fecha_proxima_validacion: string | null
  fecha_ultima_validacion: string | null
  estatus: string
}

const BADGE: Record<EstadoValidacion, { label: string; clase: string }> = {
  vigente:          { label: 'Vigente',           clase: 'bg-green-100 text-green-800' },
  proxima_a_vencer: { label: 'Próximo a vencer',  clase: 'bg-yellow-100 text-yellow-800' },
  vencida:          { label: 'Vencido',            clase: 'bg-red-100 text-red-800' },
  en_revision:      { label: 'En revisión',        clase: 'bg-blue-100 text-blue-800' },
  sin_fecha:        { label: 'Sin fecha',          clase: 'bg-gray-100 text-gray-600' },
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function OperatorDashboard() {
  const navigate = useNavigate()

  const [pensionados,   setPensionados]   = useState<PensionadoFila[]>([])
  const [cargando,      setCargando]      = useState(true)
  const [busqueda,      setBusqueda]      = useState('')
  const [filtroEstado,  setFiltroEstado]  = useState('todos')
  const [filtroFecha,   setFiltroFecha]   = useState('')   // ISO date string YYYY-MM-DD

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setCargando(true)
    const { data, error } = await supabase
      .from('v_pensionados_estado')
      .select('id, nombre_completo, curp, numero_pensionado, correo, estado_validacion, fecha_proxima_validacion, fecha_ultima_validacion, estatus')
      .eq('estatus', 'activo')
      .order('nombre_completo')

    if (error) { console.error(error); setCargando(false); return }
    setPensionados(data ?? [])
    setCargando(false)
  }

  // ── Contadores para tarjetas ──────────────────────────────────────────────

  const proximos  = pensionados.filter(p => p.estado_validacion === 'proxima_a_vencer').length
  const vencidos  = pensionados.filter(p => p.estado_validacion === 'vencida').length
  const revision  = pensionados.filter(p => p.estado_validacion === 'en_revision').length

  // ── Filtrado ──────────────────────────────────────────────────────────────

  const filtrados = pensionados.filter(p => {
    const q = busqueda.toLowerCase()
    const coincideBusqueda =
      p.nombre_completo.toLowerCase().includes(q) ||
      p.curp.toLowerCase().includes(q) ||
      p.numero_pensionado.toLowerCase().includes(q)

    const coincideEstado = filtroEstado === 'todos' || p.estado_validacion === filtroEstado

    const coincideFecha = !filtroFecha || (
      p.fecha_proxima_validacion
        ? p.fecha_proxima_validacion.startsWith(filtroFecha)
        : false
    )

    return coincideBusqueda && coincideEstado && coincideFecha
  })

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col">
      <Navbar roleColor="bg-blue-100 text-blue-800" />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activeIndex={0}
          onItemClick={i => {
            if (i === 0) navigate('/operador')
            if (i === 1) navigate('/operador/validaciones')
          }}
        />

        <main className="flex-1 overflow-y-auto p-8">

          <div className="flex items-center justify-between mb-8">
            <h1>Seguimiento de pensionados</h1>
            <button
              onClick={cargarDatos}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ↻ Actualizar
            </button>
          </div>

          {/* Tarjetas de resumen — solo las relevantes para el operador */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Próximos a vencer"
              value={proximos}
              icon="⚠️"
              bgColor="bg-yellow-100"
              textColor="text-yellow-600"
            />
            <StatsCard
              title="Vencidos"
              value={vencidos}
              icon="❌"
              bgColor="bg-red-100"
              textColor="text-red-600"
            />
            <StatsCard
              title="En revisión"
              value={revision}
              icon="🔍"
              bgColor="bg-blue-100"
              textColor="text-blue-600"
            />
          </div>

          {/* Filtros — RF-33 */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              type="text"
              placeholder="Buscar por nombre, CURP o número..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 min-w-56 px-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="px-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="todos">Todos los estados</option>
              <option value="proxima_a_vencer">Próximo a vencer</option>
              <option value="vencida">Vencido</option>
              <option value="en_revision">En revisión</option>
              <option value="vigente">Vigente</option>
            </select>
            {/* Filtro por fecha próxima validación — RF-33 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Próx. val.:</label>
              <input
                type="date"
                value={filtroFecha}
                onChange={e => setFiltroFecha(e.target.value)}
                className="px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {filtroFecha && (
                <button
                  onClick={() => setFiltroFecha('')}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {cargando ? (
              <div className="p-12 text-center text-muted-foreground">Cargando pensionados...</div>
            ) : filtrados.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                {busqueda || filtroEstado !== 'todos' || filtroFecha
                  ? 'No se encontraron resultados con ese filtro.'
                  : 'No hay pensionados activos registrados.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm">Nombre completo</th>
                      <th className="px-6 py-4 text-left text-sm">CURP</th>
                      <th className="px-6 py-4 text-left text-sm">Número</th>
                      <th className="px-6 py-4 text-left text-sm">Estado</th>
                      <th className="px-6 py-4 text-left text-sm">Próx. validación</th>
                      <th className="px-6 py-4 text-left text-sm">Última validación</th>
                      <th className="px-6 py-4 text-left text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(p => {
                      const badge = BADGE[p.estado_validacion] ?? BADGE.sin_fecha
                      return (
                        <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                          <td className="px-6 py-4 text-sm font-medium">{p.nombre_completo}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{p.curp}</td>
                          <td className="px-6 py-4 text-sm">{p.numero_pensionado}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.clase}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {p.fecha_proxima_validacion
                              ? new Date(p.fecha_proxima_validacion).toLocaleDateString('es-MX')
                              : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {p.fecha_ultima_validacion
                              ? new Date(p.fecha_ultima_validacion).toLocaleDateString('es-MX')
                              : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => navigate(`/operador/pensionados/${p.id}`)}
                              className="text-primary hover:underline"
                            >
                              Ver expediente
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!cargando && filtrados.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Mostrando {filtrados.length} de {pensionados.length} pensionados activos
            </p>
          )}
        </main>
      </div>
    </div>
  )
}