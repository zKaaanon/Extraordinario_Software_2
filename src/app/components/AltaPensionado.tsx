import { useState } from 'react'
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

const FORM_VACIO = {
  nombre_completo:    '',
  curp:               '',
  numero_pensionado:  '',
  fecha_nacimiento:   '',
  telefono:           '',
  correo:             '',
  password:           '',
  domicilio:          '',
  fecha_inicio_pension: '',
}

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_MB = 5

export default function AltaPensionado() {
  const navigate = useNavigate()
  const [form, setForm]           = useState(FORM_VACIO)
  const [archivo, setArchivo]     = useState<File | null>(null)
  const [errorArchivo, setErrorArchivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const [paso, setPaso]           = useState<'formulario' | 'exito'>('formulario')
  const [pensionadoId, setPensionadoId] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validaciones básicas
    if (!archivo) {
      setError('La credencial del pensionado es obligatoria.')
      return
    }
    if (form.curp.length !== 18) {
      setError('El CURP debe tener exactamente 18 caracteres.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setGuardando(true)

    try {
      // 1. Crear pensionado vía Edge Function
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('crear-pensionado', {
        body: {
          nombre_completo:     form.nombre_completo.trim(),
          curp:                form.curp.trim().toUpperCase(),
          numero_pensionado:   form.numero_pensionado.trim(),
          fecha_nacimiento:    form.fecha_nacimiento,
          telefono:            form.telefono.trim(),
          correo:              form.correo.trim(),
          password:            form.password,
          domicilio:           form.domicilio.trim(),
          fecha_inicio_pension: form.fecha_inicio_pension,
        }
      })

      if (fnErr) {
        setError('Error al registrar: ' + fnErr.message)
        return
      }

      const { pensionado_id } = fnData
      setPensionadoId(pensionado_id)

      // 2. Subir credencial a Storage
      const ext      = archivo.name.split('.').pop()
      const rutaBlob = `${pensionado_id}/credencial.${ext}`

      const { error: storageErr } = await supabase.storage
        .from('documentos')
        .upload(rutaBlob, archivo, { upsert: true })

      if (storageErr) {
        setError('Pensionado creado pero hubo un error al subir la credencial: ' + storageErr.message)
        return
      }

      // 3. Registrar documento en tabla documentos
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(rutaBlob)

      await supabase.from('documentos').insert({
        pensionado_id:  pensionado_id,
        tipo_documento: 'credencial',
        nombre_archivo: archivo.name,
        ruta_archivo:   urlData.publicUrl,
      })

      // 4. Bitácora
      await supabase.rpc('registrar_bitacora', {
        p_accion:      'alta_pensionado',
        p_tabla:       'pensionados',
        p_registro_id: pensionado_id,
        p_descripcion: `Alta de pensionado: ${form.nombre_completo} | CURP: ${form.curp.toUpperCase()}`,
      })

      setPaso('exito')

    } catch (err) {
      console.error(err)
      setError('Error inesperado. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (paso === 'exito') {
    return (
      <div className="h-screen flex flex-col">
        <Navbar roleColor="bg-purple-100 text-purple-800" />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            items={sidebarItems}
            activeIndex={2}
            onItemClick={(i) => {
              if (i === 0) navigate('/admin')
              if (i === 1) navigate('/admin/usuarios')
            }}
          />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="bg-card border border-border rounded-xl p-10 max-w-md w-full text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="mb-2">Pensionado registrado</h2>
              <p className="text-muted-foreground text-sm mb-2">
                El expediente fue creado exitosamente y la credencial fue cargada.
              </p>
              <p className="text-xs text-muted-foreground font-mono mb-6">ID: {pensionadoId}</p>
              <p className="text-sm text-muted-foreground mb-6">
                Las credenciales de acceso pueden ser compartidas con el pensionado de forma privada:
                <br />
                <span className="font-medium text-foreground">{form.correo}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setForm(FORM_VACIO); setArchivo(null); setPaso('formulario') }}
                  className="flex-1 border border-border px-4 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                >
                  Registrar otro
                </button>
                <button
                  onClick={() => navigate('/admin/pensionados')}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
                >
                  Ver pensionados
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <Navbar roleColor="bg-purple-100 text-purple-800" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={sidebarItems}
          activeIndex={2}
          onItemClick={(i) => {
            if (i === 0) navigate('/admin')
            if (i === 1) navigate('/admin/usuarios')
            if (i === 2) navigate('/admin/pensionados')
            if (i === 3) navigate('/admin/configuracion')
            if (i === 4) navigate('/admin/bitacora')
          }}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => navigate('/admin/pensionados')}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              ← Volver
            </button>
            <h1>Registrar pensionado</h1>
          </div>

          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

            {/* Datos personales */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="text-base font-medium mb-2">Datos personales</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm mb-1">Nombre completo <span className="text-destructive">*</span></label>
                  <input name="nombre_completo" value={form.nombre_completo} onChange={handleChange}
                    required className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Apellido Apellido Nombre" />
                </div>

                <div>
                  <label className="block text-sm mb-1">CURP <span className="text-destructive">*</span></label>
                  <input name="curp" value={form.curp} onChange={handleChange}
                    required maxLength={18}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="18 caracteres" />
                </div>

                <div>
                  <label className="block text-sm mb-1">Número de pensionado <span className="text-destructive">*</span></label>
                  <input name="numero_pensionado" value={form.numero_pensionado} onChange={handleChange}
                    required className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="P-2024-001" />
                </div>

                <div>
                  <label className="block text-sm mb-1">Fecha de nacimiento <span className="text-destructive">*</span></label>
                  <input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange}
                    required className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>

                <div>
                  <label className="block text-sm mb-1">Teléfono</label>
                  <input name="telefono" value={form.telefono} onChange={handleChange}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="10 dígitos" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm mb-1">Domicilio</label>
                  <input name="domicilio" value={form.domicilio} onChange={handleChange}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Calle, número, colonia, municipio" />
                </div>

                <div>
                  <label className="block text-sm mb-1">Fecha inicio de pensión <span className="text-destructive">*</span></label>
                  <input name="fecha_inicio_pension" type="date" value={form.fecha_inicio_pension} onChange={handleChange}
                    required className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>

            {/* Acceso al sistema */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="text-base font-medium mb-2">Acceso al sistema</h2>
              <p className="text-xs text-muted-foreground -mt-2">
                Estas credenciales se compartirán al pensionado de forma privada.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Correo electrónico <span className="text-destructive">*</span></label>
                  <input name="correo" type="email" value={form.correo} onChange={handleChange}
                    required className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="correo@ejemplo.com" />
                </div>

                <div>
                  <label className="block text-sm mb-1">Contraseña temporal <span className="text-destructive">*</span></label>
                  <input name="password" type="password" value={form.password} onChange={handleChange}
                    required className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Mínimo 8 caracteres" />
                </div>
              </div>
            </div>

            {/* Credencial */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-base font-medium mb-1">Credencial oficial <span className="text-destructive">*</span></h2>
              <p className="text-xs text-muted-foreground mb-4">JPG, PNG o PDF — máximo 5 MB</p>

              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                archivo ? 'border-green-400 bg-green-50' : 'border-border hover:bg-accent/50'
              }`}>
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleArchivo} />
                {archivo ? (
                  <>
                    <span className="text-2xl mb-1">📎</span>
                    <span className="text-sm font-medium text-green-700">{archivo.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(archivo.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl mb-1">📁</span>
                    <span className="text-sm text-muted-foreground">Haz clic para seleccionar el archivo</span>
                  </>
                )}
              </label>

              {errorArchivo && <p className="text-destructive text-sm mt-2">{errorArchivo}</p>}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pb-8">
              <button
                type="button"
                onClick={() => navigate('/admin/pensionados')}
                className="flex-1 border border-border px-4 py-3 rounded-lg text-sm hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {guardando ? 'Registrando...' : 'Registrar pensionado'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}