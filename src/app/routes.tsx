import { createBrowserRouter } from 'react-router'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import OperatorDashboard from './components/OperatorDashboard'
import PensionerDashboard from './components/PensionerDashboard'
import RutaProtegida from './components/RutaProtegida'
import GestionUsuarios from './components/GestionUsuarios'


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
{
  path: '/admin/usuarios',
  element: (
    <RutaProtegida rol="admin">
      <GestionUsuarios />
    </RutaProtegida>
  ),
},
])