import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './components/Dashboard';
import SlabEntry from './components/forms/SlabEntry';
import SlabList from './components/pages/SlabList';
import Reports from './components/reports/Reports';
import Login from './components/auth/Login';
import { apiService } from './services/api';

interface AuthProviderProps {
  children: ReactNode;
}

type UserRole = 'admin' | 'supervisor';

type User = { 
  username: string;
  role: UserRole;
} | null;

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
      // If we have a token, try to restore the session
      apiService.getCurrentUser()
        .then(userData => {
          setUser({
            username: userData.username,
            role: userData.role as UserRole
          });
        })
        .catch(() => {
          // If the token is invalid, clear it
          apiService.clearToken();
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiService.login(username, password);
    apiService.setToken(res.token);
    setUser({ 
      username: res.user.username, 
      role: res.user.role as UserRole 
    });
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

function RequireAuth({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // TEMPORARILY BYPASS AUTHENTICATION FOR DEVELOPMENT
  return <>{children}</>;

  // Original authentication logic commented out for development
  /*
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    // Force redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/entry" replace />;
  }

  return <>{children}</>;
  */
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <RequireAuth requireAdmin>
              <Layout>
                <Dashboard />
              </Layout>
            </RequireAuth>
          } />
          <Route path="/slabs" element={
            <RequireAuth requireAdmin>
              <Layout>
                <SlabList />
              </Layout>
            </RequireAuth>
          } />
          <Route path="/reports" element={
            <RequireAuth requireAdmin>
              <Layout>
                <Reports />
              </Layout>
            </RequireAuth>
          } />
          <Route path="/entry" element={
            <RequireAuth>
              <Layout>
                <SlabEntry />
              </Layout>
            </RequireAuth>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; 