import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './components/Dashboard';
import SlabEntry from './components/forms/SlabEntry';
import SlabList from './components/pages/SlabList';
import Reports from './components/reports/Reports';
import { apiService } from './services/api';

interface AuthProviderProps {
  children: ReactNode;
}
type User = { username: string } | null;

const AuthContext = createContext<{
  user: User;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
} | null>(null);

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = apiService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ username: payload.username });
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiService.login(username, password);
    apiService.setToken(res.token);
    setUser({ username: res.user.username });
  };
  const logout = () => {
    apiService.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function Login() {
  const { login, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.username === 'admin') navigate('/');
      else navigate('/entry');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      // Navigation will be handled by useEffect
    } catch (err) {
      setError('Invalid username or password');
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96 space-y-4">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        {error && <div className="text-red-600">{error}</div>}
        <input className="input-field w-full" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="input-field w-full" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn-primary w-full" type="submit">Login</button>
      </form>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/slabs" element={<RequireAuth><SlabList /></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
            <Route path="/entry" element={<RequireAuth><SlabEntry /></RequireAuth>} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App; 