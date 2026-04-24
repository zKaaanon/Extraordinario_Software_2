import Navbar from './Navbar';
import Sidebar from './Sidebar';
import StatsCard from './StatsCard';

const sidebarItems = [
  { label: 'Dashboard', icon: '📊' },
  { label: 'Usuarios', icon: '👥' },
  { label: 'Pensionados', icon: '👴' },
  { label: 'Configuración', icon: '⚙️' },
  { label: 'Bitácora', icon: '📋' },
];

const pensionadosData = [
  {
    nombre: 'Juan Pérez García',
    curp: 'PEGJ750815HDFRRL01',
    numero: 'P-2024-001',
    estado: 'Vigente',
    estadoColor: 'bg-green-100 text-green-800',
    proximaValidacion: '2026-10-15',
  },
  {
    nombre: 'María López Rodríguez',
    curp: 'LORM820520MDFRRD05',
    numero: 'P-2024-002',
    estado: 'Próximo a vencer',
    estadoColor: 'bg-yellow-100 text-yellow-800',
    proximaValidacion: '2026-05-20',
  },
  {
    nombre: 'Carlos Ramírez Sánchez',
    curp: 'RASC790312HDFRRL03',
    numero: 'P-2024-003',
    estado: 'Vencido',
    estadoColor: 'bg-red-100 text-red-800',
    proximaValidacion: '2026-03-10',
  },
  {
    nombre: 'Ana Martínez Flores',
    curp: 'MAFA850925MDFRRL07',
    numero: 'P-2024-004',
    estado: 'Vigente',
    estadoColor: 'bg-green-100 text-green-800',
    proximaValidacion: '2026-12-01',
  },
];

export default function AdminDashboard() {
  return (
    <div className="h-screen flex flex-col">
      <Navbar
        userName="Administrador"
        userRole="Administrador"
        roleColor="bg-purple-100 text-purple-800"
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={sidebarItems} activeIndex={0} />

        <main className="flex-1 overflow-y-auto p-8">
          <h1 className="mb-8">Dashboard</h1>

          <div className="grid grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total pensionados"
              value={324}
              icon="👥"
              bgColor="bg-blue-100"
              textColor="text-blue-600"
            />
            <StatsCard
              title="Vigentes"
              value={285}
              icon="✅"
              bgColor="bg-green-100"
              textColor="text-green-600"
            />
            <StatsCard
              title="Próximos a vencer"
              value={28}
              icon="⚠️"
              bgColor="bg-yellow-100"
              textColor="text-yellow-600"
            />
            <StatsCard
              title="Vencidos"
              value={11}
              icon="❌"
              bgColor="bg-red-100"
              textColor="text-red-600"
            />
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-4 text-left">Nombre completo</th>
                    <th className="px-6 py-4 text-left">CURP</th>
                    <th className="px-6 py-4 text-left">Número pensionado</th>
                    <th className="px-6 py-4 text-left">Estado</th>
                    <th className="px-6 py-4 text-left">Fecha próx. validación</th>
                    <th className="px-6 py-4 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pensionadosData.map((pensionado, index) => (
                    <tr key={index} className="border-t border-border hover:bg-accent/50">
                      <td className="px-6 py-4">{pensionado.nombre}</td>
                      <td className="px-6 py-4 text-muted-foreground">{pensionado.curp}</td>
                      <td className="px-6 py-4">{pensionado.numero}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${pensionado.estadoColor}`}>
                          {pensionado.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">{pensionado.proximaValidacion}</td>
                      <td className="px-6 py-4">
                        <button className="text-primary hover:underline">Ver detalles</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
