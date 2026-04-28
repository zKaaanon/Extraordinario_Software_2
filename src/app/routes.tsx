import { createBrowserRouter } from 'react-router'
import Login from './components/Login'
import RutaProtegida from './components/RutaProtegida'

// ── Admin
import AdminDashboard from './components/AdminDashboard'
import GestionUsuarios from './components/GestionUsuarios'
import ListaPensionados from './components/ListaPensionados'
import AltaPensionado from './components/AltaPensionado'
import ExpedientePensionado from './components/ExpedientePensionado'
import ValidacionesPendientes from './components/ValidacionesPendientes'
import Configuracion from './components/Configuracion'
import Bitacora from './components/Bitacora'

// ── Operador
import OperatorDashboard from './components/OperatorDashboard'
import ExpedienteOperador from './components/ExpedienteOperador'
import ValidacionesOperador from './components/ValidacionesOperador'

// ── Pensionado
import PensionerDashboard from './components/PensionerDashboard'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Login,
  },
  {
    path: '/admin',
    element: (
      <RutaProtegida rol="admin">
        <AdminDashboard />
      </RutaProtegida>
    ),
  },
  {
    path: '/admin/usuarios',
    element: (
      <RutaProtegida rol="admin">
        <GestionUsuarios />
      </RutaProtegida>
    ),
  },
  {
    path: '/admin/pensionados',
    element: (
      <RutaProtegida rol="admin">
        <ListaPensionados />
      </RutaProtegida>
    ),
  },
  {
    path: '/admin/pensionados/alta',
    element: (
      <RutaProtegida rol="admin">
        <AltaPensionado />
      </RutaProtegida>
    ),
  },
  {
    path: '/admin/pensionados/:id',
    element: (
      <RutaProtegida rol="admin">
        <ExpedientePensionado />
      </RutaProtegida>
    ),
  },
  {
    path: '/admin/validaciones',
    element: (
      <RutaProtegida rol="admin">
        <ValidacionesPendientes />
      </RutaProtegida>
    ),
  },
  {
    path: '/admin/bitacora',
    element: (
      <RutaProtegida rol="admin">
        <Bitacora />
      </RutaProtegida>
    ),
  },
  {
    path: '/admin/configuracion',
    element: (
      <RutaProtegida rol="admin">
        <Configuracion />
      </RutaProtegida>
    ),
  },
  {
    path: '/operador',
    element: (
      <RutaProtegida rol="operador">
        <OperatorDashboard />
      </RutaProtegida>
    ),
  },
  {
    path: '/operador/pensionados/:id',
    element: (
      <RutaProtegida rol="operador">
        <ExpedienteOperador />
      </RutaProtegida>
    ),
  },
  {
    path: '/operador/validaciones',
    element: (
      <RutaProtegida rol="operador">
        <ValidacionesOperador />
      </RutaProtegida>
    ),
  },
  {
    path: '/pensionado',
    element: (
      <RutaProtegida rol="pensionado">
        <PensionerDashboard />
      </RutaProtegida>
    ),
  },
])