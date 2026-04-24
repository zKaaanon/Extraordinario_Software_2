import { useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';

interface NavbarProps {
  userName: string;
  userRole: string;
  roleColor?: string;
}

export default function Navbar({ userName, userRole, roleColor = 'bg-blue-100 text-blue-800' }: NavbarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <nav className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏛️</span>
        <span>SistemaPensionados</span>
      </div>

      <div className="flex items-center gap-4">
        <span>{userName}</span>
        <span className={`px-3 py-1 rounded-full text-sm ${roleColor}`}>
          {userRole}
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
