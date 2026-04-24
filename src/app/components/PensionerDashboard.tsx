import Navbar from './Navbar';
import { CalendarDays, CheckCircle, Clock } from 'lucide-react';

const historialValidaciones = [
  {
    fecha: '2025-10-15',
    resultado: 'Aprobada',
    observaciones: 'Validación exitosa',
  },
  {
    fecha: '2024-10-15',
    resultado: 'Aprobada',
    observaciones: 'Documentación completa',
  },
  {
    fecha: '2023-10-15',
    resultado: 'Aprobada',
    observaciones: 'Sin observaciones',
  },
];

export default function PensionerDashboard() {
  const estadoActual = 'Vigente';
  const ultimaValidacion = '2025-10-15';
  const proximaValidacion = '2026-10-15';
  const puedeValidar = false;
  const fechaDisponible = '2026-09-15';

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar
        userName="Juan Pérez García"
        userRole="Pensionado"
        roleColor="bg-green-100 text-green-800"
      />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="mb-8">Bienvenido, Juan</h1>

          <div className="bg-card border border-border rounded-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2>Estado Actual</h2>
              <span className="px-4 py-2 rounded-full bg-green-100 text-green-800">
                {estadoActual}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle size={20} className="text-green-600" />
              <span>Tu pensión está activa y vigente</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <CalendarDays size={20} />
                </div>
                <h3>Última validación</h3>
              </div>
              <p className="text-2xl">{ultimaValidacion}</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <h3>Próxima validación</h3>
              </div>
              <p className="text-2xl">{proximaValidacion}</p>
            </div>
          </div>

          {puedeValidar ? (
            <button className="w-full bg-primary text-primary-foreground py-4 rounded-lg hover:opacity-90 transition-opacity mb-6">
              Realizar validación
            </button>
          ) : (
            <div className="bg-muted border border-border rounded-lg p-6 mb-6 text-center">
              <p className="text-muted-foreground mb-2">
                Tu próxima validación estará disponible a partir del
              </p>
              <p className="text-lg">{fechaDisponible}</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2>Historial de validaciones</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left">Fecha</th>
                    <th className="px-6 py-3 text-left">Resultado</th>
                    <th className="px-6 py-3 text-left">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historialValidaciones.map((validacion, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="px-6 py-4">{validacion.fecha}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                          {validacion.resultado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{validacion.observaciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
