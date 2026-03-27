import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, AsyncStorage } from './api';

type User = {
  user_id: string;
  email: string;
  name: string;
  role: 'admin' | 'mentor' | 'student';
  phone?: string;
  batch?: string;
  course?: string;
  exam_year?: string;
  optional_subject?: string;
  profile_photo_url?: string;
  is_active: boolean;
  mentor?: any;
  mentee_count?: number;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (role: string) => Promise<void>;
  loginWithSession: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  loginWithSession: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (role: string) => {
    const data = await api.demoLogin(role);
    if (data.session_token) {
      await AsyncStorage.setItem('session_token', data.session_token);
    }
    setUser(data.user);
  };

  const loginWithSession = async (sessionId: string) => {
    const data = await api.exchangeSession(sessionId);
    if (data.session_token) {
      await AsyncStorage.setItem('session_token', data.session_token);
    }
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    await AsyncStorage.removeItem('session_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithSession, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
