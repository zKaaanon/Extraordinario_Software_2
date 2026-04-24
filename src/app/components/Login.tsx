import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email === 'admin@sistema.com' && password === 'admin123') {
      navigate('/admin');
    } else if (email === 'operador@sistema.com' && password === 'operador123') {
      navigate('/operador');
    } else if (email === 'pensionado@sistema.com' && password === 'pensionado123') {
      navigate('/pensionado');
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="h-screen w-full flex">
      <div className="w-1/2 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">🏛️</div>
        </div>
      </div>

      <div className="w-1/2 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="mb-2">SistemaPensionados</h1>
            <p className="text-muted-foreground">Accede a tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Iniciar sesión
            </button>

            {error && (
              <p className="text-destructive text-center">{error}</p>
            )}
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            <p>Cuentas de prueba:</p>
            <p>Admin: admin@sistema.com / admin123</p>
            <p>Operador: operador@sistema.com / operador123</p>
            <p>Pensionado: pensionado@sistema.com / pensionado123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
