import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { CheckCircle, XCircle, Eye, FileText, RefreshCw, ExternalLink } from 'lucide-react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const sidebarItems = [
  { label: 'Dashboard', icon: '📊' },
  { label: 'Usuarios', icon: '👥' },
  { label: 'Validaciones', icon: '✅' },
  { label: 'Pensionados', icon: '👴' },
  { label: 'Configuración', icon: '⚙️' },
  { label: 'Bitácora', icon: '📋' },
]

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ValidacionPendiente {
  id: string
  pensionado_id: string
  fecha_validacion: string
  resultado: string
  observaciones: string | null
  evidencia_url: string | null   // ruta relativa dentro del bucket
  // JOIN con pensionados
  nombre_completo: string
  numero_pensionado: string
  curp: string
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ValidacionesPendientes() {
  const navigate  = useNavigate()
  const { usuario } = useAuth()

  const [validaciones, setValidaciones] = useState<ValidacionPendiente[]>([])
  const [cargando, setCargando]         = useState(true)
  const [seleccionada, setSeleccionada] = useState<ValidacionPendiente | null>(null)
  const [urlEvidencia, setUrlEvidencia] = useState<string | null>(null)

  // Estado del modal de revisión
  const [accion, setAccion]           = useState<'aprobar' | 'rechazar' | null>(null)
  const [nota, setNota]               = useState('')
  const [procesando, setProcesando]   = useState(false)
  const [errorModal, setErrorModal]   = useState('')

  useEffect(() => { cargarPendientes() }, [])

  // ── Carga ──────────────────────────────────────────────────────────────────

  async function cargarPendientes() {
    setCargando(true)

    // Supabase no soporta JOIN directo en el cliente, usamos dos queries
    const { data: vals, error } = await supabase
      .from('validaciones')
      .select(`
        id, pensionado_id, fecha_validacion, resultado,
        observaciones, evidencia_url,
        pensionados!inner(nombre_completo, numero_pensionado, curp)
      `)
      .eq('resultado', 'en_revision')
      .order('fecha_validacion', { ascending: true })

    if (error) {
      console.error('Error cargando validaciones:', error)
      setCargando(false)
      return
    }

    // Aplanar el join
    const filas: ValidacionPendiente[] = (vals ?? []).map((v: any) => ({
      id:                v.id,
      pensionado_id:     v.pensionado_id,
      fecha_validacion:  v.fecha_validacion,
      resultado:         v.resultado,
      observaciones:     v.observaciones,
      evidencia_url:     v.evidencia_url,
      nombre_completo:   v.pensionados.nombre_completo,
      numero_pensionado: v.pensionados.numero_pensionado,
      curp:              v.pensionados.curp,
    }))

    setValidaciones(filas)
    setCargando(false)
  }

  // ── Abrir modal de revisión ────────────────────────────────────────────────

  async function abrirRevision(val: ValidacionPendiente) {
    setSeleccionada(val)
    setAccion(null)
    setNota('')
    setErrorModal('')
    setUrlEvidencia(null)

    if (val.evidencia_url) {
      // Generar signed URL válida 1 hora para el bucket "validaciones"
      const { data } = await supabase.storage
        .from('validaciones')
        .createSignedUrl(val.evidencia_url, 3600)
      setUrlEvidencia(data?.signedUrl ?? null)
    }
  }

  function cerrarModal() {
    setSeleccionada(null)
    setUrlEvidencia(null)
    setAccion(null)
    setNota('')
    setErrorModal('')
  }

  // ── Confirmar resolución ───────────────────────────────────────────────────

  async function confirmarResolucion() {
    if (!seleccionada || !accion || !usuario) return
    setProcesando(true)
    setErrorModal('')

    const nuevoResultado = accion === 'aprobar' ? 'exitosa' : 'rechazada'

    // Construir observaciones finales: conservar las del pensionado + añadir nota del revisor
    const obsBase = seleccionada.observaciones
      ? seleccionada.observaciones.replace(/\[Revisor:.*?\]/gs, '').trim()
      : ''
    const obsRevisor = nota.trim()
      ? `[Revisor: ${nota.trim()}]`
      : ''
    const obsFinales = [obsBase, obsRevisor].filter(Boolean).join(' ') || null

    const { error } = await supabase
      .from('validaciones')
      .update({
        resultado:       nuevoResultado,
        observaciones:   obsFinales,
        usuario_revisor: usuario.id,
        fecha_revision:  new Date().toISOString(),
      })
      .eq('id', seleccionada.id)

    if (error) {
      setErrorModal('Error al guardar: ' + error.message)
      setProcesando(false)
      return
    }

    // Bitácora
    await supabase.rpc('registrar_bitacora', {
      p_accion:      nuevoResultado === 'exitosa' ? 'aprobar_validacion' : 'rechazar_validacion',
      p_tabla:       'validaciones',
      p_registro_id: seleccionada.id,
      p_descripcion: `${nuevoResultado === 'exitosa' ? 'Aprobó' : 'Rechazó'} validación de: ${seleccionada.nombre_completo}`,
    })

    cerrarModal()
    await cargarPendientes()
    setProcesando(false)
  }

  // ── Helpers de formato ─────────────────────────────────────────────────────

  function formatearFecha(fecha: string) {
    return new Date(fecha).toLocaleString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function diasTranscurridos(fecha: string): string {
    const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
    if (dias === 0) return 'Hoy'
    if (dias === 1) return 'Hace 1 día'
    return `Hace ${dias} días`
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col">
      <Navbar roleColor="bg-purple-100 text-purple-800" />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activeIndex={2}
          onItemClick={i => {
            if (i === 0) navigate('/admin')
            if (i === 1) navigate('/admin/usuarios')
            if (i === 2) navigate('/admin/validaciones')
            if (i === 3) navigate('/admin/pensionados')
            if (i === 4) navigate('/admin/configuracion')
            if (i === 5) navigate('/admin/bitacora')
          }}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1>Validaciones pendientes</h1>
              {!cargando && (
                <p className="text-sm text-muted-foreground mt-1">
                  {validaciones.length === 0
                    ? 'No hay validaciones en espera de revisión'
                    : `${validaciones.length} validación${validaciones.length !== 1 ? 'es' : ''} esperando revisión`
                  }
                </p>
              )}
            </div>
            <button
              onClick={cargarPendientes}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw size={14} />
              Actualizar
            </button>
          </div>

          {cargando ? (
            <div className="p-12 text-center text-muted-foreground">
              Cargando validaciones...
            </div>
          ) : validaciones.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-16 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
              <h2 className="mb-2">Todo al día</h2>
              <p className="text-muted-foreground text-sm">
                No hay validaciones pendientes de revisión en este momento.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm">Pensionado</th>
                      <th className="px-6 py-4 text-left text-sm">Fecha de envío</th>
                      <th className="px-6 py-4 text-left text-sm">Observaciones</th>
                      <th className="px-6 py-4 text-left text-sm">Evidencia</th>
                      <th className="px-6 py-4 text-left text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validaciones.map(v => (
                      <tr key={v.id} className="border-t border-border hover:bg-accent/50">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium">{v.nombre_completo}</p>
                          <p className="text-xs text-muted-foreground font-mono">{v.numero_pensionado}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm">{formatearFecha(v.fecha_validacion)}</p>
                          <p className="text-xs text-yellow-600 font-medium">
                            {diasTranscurridos(v.fecha_validacion)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs">
                          {v.observaciones
                            ? v.observaciones.replace(/\[Sistema:.*?\]|\[Revisor:.*?\]/g, '').trim() || '—'
                            : '—'
                          }
                        </td>
                        <td className="px-6 py-4">
                          {v.evidencia_url ? (
                            <span className="flex items-center gap-1.5 text-xs text-blue-600">
                              <FileText size={14} />
                              Adjunta
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin evidencia</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => abrirRevision(v)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs hover:opacity-90 transition-opacity"
                            >
                              <Eye size={12} />
                              Revisar
                            </button>
                            <button
                              onClick={() => navigate(`/admin/pensionados/${v.pensionado_id}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-accent transition-colors"
                            >
                              Expediente
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Modal de revisión ── */}
      {seleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">

            {/* Cabecera */}
            <div className="px-6 py-5 border-b border-border">
              <h2 className="mb-1">Revisión de validación</h2>
              <p className="text-sm text-muted-foreground">{seleccionada.nombre_completo}</p>
              <p className="text-xs text-muted-foreground font-mono">{seleccionada.numero_pensionado} · {seleccionada.curp}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Datos del trámite */}
              <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enviado el</span>
                  <span>{formatearFecha(seleccionada.fecha_validacion)}</span>
                </div>
                {seleccionada.observaciones && (
                  <div className="pt-2 border-t border-border mt-2">
                    <p className="text-muted-foreground mb-1">Observaciones del pensionado</p>
                    <p className="text-foreground">
                      {seleccionada.observaciones
                        .replace(/\[Sistema:.*?\]|\[Revisor:.*?\]/g, '')
                        .trim() || '—'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Evidencia */}
              <div>
                <p className="text-sm font-medium mb-2">Evidencia adjunta</p>
                {seleccionada.evidencia_url ? (
                  urlEvidencia ? (
                    <div className="space-y-2">
                      {/* Si es imagen, mostrar inline */}
                      {/\.(jpg|jpeg|png)$/i.test(seleccionada.evidencia_url) ? (
                        <img
                          src={urlEvidencia}
                          alt="Evidencia"
                          className="w-full rounded-lg border border-border object-contain max-h-64"
                        />
                      ) : null}
                      <a
                        href={urlEvidencia}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink size={14} />
                        Abrir evidencia en nueva pestaña
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Generando enlace...</p>
                  )
                ) : (
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">El pensionado no adjuntó evidencia</p>
                  </div>
                )}
              </div>

              {/* Selección de acción */}
              <div>
                <p className="text-sm font-medium mb-3">Resolución</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAccion('aprobar')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                      accion === 'aprobar'
                        ? 'bg-green-50 border-green-400 text-green-700'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <CheckCircle size={16} />
                    Aprobar
                  </button>
                  <button
                    onClick={() => setAccion('rechazar')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                      accion === 'rechazar'
                        ? 'bg-red-50 border-red-400 text-red-700'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <XCircle size={16} />
                    Rechazar
                  </button>
                </div>
              </div>

              {/* Nota del revisor */}
              {accion && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nota del revisor{' '}
                    <span className="text-muted-foreground font-normal">
                      {accion === 'rechazar' ? '(recomendado)' : '(opcional)'}
                    </span>
                  </label>
                  <textarea
                    value={nota}
                    onChange={e => setNota(e.target.value)}
                    placeholder={
                      accion === 'aprobar'
                        ? 'Ej. Evidencia verificada correctamente...'
                        : 'Ej. La fotografía no corresponde al pensionado...'
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {errorModal && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive text-sm">
                  {errorModal}
                </div>
              )}
            </div>

            {/* Footer con acciones */}
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={cerrarModal}
                disabled={procesando}
                className="flex-1 border border-border px-4 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarResolucion}
                disabled={!accion || procesando}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${
                  accion === 'rechazar'
                    ? 'bg-destructive text-white hover:opacity-90'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {procesando
                  ? 'Guardando...'
                  : accion === 'aprobar'
                  ? 'Confirmar aprobación'
                  : accion === 'rechazar'
                  ? 'Confirmar rechazo'
                  : 'Selecciona una acción'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}