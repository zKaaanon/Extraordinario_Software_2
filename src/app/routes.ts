import { createBrowserRouter } from "react-router";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import OperatorDashboard from "./components/OperatorDashboard";
import PensionerDashboard from "./components/PensionerDashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/admin",
    Component: AdminDashboard,
  },
  {
    path: "/operador",
    Component: OperatorDashboard,
  },
  {
    path: "/pensionado",
    Component: PensionerDashboard,
  },
]);
