import { useEffect, useState, useRef } from 'react'
import { CalendarDays, Clock, CheckCircle, AlertTriangle, Upload, FileCheck, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import Navbar from './Navbar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type EstadoValidacion = 'vigente' | 'proxima_a_vencer' | 'vencida' | 'en_revision' | 'sin_fecha'

interface PensionadoEstado {
  id: string
  nombre_completo: string
  estado_validacion: EstadoValidacion
  fecha_ultima_validacion: string | null
  fecha_proxima_validacion: string | null
  estatus: string
}

interface Validacion {
  id: string
  fecha_validacion: string
  resultado: string
  observaciones: string | null
  evidencia_url: string | null
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_MB = 10

const ESTADO_CONFIG: Record<EstadoValidacion, {
  color: string
  bg: string
  border: string
  icono: React.ReactNode
  titulo: string
  mensaje: string
}> = {
  vigente: {
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    icono: <CheckCircle className="text-green-600" size={28} />,
    titulo: 'Validación al corriente',
    mensaje: 'Tu trámite de supervivencia está vigente. No necesitas hacer nada por ahora.',
  },
  proxima_a_vencer: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icono: <Clock className="text-yellow-600" size={28} />,
    titulo: 'Validación próxima a vencer',
    mensaje: 'Es momento de realizar tu trámite de supervivencia. Por favor complétalo antes de la fecha límite.',
  },
  vencida: {
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icono: <AlertTriangle className="text-red-600" size={28} />,
    titulo: 'Validación vencida',
    mensaje: 'Tu validación ha vencido. Realiza tu trámite de inmediato para evitar la suspensión de tu pensión.',
  },
  en_revision: {
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icono: <RefreshCw className="text-blue-600" size={28} />,
    titulo: 'En revisión',
    mensaje: 'Tu trámite fue recibido y está siendo revisado por el personal encargado. Te notificaremos cuando esté resuelto.',
  },
  sin_fecha: {
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icono: <CalendarDays className="text-gray-500" size={28} />,
    titulo: 'Sin fecha programada',
    mensaje: 'Aún no tienes una fecha de validación asignada. Comunícate con el área administrativa.',
  },
}

const RESULTADO_BADGE: Record<string, { label: string; clase: string }> = {
  exitosa:        { label: 'Aprobada',         clase: 'bg-green-100 text-green-800' },
  rechazada:      { label: 'Rechazada',        clase: 'bg-red-100 text-red-800' },
  en_revision:    { label: 'En revisión',      clase: 'bg-blue-100 text-blue-800' },
  fuera_de_periodo: { label: 'Fuera de periodo', clase: 'bg-gray-100 text-gray-600' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diasRestantes(fecha: string | null): number | null {
  if (!fecha) return null
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86_400_000)
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function PensionerDashboard() {
  const { usuario } = useAuth()

  // Datos
  const [pensionado, setPensionado]     = useState<PensionadoEstado | null>(null)
  const [validaciones, setValidaciones] = useState<Validacion[]>([])
  const [cargando, setCargando]         = useState(true)

  // UI
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  // Formulario de validación
  const [confirmado, setConfirmado]     = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [archivo, setArchivo]           = useState<File | null>(null)
  const [errorArchivo, setErrorArchivo] = useState('')
  const [enviando, setEnviando]         = useState(false)
  const [errorEnvio, setErrorEnvio]     = useState('')
  const [resultadoEnvio, setResultadoEnvio] = useState<'exito' | 'fuera_periodo' | null>(null)

  const inputArchivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => { cargarDatos() }, [])

  // ── Carga de datos ──────────────────────────────────────────────────────────

  async function cargarDatos() {
    if (!usuario) return
    setCargando(true)

    // 1. Obtener el id del pensionado (RLS filtra por user_id automáticamente)
    const { data: penBase, error: err1 } = await supabase
      .from('pensionados')
      .select('id')
      .eq('user_id', usuario.id)
      .single()

    if (err1 || !penBase) {
      console.error('No se encontró el pensionado:', err1)
      setCargando(false)
      return
    }

    // 2. Obtener estado calculado desde la vista
    const { data: penEstado, error: err2 } = await supabase
      .from('v_pensionados_estado')
      .select('id, nombre_completo, estado_validacion, fecha_ultima_validacion, fecha_proxima_validacion, estatus')
      .eq('id', penBase.id)
      .single()

    // 3. Historial de validaciones
    const { data: vals } = await supabase
      .from('validaciones')
      .select('id, fecha_validacion, resultado, observaciones, evidencia_url')
      .eq('pensionado_id', penBase.id)
      .order('fecha_validacion', { ascending: false })
      .limit(20)

    if (penEstado) setPensionado(penEstado as PensionadoEstado)
    setValidaciones(vals ?? [])
    setCargando(false)
  }

  // ── Manejo de archivo ───────────────────────────────────────────────────────

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorArchivo('')
    const file = e.target.files?.[0]
    if (!file) return

    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      setErrorArchivo('Solo se permiten archivos JPG, PNG o PDF.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setErrorArchivo(`El archivo no debe superar ${MAX_MB} MB.`)
      return
    }
    setArchivo(file)
  }

  function limpiarFormulario() {
    setConfirmado(false)
    setObservaciones('')
    setArchivo(null)
    setErrorArchivo('')
    setErrorEnvio('')
    if (inputArchivoRef.current) inputArchivoRef.current.value = ''
  }

  // ── Envío de validación ─────────────────────────────────────────────────────

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!pensionado || !confirmado) return

    setEnviando(true)
    setErrorEnvio('')

    try {
      let evidenciaUrl: string | null = null

      // 1. Subir evidencia si se proporcionó
      if (archivo) {
        const ext = archivo.name.split('.').pop()
        const timestamp = Date.now()
        const nombreArchivo = `${timestamp}-evidencia.${ext}`
        const rutaBlob = `${pensionado.id}/${nombreArchivo}`

        const { error: storageErr } = await supabase.storage
          .from('validaciones')
          .upload(rutaBlob, archivo, { upsert: false })

        if (storageErr) {
          setErrorEnvio('Error al subir la evidencia: ' + storageErr.message)
          return
        }

        // Guardamos la ruta relativa (se generan signed URLs al consultarlas)
        evidenciaUrl = rutaBlob
      }

      // 2. Insertar validación — el trigger trg_validar_periodo puede cambiar
      //    el resultado a 'fuera_de_periodo' si no está dentro del periodo
      const { data: nuevaVal, error: insertErr } = await supabase
        .from('validaciones')
        .insert({
          pensionado_id: pensionado.id,
          resultado:     'en_revision',
          observaciones: observaciones.trim() || null,
          evidencia_url: evidenciaUrl,
        })
        .select('resultado')
        .single()

      if (insertErr) {
        setErrorEnvio('Error al registrar la validación: ' + insertErr.message)
        return
      }

      // 3. Bitácora
      await supabase.rpc('registrar_bitacora', {
        p_accion:      'validacion_supervivencia',
        p_tabla:       'validaciones',
        p_registro_id: pensionado.id,
        p_descripcion: `Validación de supervivencia enviada por: ${pensionado.nombre_completo}`,
      })

      // 4. Mostrar resultado
      const resultadoFinal = nuevaVal?.resultado ?? 'en_revision'
      setResultadoEnvio(resultadoFinal === 'fuera_de_periodo' ? 'fuera_periodo' : 'exito')
      limpiarFormulario()
      await cargarDatos()

    } catch (err) {
      console.error(err)
      setErrorEnvio('Error inesperado. Por favor intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // ── Estados de carga y error ────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Navbar roleColor="bg-green-100 text-green-800" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🏛️</div>
            <p className="text-muted-foreground">Cargando tu información...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!pensionado) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Navbar roleColor="bg-green-100 text-green-800" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md p-8">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="mb-2">No se encontró tu expediente</h2>
            <p className="text-muted-foreground text-sm">
              No pudimos localizar tu información. Comunícate con el área administrativa para recibir ayuda.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const estadoConfig = ESTADO_CONFIG[pensionado.estado_validacion] ?? ESTADO_CONFIG.sin_fecha
  const dias         = diasRestantes(pensionado.fecha_proxima_validacion)
  const puedeValidar = pensionado.estado_validacion === 'proxima_a_vencer'
                    || pensionado.estado_validacion === 'vencida'

  const nombreCorto = pensionado.nombre_completo.split(' ')[0]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar roleColor="bg-green-100 text-green-800" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          {/* Bienvenida */}
          <div>
            <h1 className="text-3xl mb-1">Bienvenido, {nombreCorto}</h1>
            <p className="text-muted-foreground text-sm">
              Portal de validación de supervivencia
            </p>
          </div>

          {/* Banner de estado */}
          <div className={`rounded-xl border-2 p-5 ${estadoConfig.bg} ${estadoConfig.border}`}>
            <div className="flex items-start gap-4">
              <div className="mt-0.5 shrink-0">{estadoConfig.icono}</div>
              <div>
                <p className={`font-semibold text-lg mb-1 ${estadoConfig.color}`}>
                  {estadoConfig.titulo}
                </p>
                <p className={`text-sm ${estadoConfig.color}`}>
                  {estadoConfig.mensaje}
                </p>
              </div>
            </div>
          </div>

          {/* Tarjetas de fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={18} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Última validación</p>
              </div>
              <p className="text-base font-medium leading-tight">
                {formatearFecha(pensionado.fecha_ultima_validacion)}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Próxima validación</p>
              </div>
              <p className="text-base font-medium leading-tight">
                {formatearFecha(pensionado.fecha_proxima_validacion)}
              </p>
              {dias !== null && (
                <p className={`text-xs mt-1 font-medium ${
                  dias < 0 ? 'text-red-600' : dias <= 15 ? 'text-yellow-600' : 'text-muted-foreground'
                }`}>
                  {dias < 0
                    ? `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`
                    : dias === 0
                    ? 'Vence hoy'
                    : `En ${dias} día${dias !== 1 ? 's' : ''}`
                  }
                </p>
              )}
            </div>
          </div>

          {/* Área de acción */}
          {resultadoEnvio === 'exito' && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-green-700 mb-2">¡Trámite recibido!</h2>
              <p className="text-green-600 text-sm">
                Tu validación de supervivencia fue registrada correctamente. El personal la revisará en breve.
              </p>
              <button
                onClick={() => setResultadoEnvio(null)}
                className="mt-4 text-sm text-green-700 underline hover:no-underline"
              >
                Entendido
              </button>
            </div>
          )}

          {resultadoEnvio === 'fuera_periodo' && (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-center">
              <div className="text-5xl mb-3">📋</div>
              <h2 className="mb-2">Trámite registrado fuera del periodo</h2>
              <p className="text-muted-foreground text-sm">
                Tu solicitud fue registrada, pero está fuera del periodo habitual de validación. El personal administrativo la revisará y se comunicará contigo si es necesario.
              </p>
              <button
                onClick={() => setResultadoEnvio(null)}
                className="mt-4 text-sm text-muted-foreground underline hover:no-underline"
              >
                Entendido
              </button>
            </div>
          )}

          {!resultadoEnvio && puedeValidar && !mostrarFormulario && (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <FileCheck size={40} className="mx-auto mb-3 text-primary" />
              <h2 className="mb-2">Realizar validación de supervivencia</h2>
              <p className="text-muted-foreground text-sm mb-6">
                El trámite es sencillo: confirmas que te encuentras bien y, de forma opcional, adjuntas una fotografía reciente.
              </p>
              <button
                onClick={() => setMostrarFormulario(true)}
                className="w-full bg-primary text-primary-foreground py-4 rounded-xl text-base font-medium hover:opacity-90 transition-opacity"
              >
                Iniciar trámite
              </button>
            </div>
          )}

          {!resultadoEnvio && puedeValidar && mostrarFormulario && (
            <form
              onSubmit={handleEnviar}
              className="bg-card border border-border rounded-xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2>Trámite de supervivencia</h2>
                <button
                  type="button"
                  onClick={() => { setMostrarFormulario(false); limpiarFormulario() }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>

              {/* Paso 1: Confirmación obligatoria */}
              <div className={`rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                confirmado ? 'bg-green-50 border-green-300' : 'bg-card border-border hover:bg-accent/50'
              }`}
                onClick={() => setConfirmado(!confirmado)}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    confirmado ? 'bg-green-600 border-green-600' : 'border-border'
                  }`}>
                    {confirmado && <span className="text-white text-xs">✓</span>}
                  </div>
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">Confirmo que me encuentro con vida</span> y en pleno uso de mis facultades al día de hoy,{' '}
                    {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  </p>
                </div>
              </div>

              {/* Paso 2: Evidencia (opcional) */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fotografía reciente{' '}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Puedes adjuntar una foto tuya del día de hoy o un documento adicional. JPG, PNG o PDF — máximo {MAX_MB} MB.
                </p>

                <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  archivo ? 'border-green-400 bg-green-50' : 'border-border hover:bg-accent/50'
                }`}>
                  <input
                    ref={inputArchivoRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleArchivo}
                  />
                  {archivo ? (
                    <>
                      <Upload size={20} className="mb-2 text-green-600" />
                      <p className="text-sm font-medium text-green-700">{archivo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(archivo.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Toca aquí para seleccionar un archivo</p>
                    </>
                  )}
                </label>

                {errorArchivo && (
                  <p className="text-destructive text-sm mt-2">{errorArchivo}</p>
                )}
                {archivo && (
                  <button
                    type="button"
                    onClick={() => { setArchivo(null); if (inputArchivoRef.current) inputArchivoRef.current.value = '' }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors mt-2"
                  >
                    Quitar archivo
                  </button>
                )}
              </div>

              {/* Paso 3: Observaciones (opcional) */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Observaciones{' '}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="¿Tienes algún comentario o nota para el personal?"
                  rows={3}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {errorEnvio && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive text-sm">
                  {errorEnvio}
                </div>
              )}

              <button
                type="submit"
                disabled={!confirmado || enviando}
                className="w-full bg-primary text-primary-foreground py-4 rounded-xl text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? 'Enviando trámite...' : 'Enviar validación de supervivencia'}
              </button>

              {!confirmado && (
                <p className="text-xs text-center text-muted-foreground">
                  Debes marcar la casilla de confirmación para continuar.
                </p>
              )}
            </form>
          )}

          {/* Estado "en revisión" — ya envió, esperando */}
          {!resultadoEnvio && pensionado.estado_validacion === 'en_revision' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <RefreshCw size={36} className="mx-auto mb-3 text-blue-500" />
              <h2 className="mb-1 text-blue-700">Trámite en revisión</h2>
              <p className="text-blue-600 text-sm">
                Tu validación de supervivencia fue recibida y está siendo revisada por el personal encargado.
                No necesitas hacer nada más por ahora.
              </p>
            </div>
          )}

          {/* Estado "vigente" — no es momento */}
          {!resultadoEnvio && pensionado.estado_validacion === 'vigente' && (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <CheckCircle size={36} className="mx-auto mb-3 text-green-500" />
              <h2 className="mb-1">Todo en orden</h2>
              <p className="text-muted-foreground text-sm">
                Tu próximo trámite de supervivencia estará disponible{' '}
                {dias !== null && dias > 0
                  ? `en ${dias} día${dias !== 1 ? 's' : ''}, a partir del ${formatearFecha(
                      pensionado.fecha_proxima_validacion
                        ? new Date(
                            new Date(pensionado.fecha_proxima_validacion).getTime() - 15 * 86_400_000
                          ).toISOString()
                        : null
                    )}`
                  : `próximamente`
                }.
              </p>
            </div>
          )}

          {/* Estado "sin_fecha" */}
          {!resultadoEnvio && pensionado.estado_validacion === 'sin_fecha' && (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <CalendarDays size={36} className="mx-auto mb-3 text-muted-foreground" />
              <h2 className="mb-1">Sin fecha programada</h2>
              <p className="text-muted-foreground text-sm">
                Aún no tienes una fecha de validación asignada. Comunícate con el área administrativa para recibir orientación.
              </p>
            </div>
          )}

          {/* Historial de validaciones */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setMostrarHistorial(!mostrarHistorial)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors"
            >
              <h2 className="text-base">Historial de validaciones</h2>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>{validaciones.length} registro{validaciones.length !== 1 ? 's' : ''}</span>
                {mostrarHistorial ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {mostrarHistorial && (
              validaciones.length === 0 ? (
                <div className="px-6 pb-6 text-center text-muted-foreground text-sm">
                  No hay validaciones registradas aún.
                </div>
              ) : (
                <div className="overflow-x-auto border-t border-border">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm">Fecha</th>
                        <th className="px-6 py-3 text-left text-sm">Resultado</th>
                        <th className="px-6 py-3 text-left text-sm">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validaciones.map(v => {
                        const badge = RESULTADO_BADGE[v.resultado] ?? { label: v.resultado, clase: 'bg-gray-100 text-gray-600' }
                        return (
                          <tr key={v.id} className="border-t border-border">
                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                              {new Date(v.fecha_validacion).toLocaleDateString('es-MX', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.clase}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {v.observaciones
                                ? v.observaciones.replace(/\[Sistema:.*?\]/g, '').trim() || '—'
                                : '—'
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* Botón actualizar */}
          <div className="flex justify-center pb-6">
            <button
              onClick={cargarDatos}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw size={14} />
              Actualizar información
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}