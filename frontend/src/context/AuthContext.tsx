import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
  is_active: boolean;
  last_login_at?: string | null;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data?.user) {
          setUser(body.data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (res.ok && body.success && body.data?.user) {
        setUser(body.data.user);
        return true;
      } else {
        setError(body.error?.message || 'Login failed.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to authentication server.');
      return false;
    }
  };

  const register = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (res.ok && body.success && body.data?.user) {
        setUser(body.data.user);
        return true;
      } else {
        setError(body.error?.message || 'Registration failed.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to authentication server.');
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
