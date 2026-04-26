import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const sidebarItems = [
  { label: 'Dashboard',     icon: '📊' },
  { label: 'Usuarios',      icon: '👥' },
  { label: 'Pensionados',   icon: '👴' },
  { label: 'Configuración', icon: '⚙️' },
  { label: 'Bitácora',      icon: '📋' },
]

interface Config {
  id: string
  periodicidad_dias: number
  dias_anticipacion: number
  dias_tolerancia: number
  recordatorios_activos: boolean
  updated_at: string
}

const OPCIONES_PERIODICIDAD = [30, 60, 90, 120, 180, 365]

export default function Configuracion() {
  const navigate  = useNavigate()
  const { usuario } = useAuth()

  const [config, setConfig]       = useState<Config | null>(null)
  const [form, setForm]           = useState({ periodicidad_dias: 90, dias_anticipacion: 15, dias_tolerancia: 5, recordatorios_activos: false })
  const [cargando, setCargando]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje]     = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [editando, setEditando]   = useState(false)

  useEffect(() => { cargarConfig() }, [])

  async function cargarConfig() {
    setCargando(true)
    const { data } = await supabase.from('configuracion').select('*').single()
    if (data) {
      setConfig(data)
      setForm({
        periodicidad_dias:     data.periodicidad_dias,
        dias_anticipacion:     data.dias_anticipacion,
        dias_tolerancia:       data.dias_tolerancia,
        recordatorios_activos: data.recordatorios_activos,
      })
    }
    setCargando(false)
  }

  async function guardar() {
    if (!config) return
    setGuardando(true)
    setMensaje(null)

    const { error } = await supabase
      .from('configuracion')
      .update({
        periodicidad_dias:     form.periodicidad_dias,
        dias_anticipacion:     form.dias_anticipacion,
        dias_tolerancia:       form.dias_tolerancia,
        recordatorios_activos: form.recordatorios_activos,
        actualizado_por:       usuario?.id,
      })
      .eq('id', config.id)

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar: ' + error.message })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Configuración actualizada correctamente.' })
      setEditando(false)
      cargarConfig()
    }
    setGuardando(false)
  }

  function cancelar() {
    if (config) {
      setForm({
        periodicidad_dias:     config.periodicidad_dias,
        dias_anticipacion:     config.dias_anticipacion,
        dias_tolerancia:       config.dias_tolerancia,
        recordatorios_activos: config.recordatorios_activos,
      })
    }
    setEditando(false)
    setMensaje(null)
  }

  return (
    <div className="h-screen flex flex-col">
      <Navbar roleColor="bg-purple-100 text-purple-800" />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activeIndex={3}
          onItemClick={i => {
            if (i === 0) navigate('/admin')
            if (i === 1) navigate('/admin/usuarios')
            if (i === 2) navigate('/admin/pensionados')
            if (i === 3) navigate('/admin/configuracion')
            if (i === 4) navigate('/admin/bitacora')
          }}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <h1 className="mb-2">Configuración del sistema</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Parámetros globales que controlan el proceso de validación de supervivencia.
            Solo el administrador puede modificar estos valores.
          </p>

          {cargando ? (
            <div className="text-muted-foreground">Cargando configuración...</div>
          ) : (
            <div className="max-w-xl space-y-6">

              {/* Periodicidad */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-base mb-1">Periodicidad de validación</h2>
                    <p className="text-xs text-muted-foreground">
                      Cada cuántos días los pensionados deben realizar su validación de supervivencia.
                    </p>
                  </div>
                  {!editando && (
                    <button onClick={() => setEditando(true)} className="text-sm text-primary hover:underline">
                      Editar
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Intervalo en días</label>
                    {editando ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          {OPCIONES_PERIODICIDAD.map(dias => (
                            <button
                              key={dias}
                              onClick={() => setForm({ ...form, periodicidad_dias: dias })}
                              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                                form.periodicidad_dias === dias
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'border-border hover:bg-accent'
                              }`}
                            >
                              {dias} días
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-muted-foreground">O ingresa un valor:</span>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={form.periodicidad_dias}
                            onChange={e => setForm({ ...form, periodicidad_dias: Number(e.target.value) })}
                            className="w-24 px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-sm text-muted-foreground">días</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-2xl font-medium">{config?.periodicidad_dias} días</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Alertas */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-base mb-4">Alertas y tolerancias</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">
                      Días de anticipación para notificar
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Con cuántos días de anticipación el pensionado verá su validación como "Próxima a vencer".
                    </p>
                    {editando ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={form.dias_anticipacion}
                          onChange={e => setForm({ ...form, dias_anticipacion: Number(e.target.value) })}
                          className="w-24 px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">días antes</span>
                      </div>
                    ) : (
                      <p className="text-lg font-medium">{config?.dias_anticipacion} días antes</p>
                    )}
                  </div>

                  <div className="border-t border-border pt-4">
                    <label className="block text-sm mb-1">
                      Días de tolerancia tras vencimiento
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Margen de días después de la fecha límite antes de marcar como "Vencida".
                    </p>
                    {editando ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={form.dias_tolerancia}
                          onChange={e => setForm({ ...form, dias_tolerancia: Number(e.target.value) })}
                          className="w-24 px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">días de gracia</span>
                      </div>
                    ) : (
                      <p className="text-lg font-medium">{config?.dias_tolerancia} días de gracia</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen visual */}
              {!editando && config && (
                <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Resumen del ciclo actual</p>
                  <p>
                    El pensionado tiene <strong>{config.periodicidad_dias} días</strong> para validar.
                    El sistema muestra alerta <strong>{config.dias_anticipacion} días antes</strong>.
                    Tras el vencimiento hay <strong>{config.dias_tolerancia} días de tolerancia</strong>.
                  </p>
                  {config.updated_at && (
                    <p className="mt-2 text-xs">
                      Última actualización: {new Date(config.updated_at).toLocaleString('es-MX')}
                    </p>
                  )}
                </div>
              )}

              {/* Acciones */}
              {editando && (
                <div className="space-y-3">
                  {mensaje && (
                    <p className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-600' : 'text-destructive'}`}>
                      {mensaje.texto}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={cancelar}
                      className="flex-1 border border-border px-4 py-3 rounded-lg text-sm hover:bg-accent transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardar}
                      disabled={guardando}
                      className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {guardando ? 'Guardando...' : 'Guardar configuración'}
                    </button>
                  </div>
                </div>
              )}

              {!editando && mensaje && (
                <p className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-600' : 'text-destructive'}`}>
                  {mensaje.texto}
                </p>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  )
}