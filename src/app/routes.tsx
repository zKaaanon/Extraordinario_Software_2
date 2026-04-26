import { createBrowserRouter } from 'react-router'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import OperatorDashboard from './components/OperatorDashboard'
import PensionerDashboard from './components/PensionerDashboard'
import RutaProtegida from './components/RutaProtegida'
import GestionUsuarios from './components/GestionUsuarios'
import ListaPensionados from './components/ListaPensionados'
import AltaPensionado from './components/AltaPensionado'
import ExpedientePensionado from './components/ExpedientePensionado'
import Bitacora from './components/Bitacora'
import Configuracion from './components/Configuracion'

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
    path: '/pensionado',
    element: (
      <RutaProtegida rol="pensionado">
        <PensionerDashboard />
      </RutaProtegida>
    ),
  },
])