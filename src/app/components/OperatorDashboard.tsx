import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Search } from 'lucide-react';

const sidebarItems = [
  { label: 'Pensionados', icon: '👴' },
  { label: 'Validaciones pendientes', icon: '⏳' },
];

const pensionadosData = [
  {
    nombre: 'Juan Pérez García',
    curp: 'PEGJ750815HDFRRL01',
    numero: 'P-2024-001',
    estado: 'Vigente',
    estadoColor: 'bg-green-100 text-green-800',
    proximaValidacion: '2026-10-15',
    ultimaValidacion: '2025-10-15',
  },
  {
    nombre: 'María López Rodríguez',
    curp: 'LORM820520MDFRRD05',
    numero: 'P-2024-002',
    estado: 'Próximo a vencer',
    estadoColor: 'bg-yellow-100 text-yellow-800',
    proximaValidacion: '2026-05-20',
    ultimaValidacion: '2025-05-20',
  },
  {
    nombre: 'Carlos Ramírez Sánchez',
    curp: 'RASC790312HDFRRL03',
    numero: 'P-2024-003',
    estado: 'En revisión',
    estadoColor: 'bg-blue-100 text-blue-800',
    proximaValidacion: '2026-08-10',
    ultimaValidacion: '2025-08-10',
  },
  {
    nombre: 'Ana Martínez Flores',
    curp: 'MAFA850925MDFRRL07',
    numero: 'P-2024-004',
    estado: 'Vencido',
    estadoColor: 'bg-red-100 text-red-800',
    proximaValidacion: '2026-03-01',
    ultimaValidacion: '2025-03-01',
  },
];

export default function OperatorDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');

  const filteredData = pensionadosData.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.curp.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterEstado === 'Todos' || p.estado === filterEstado;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-screen flex flex-col">
      <Navbar
        userName="Operador"
        userRole="Operador"
        roleColor="bg-blue-100 text-blue-800"
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={sidebarItems} activeIndex={0} />

        <main className="flex-1 overflow-y-auto p-8">
          <h1 className="mb-8">Gestión de Pensionados</h1>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o CURP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option>Todos</option>
              <option>Vigente</option>
              <option>Próximo a vencer</option>
              <option>En revisión</option>
              <option>Vencido</option>
            </select>
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
                    <th className="px-6 py-4 text-left">Última validación</th>
                    <th className="px-6 py-4 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((pensionado, index) => (
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
                      <td className="px-6 py-4 text-muted-foreground">{pensionado.ultimaValidacion}</td>
                      <td className="px-6 py-4">
                        <button className="text-primary hover:underline mr-3">Revisar</button>
                        <button className="text-primary hover:underline">Validar</button>
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
