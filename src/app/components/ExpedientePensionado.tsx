import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const sidebarItems = [
  { label: 'Dashboard', icon: '📊' },
  { label: 'Usuarios', icon: '👥' },
  { label: 'Validaciones', icon: '✅' },
  { label: 'Pensionados', icon: '👴' },
  { label: 'Configuración', icon: '⚙️' },
  { label: 'Bitácora', icon: '📋' },
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

interface Documento {
  id: string
  tipo_documento: string
  nombre_archivo: string
  ruta_archivo: string
  fecha_carga: string
}

interface Validacion {
  id: string
  fecha_validacion: string
  resultado: string
  observaciones: string | null
  evidencia_url: string | null
  fecha_revision: string | null
}

// ─── Constantes de UI ────────────────────────────────────────────────────────

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
  exitosa:          { label: 'Aprobada',          clase: 'bg-green-100 text-green-800' },
  rechazada:        { label: 'Rechazada',          clase: 'bg-red-100 text-red-800' },
  en_revision:      { label: 'En revisión',        clase: 'bg-blue-100 text-blue-800' },
  fuera_de_periodo: { label: 'Fuera de periodo',   clase: 'bg-gray-100 text-gray-600' },
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ExpedientePensionado() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { usuario } = useAuth()

  const [pensionado,   setPensionado]   = useState<Pensionado | null>(null)
  const [documentos,   setDocumentos]   = useState<Documento[]>([])
  const [validaciones, setValidaciones] = useState<Validacion[]>([])
  const [cargando,     setCargando]     = useState(true)
  const [tab, setTab]                   = useState<'datos' | 'documentos' | 'historial'>('datos')

  // Edición de contacto
  const [editando,        setEditando]        = useState(false)
  const [contacto,        setContacto]        = useState({ correo: '', telefono: '', domicilio: '' })
  const [guardando,       setGuardando]       = useState(false)
  const [mensajeGuardado, setMensajeGuardado] = useState('')

  // Revisión de validación (modal)
  const [valSeleccionada, setValSeleccionada] = useState<Validacion | null>(null)
  const [urlEvidencia,    setUrlEvidencia]    = useState<string | null>(null)
  const [accionRevision,  setAccionRevision]  = useState<'aprobar' | 'rechazar' | null>(null)
  const [notaRevision,    setNotaRevision]    = useState('')
  const [procesandoRev,   setProcesandoRev]   = useState(false)
  const [errorRevision,   setErrorRevision]   = useState('')

  useEffect(() => { cargarExpediente() }, [id])

  // ── Carga de datos ──────────────────────────────────────────────────────────

  async function cargarExpediente() {
    if (!id) return
    setCargando(true)

    const [{ data: pen }, { data: docs }, { data: vals }] = await Promise.all([
      supabase.from('v_pensionados_estado').select('*').eq('id', id).single(),
      supabase.from('documentos').select('*').eq('pensionado_id', id).order('fecha_carga', { ascending: false }),
      supabase.from('validaciones')
        .select('id, fecha_validacion, resultado, observaciones, evidencia_url, fecha_revision')
        .eq('pensionado_id', id)
        .order('fecha_validacion', { ascending: false }),
    ])

    if (pen) {
      setPensionado(pen)
      setContacto({ correo: pen.correo ?? '', telefono: pen.telefono ?? '', domicilio: pen.domicilio ?? '' })
    }

    // Signed URLs para documentos
    const docsConUrl = await Promise.all(
      (docs ?? []).map(async doc => {
        const { data: signed } = await supabase.storage
          .from('documentos')
          .createSignedUrl(doc.ruta_archivo, 3600)
        return { ...doc, ruta_archivo: signed?.signedUrl ?? doc.ruta_archivo }
      })
    )

    setDocumentos(docsConUrl)
    setValidaciones(vals ?? [])
    setCargando(false)
  }

  // ── Guardar contacto ────────────────────────────────────────────────────────

  async function guardarContacto() {
    if (!id) return
    setGuardando(true)
    setMensajeGuardado('')

    const { error } = await supabase
      .from('pensionados')
      .update({ correo: contacto.correo, telefono: contacto.telefono, domicilio: contacto.domicilio })
      .eq('id', id)

    if (error) {
      setMensajeGuardado('Error al guardar: ' + error.message)
    } else {
      await supabase.rpc('registrar_bitacora', {
        p_accion:      'modificar_pensionado',
        p_tabla:       'pensionados',
        p_registro_id: id,
        p_descripcion: `Actualizó datos de contacto de: ${pensionado?.nombre_completo}`,
      })
      setMensajeGuardado('Datos actualizados correctamente.')
      setEditando(false)
      cargarExpediente()
    }
    setGuardando(false)
  }

  // ── Cambiar estatus ─────────────────────────────────────────────────────────

  async function toggleEstatus() {
    if (!pensionado) return
    const nuevoEstatus = pensionado.estatus === 'activo' ? 'inactivo' : 'activo'
    const { error } = await supabase.from('pensionados').update({ estatus: nuevoEstatus }).eq('id', id)
    if (!error) {
      await supabase.rpc('registrar_bitacora', {
        p_accion:      nuevoEstatus === 'activo' ? 'activar_pensionado' : 'desactivar_pensionado',
        p_tabla:       'pensionados',
        p_registro_id: id!,
        p_descripcion: `${nuevoEstatus === 'activo' ? 'Activó' : 'Desactivó'} a: ${pensionado.nombre_completo}`,
      })
      cargarExpediente()
    }
  }

  // ── Abrir modal de revisión ─────────────────────────────────────────────────

  async function abrirRevision(val: Validacion) {
    setValSeleccionada(val)
    setAccionRevision(null)
    setNotaRevision('')
    setErrorRevision('')
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
    setAccionRevision(null)
    setNotaRevision('')
    setErrorRevision('')
  }

  // ── Confirmar resolución ────────────────────────────────────────────────────

  async function confirmarResolucion() {
    if (!valSeleccionada || !accionRevision || !usuario) return
    setProcesandoRev(true)
    setErrorRevision('')

    const nuevoResultado = accionRevision === 'aprobar' ? 'exitosa' : 'rechazada'

    const obsBase = valSeleccionada.observaciones
      ? valSeleccionada.observaciones.replace(/\[Revisor:.*?\]/gs, '').trim()
      : ''
    const obsRevisor = notaRevision.trim() ? `[Revisor: ${notaRevision.trim()}]` : ''
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
      setErrorRevision('Error al guardar: ' + error.message)
      setProcesandoRev(false)
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
    setProcesandoRev(false)
  }

  // ── Guards de carga ─────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar roleColor="bg-purple-100 text-purple-800" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Cargando expediente...
        </div>
      </div>
    )
  }

  if (!pensionado) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar roleColor="bg-purple-100 text-purple-800" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No se encontró el pensionado.</p>
            <button onClick={() => navigate('/admin/pensionados')} className="text-primary hover:underline text-sm">
              ← Volver a la lista
            </button>
          </div>
        </div>
      </div>
    )
  }

  const badgeClase = BADGE_ESTADO[pensionado.estado_validacion] ?? BADGE_ESTADO.sin_fecha
  const badgeLabel = LABEL_ESTADO[pensionado.estado_validacion] ?? 'Sin fecha'
  const pendientesCount = validaciones.filter(v => v.resultado === 'en_revision').length

  // ── Render ──────────────────────────────────────────────────────────────────

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
            if (i === 2) navigate('/admin/pensionados')
            if (i === 3) navigate('/admin/validaciones')
            if (i === 4) navigate('/admin/configuracion')
            if (i === 5) navigate('/admin/bitacora')
          }}
        />

        <main className="flex-1 overflow-y-auto p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/pensionados')}
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
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    pensionado.estatus === 'activo'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {pensionado.estatus === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={toggleEstatus}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                pensionado.estatus === 'activo'
                  ? 'border border-destructive text-destructive hover:bg-destructive/10'
                  : 'border border-green-600 text-green-600 hover:bg-green-50'
              }`}
            >
              {pensionado.estatus === 'activo' ? 'Dar de baja' : 'Reactivar'}
            </button>
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
            {(['datos', 'documentos', 'historial'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
                  tab === t
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'datos'      && 'Datos personales'}
                {t === 'documentos' && 'Documentos'}
                {t === 'historial'  && (
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

          {/* ── Tab: Datos personales ── */}
          {tab === 'datos' && (
            <div className="bg-card border border-border rounded-xl p-6 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base">Datos personales</h2>
                {!editando && (
                  <button
                    onClick={() => setEditando(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Editar contacto
                  </button>
                )}
              </div>

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

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-4">
                  Datos de contacto{editando && <span className="text-primary text-xs ml-2">(editando)</span>}
                </p>

                {editando ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Correo electrónico</label>
                      <input
                        type="email"
                        value={contacto.correo}
                        onChange={e => setContacto({ ...contacto, correo: e.target.value })}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Teléfono</label>
                      <input
                        type="text"
                        value={contacto.telefono}
                        onChange={e => setContacto({ ...contacto, telefono: e.target.value })}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Domicilio</label>
                      <input
                        type="text"
                        value={contacto.domicilio}
                        onChange={e => setContacto({ ...contacto, domicilio: e.target.value })}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    {mensajeGuardado && (
                      <p className={`text-sm ${mensajeGuardado.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
                        {mensajeGuardado}
                      </p>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => { setEditando(false); setMensajeGuardado('') }}
                        className="flex-1 border border-border px-4 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={guardarContacto}
                        disabled={guardando}
                        className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        {guardando ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Documentos ── */}
          {tab === 'documentos' && (
            <div className="max-w-2xl">
              {documentos.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                  No hay documentos cargados.
                </div>
              ) : (
                <div className="space-y-3">
                  {documentos.map(doc => (
                    <div key={doc.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium capitalize">{doc.tipo_documento}</p>
                        <p className="text-xs text-muted-foreground">{doc.nombre_archivo}</p>
                        <p className="text-xs text-muted-foreground">
                          Cargado: {new Date(doc.fecha_carga).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                      <a
                        href={doc.ruta_archivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Ver documento →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Historial de validaciones ── */}
          {tab === 'historial' && (
            <div className="max-w-3xl">
              {validaciones.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                  No hay validaciones registradas.
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm">Fecha</th>
                        <th className="px-6 py-3 text-left text-sm">Resultado</th>
                        <th className="px-6 py-3 text-left text-sm">Observaciones</th>
                        <th className="px-6 py-3 text-left text-sm">Evidencia</th>
                        <th className="px-6 py-3 text-left text-sm">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validaciones.map(v => {
                        const badge = BADGE_RESULTADO[v.resultado] ?? { label: v.resultado, clase: 'bg-gray-100 text-gray-600' }
                        const esPendiente = v.resultado === 'en_revision'
                        return (
                          <tr
                            key={v.id}
                            className={`border-t border-border ${esPendiente ? 'bg-blue-50/50' : ''}`}
                          >
                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                              {new Date(v.fecha_validacion).toLocaleString('es-MX', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.clase}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs">
                              {v.observaciones
                                ? v.observaciones.replace(/\[Sistema:.*?\]|\[Revisor:.*?\]/g, '').trim() || '—'
                                : '—'
                              }
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {v.evidencia_url ? (
                                <span className="text-blue-600 text-xs">Adjunta</span>
                              ) : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {esPendiente ? (
                                <button
                                  onClick={() => abrirRevision(v)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs hover:opacity-90 transition-opacity"
                                >
                                  Revisar
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {v.fecha_revision
                                    ? new Date(v.fecha_revision).toLocaleDateString('es-MX')
                                    : '—'
                                  }
                                </span>
                              )}
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

      {/* ── Modal de revisión ── */}
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

              {/* Selección de resolución */}
              <div>
                <p className="text-sm font-medium mb-3">Resolución</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAccionRevision('aprobar')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                      accionRevision === 'aprobar'
                        ? 'bg-green-50 border-green-400 text-green-700'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <CheckCircle size={16} />
                    Aprobar
                  </button>
                  <button
                    onClick={() => setAccionRevision('rechazar')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                      accionRevision === 'rechazar'
                        ? 'bg-red-50 border-red-400 text-red-700'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <XCircle size={16} />
                    Rechazar
                  </button>
                </div>
              </div>

              {/* Nota */}
              {accionRevision && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nota del revisor{' '}
                    <span className="text-muted-foreground font-normal">
                      {accionRevision === 'rechazar' ? '(recomendado)' : '(opcional)'}
                    </span>
                  </label>
                  <textarea
                    value={notaRevision}
                    onChange={e => setNotaRevision(e.target.value)}
                    placeholder={
                      accionRevision === 'aprobar'
                        ? 'Ej. Evidencia verificada correctamente...'
                        : 'Ej. La fotografía no corresponde al pensionado...'
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {errorRevision && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive text-sm">
                  {errorRevision}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={cerrarRevision}
                disabled={procesandoRev}
                className="flex-1 border border-border px-4 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarResolucion}
                disabled={!accionRevision || procesandoRev}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${
                  accionRevision === 'rechazar'
                    ? 'bg-destructive text-white hover:opacity-90'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {procesandoRev
                  ? 'Guardando...'
                  : accionRevision === 'aprobar'
                  ? 'Confirmar aprobación'
                  : accionRevision === 'rechazar'
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