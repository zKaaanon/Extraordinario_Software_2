import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CheckCircle, XCircle, ExternalLink, MessageSquarePlus } from 'lucide-react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const sidebarItems = [
  { label: 'Pensionados',  icon: '👴' },
  { label: 'Validaciones', icon: '✅' },
]

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Pensionado {
  id: string
  nombre_completo: string
  curp: string
  numero_pensionado: string
  fecha_nacimiento: string
  telefono: string | null
  correo: string
  domicilio: string | null
  fecha_inicio_pension: string
  estatus: string
  fecha_ultima_validacion: string | null
  fecha_proxima_validacion: string | null
  estado_validacion: string
  created_at: string
}

interface Validacion {
  id: string
  fecha_validacion: string
  resultado: string
  observaciones: string | null
  evidencia_url: string | null
  fecha_revision: string | null
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const BADGE_ESTADO: Record<string, string> = {
  vigente:          'bg-green-100 text-green-800',
  proxima_a_vencer: 'bg-yellow-100 text-yellow-800',
  vencida:          'bg-red-100 text-red-800',
  en_revision:      'bg-blue-100 text-blue-800',
  sin_fecha:        'bg-gray-100 text-gray-600',
}

const LABEL_ESTADO: Record<string, string> = {
  vigente:          'Vigente',
  proxima_a_vencer: 'Próximo a vencer',
  vencida:          'Vencido',
  en_revision:      'En revisión',
  sin_fecha:        'Sin fecha',
}

const BADGE_RESULTADO: Record<string, { label: string; clase: string }> = {
  exitosa:          { label: 'Aprobada',         clase: 'bg-green-100 text-green-800' },
  rechazada:        { label: 'Rechazada',         clase: 'bg-red-100 text-red-800' },
  en_revision:      { label: 'En revisión',       clase: 'bg-blue-100 text-blue-800' },
  fuera_de_periodo: { label: 'Fuera de periodo',  clase: 'bg-gray-100 text-gray-600' },
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ExpedienteOperador() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { usuario } = useAuth()

  const [pensionado,   setPensionado]   = useState<Pensionado | null>(null)
  const [validaciones, setValidaciones] = useState<Validacion[]>([])
  const [cargando,     setCargando]     = useState(true)
  const [tab,          setTab]          = useState<'datos' | 'historial'>('datos')

  // ── Modal de revisión ─────────────────────────────────────────────────────
  const [valSeleccionada, setValSeleccionada] = useState<Validacion | null>(null)
  const [urlEvidencia,    setUrlEvidencia]    = useState<string | null>(null)
  const [accion,          setAccion]          = useState<'aprobar' | 'rechazar' | null>(null)
  const [nota,            setNota]            = useState('')
  const [procesando,      setProcesando]      = useState(false)
  const [errorModal,      setErrorModal]      = useState('')

  // ── Modal de nota libre (RF-35) ───────────────────────────────────────────
  const [modalNota,       setModalNota]       = useState(false)
  const [valParaNota,     setValParaNota]     = useState<Validacion | null>(null)
  const [textoNota,       setTextoNota]       = useState('')
  const [guardandoNota,   setGuardandoNota]   = useState(false)
  const [errorNota,       setErrorNota]       = useState('')

  useEffect(() => { cargarExpediente() }, [id])

  // ── Carga ─────────────────────────────────────────────────────────────────

  async function cargarExpediente() {
    if (!id) return
    setCargando(true)

    const [{ data: pen }, { data: vals }] = await Promise.all([
      supabase.from('v_pensionados_estado').select('*').eq('id', id).single(),
      supabase.from('validaciones')
        .select('id, fecha_validacion, resultado, observaciones, evidencia_url, fecha_revision')
        .eq('pensionado_id', id)
        .order('fecha_validacion', { ascending: false }),
    ])

    if (pen) setPensionado(pen)
    setValidaciones(vals ?? [])
    setCargando(false)
  }

  // ── Abrir revisión ────────────────────────────────────────────────────────

  async function abrirRevision(val: Validacion) {
    setValSeleccionada(val)
    setAccion(null)
    setNota('')
    setErrorModal('')
    setUrlEvidencia(null)

    if (val.evidencia_url) {
      const { data } = await supabase.storage
        .from('validaciones')
        .createSignedUrl(val.evidencia_url, 3600)
      setUrlEvidencia(data?.signedUrl ?? null)
    }
  }

  function cerrarRevision() {
    setValSeleccionada(null)
    setUrlEvidencia(null)
    setAccion(null)
    setNota('')
    setErrorModal('')
  }

  // ── Confirmar resolución (RF-36) ──────────────────────────────────────────

  async function confirmarResolucion() {
    if (!valSeleccionada || !accion || !usuario) return
    setProcesando(true)
    setErrorModal('')

    const nuevoResultado = accion === 'aprobar' ? 'exitosa' : 'rechazada'
    const obsBase    = valSeleccionada.observaciones
      ? valSeleccionada.observaciones.replace(/\[Revisor:.*?\]/gs, '').trim()
      : ''
    const obsRevisor = nota.trim() ? `[Revisor: ${nota.trim()}]` : ''
    const obsFinales = [obsBase, obsRevisor].filter(Boolean).join(' ') || null

    const { error } = await supabase
      .from('validaciones')
      .update({
        resultado:       nuevoResultado,
        observaciones:   obsFinales,
        usuario_revisor: usuario.id,
        fecha_revision:  new Date().toISOString(),
      })
      .eq('id', valSeleccionada.id)

    if (error) {
      setErrorModal('Error al guardar: ' + error.message)
      setProcesando(false)
      return
    }

    await supabase.rpc('registrar_bitacora', {
      p_accion:      nuevoResultado === 'exitosa' ? 'aprobar_validacion' : 'rechazar_validacion',
      p_tabla:       'validaciones',
      p_registro_id: valSeleccionada.id,
      p_descripcion: `${nuevoResultado === 'exitosa' ? 'Aprobó' : 'Rechazó'} validación de: ${pensionado?.nombre_completo}`,
    })

    cerrarRevision()
    await cargarExpediente()
    setProcesando(false)
  }

  // ── Agregar nota libre a una validación (RF-35) ───────────────────────────

  function abrirModalNota(val: Validacion) {
    setValParaNota(val)
    // Prellenar con texto existente (limpio de tags de sistema/revisor)
    const obsLimpia = val.observaciones
      ? val.observaciones.replace(/\[Sistema:.*?\]|\[Revisor:.*?\]/g, '').trim()
      : ''
    setTextoNota(obsLimpia)
    setErrorNota('')
    setModalNota(true)
  }

  function cerrarModalNota() {
    setModalNota(false)
    setValParaNota(null)
    setTextoNota('')
    setErrorNota('')
  }

  async function guardarNota() {
    if (!valParaNota || !usuario) return
    setGuardandoNota(true)
    setErrorNota('')

    // Conservar el tag de revisor anterior si existe, agregar nuevo
    const tagAnterior = valParaNota.observaciones?.match(/\[Revisor:.*?\]/)?.[0] ?? ''
    const nuevoTag    = textoNota.trim()
      ? `[Revisor: ${textoNota.trim()}]`
      : tagAnterior

    const sistemaTag = valParaNota.observaciones?.match(/\[Sistema:.*?\]/)?.[0] ?? ''
    const obsFinales = [sistemaTag, nuevoTag].filter(Boolean).join(' ') || null

    const { error } = await supabase
      .from('validaciones')
      .update({ observaciones: obsFinales })
      .eq('id', valParaNota.id)

    if (error) {
      setErrorNota('Error al guardar: ' + error.message)
      setGuardandoNota(false)
      return
    }

    await supabase.rpc('registrar_bitacora', {
      p_accion:      'agregar_observacion',
      p_tabla:       'validaciones',
      p_registro_id: valParaNota.id,
      p_descripcion: `Agregó observación en validación de: ${pensionado?.nombre_completo}`,
    })

    cerrarModalNota()
    await cargarExpediente()
    setGuardandoNota(false)
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar roleColor="bg-blue-100 text-blue-800" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Cargando expediente...
        </div>
      </div>
    )
  }

  if (!pensionado) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar roleColor="bg-blue-100 text-blue-800" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No se encontró el pensionado.</p>
            <button
              onClick={() => navigate('/operador')}
              className="text-primary hover:underline text-sm"
            >
              ← Volver a la lista
            </button>
          </div>
        </div>
      </div>
    )
  }

  const badgeClase      = BADGE_ESTADO[pensionado.estado_validacion] ?? BADGE_ESTADO.sin_fecha
  const badgeLabel      = LABEL_ESTADO[pensionado.estado_validacion] ?? 'Sin fecha'
  const pendientesCount = validaciones.filter(v => v.resultado === 'en_revision').length

  // ── Render ────────────────────────────────────────────────────────────────

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

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/operador')}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                ← Volver
              </button>
              <div>
                <h1 className="mb-1">{pensionado.nombre_completo}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-muted-foreground font-mono">{pensionado.curp}</span>
                  <span className="text-sm text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{pensionado.numero_pensionado}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${badgeClase}`}>
                    {badgeLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjetas de fechas */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Inicio de pensión</p>
              <p className="text-sm font-medium">
                {new Date(pensionado.fecha_inicio_pension).toLocaleDateString('es-MX')}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Última validación</p>
              <p className="text-sm font-medium">
                {pensionado.fecha_ultima_validacion
                  ? new Date(pensionado.fecha_ultima_validacion).toLocaleDateString('es-MX')
                  : '—'}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Próxima validación</p>
              <p className="text-sm font-medium">
                {pensionado.fecha_proxima_validacion
                  ? new Date(pensionado.fecha_proxima_validacion).toLocaleDateString('es-MX')
                  : '—'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-border">
            {(['datos', 'historial'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'datos' ? 'Datos personales' : (
                  <span className="flex items-center gap-2">
                    Historial de validaciones
                    {pendientesCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {pendientesCount}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab: Datos (solo lectura) ── */}
          {tab === 'datos' && (
            <div className="bg-card border border-border rounded-xl p-6 max-w-2xl">
              <h2 className="text-base mb-6">Datos personales</h2>

              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="text-muted-foreground mb-1">Nombre completo</p>
                  <p className="font-medium">{pensionado.nombre_completo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">CURP</p>
                  <p className="font-mono">{pensionado.curp}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Número de pensionado</p>
                  <p>{pensionado.numero_pensionado}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Fecha de nacimiento</p>
                  <p>{new Date(pensionado.fecha_nacimiento).toLocaleDateString('es-MX')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Registro en sistema</p>
                  <p>{new Date(pensionado.created_at).toLocaleDateString('es-MX')}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Correo</p>
                  <p>{pensionado.correo || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Teléfono</p>
                  <p>{pensionado.telefono || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Domicilio</p>
                  <p>{pensionado.domicilio || '—'}</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground italic">
                Solo el administrador puede modificar datos personales.
              </p>
            </div>
          )}

          {/* ── Tab: Historial de validaciones ── */}
          {tab === 'historial' && (
            <div className="max-w-4xl">
              {validaciones.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                  No hay validaciones registradas.
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-5 py-3 text-left text-sm">Fecha</th>
                        <th className="px-5 py-3 text-left text-sm">Resultado</th>
                        <th className="px-5 py-3 text-left text-sm">Observaciones</th>
                        <th className="px-5 py-3 text-left text-sm">Evidencia</th>
                        <th className="px-5 py-3 text-left text-sm">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validaciones.map(v => {
                        const badge      = BADGE_RESULTADO[v.resultado] ?? { label: v.resultado, clase: 'bg-gray-100 text-gray-600' }
                        const esPendiente = v.resultado === 'en_revision'
                        const obsLimpia  = v.observaciones
                          ? v.observaciones.replace(/\[Sistema:.*?\]|\[Revisor:.*?\]/g, '').trim()
                          : ''
                        const tagRevisor = v.observaciones?.match(/\[Revisor:(.*?)\]/)?.[1]?.trim() ?? ''

                        return (
                          <tr
                            key={v.id}
                            className={`border-t border-border ${esPendiente ? 'bg-blue-50/40' : ''}`}
                          >
                            <td className="px-5 py-4 text-sm whitespace-nowrap">
                              {new Date(v.fecha_validacion).toLocaleDateString('es-MX', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.clase}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-muted-foreground max-w-xs">
                              <div>
                                {obsLimpia || '—'}
                                {tagRevisor && (
                                  <p className="text-xs text-blue-600 mt-0.5">
                                    Nota del operador: {tagRevisor}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm">
                              {v.evidencia_url ? (
                                <span className="text-blue-600 text-xs">Adjunta</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-1.5">
                                {/* RF-36: Marcar como revisada */}
                                {esPendiente && (
                                  <button
                                    onClick={() => abrirRevision(v)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs hover:opacity-90 transition-opacity whitespace-nowrap"
                                  >
                                    Revisar
                                  </button>
                                )}
                                {/* RF-35: Agregar/editar observación */}
                                <button
                                  onClick={() => abrirModalNota(v)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-accent transition-colors whitespace-nowrap"
                                >
                                  <MessageSquarePlus size={11} />
                                  {tagRevisor ? 'Editar nota' : 'Agregar nota'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Modal de revisión (RF-36) ── */}
      {valSeleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">

            <div className="px-6 py-5 border-b border-border">
              <h2 className="mb-1">Revisar validación</h2>
              <p className="text-sm text-muted-foreground">
                Enviada el {new Date(valSeleccionada.fecha_validacion).toLocaleString('es-MX', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Observaciones del pensionado */}
              {valSeleccionada.observaciones && (
                <div className="bg-muted rounded-lg p-4 text-sm">
                  <p className="text-muted-foreground mb-1">Observaciones del pensionado</p>
                  <p>
                    {valSeleccionada.observaciones
                      .replace(/\[Sistema:.*?\]|\[Revisor:.*?\]/g, '')
                      .trim() || '—'
                    }
                  </p>
                </div>
              )}

              {/* Evidencia */}
              <div>
                <p className="text-sm font-medium mb-2">Evidencia adjunta</p>
                {valSeleccionada.evidencia_url ? (
                  urlEvidencia ? (
                    <div className="space-y-2">
                      {/\.(jpg|jpeg|png)$/i.test(valSeleccionada.evidencia_url) && (
                        <img
                          src={urlEvidencia}
                          alt="Evidencia"
                          className="w-full rounded-lg border border-border object-contain max-h-64"
                        />
                      )}
                      <a
                        href={urlEvidencia}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink size={14} />
                        Abrir en nueva pestaña
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Generando enlace...</p>
                  )
                ) : (
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Sin evidencia adjunta</p>
                  </div>
                )}
              </div>

              {/* Resolución */}
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

            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={cerrarRevision}
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

      {/* ── Modal de nota libre (RF-35) ── */}
      {modalNota && valParaNota && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">

            <div className="px-6 py-5 border-b border-border">
              <h2 className="mb-1">Agregar observación</h2>
              <p className="text-sm text-muted-foreground">
                Validación del {new Date(valParaNota.fecha_validacion).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Observación del operador
                </label>
                <textarea
                  value={textoNota}
                  onChange={e => setTextoNota(e.target.value)}
                  placeholder="Escribe aquí tu comentario o nota de seguimiento..."
                  rows={4}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta nota será visible para administradores y operadores, no para el pensionado.
                </p>
              </div>

              {errorNota && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive text-sm">
                  {errorNota}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={cerrarModalNota}
                disabled={guardandoNota}
                className="flex-1 border border-border px-4 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={guardarNota}
                disabled={guardandoNota}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {guardandoNota ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}