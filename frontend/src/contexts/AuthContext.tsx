import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, authAPI, userAPI } from '../api/client';

export interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  users: User[];
  login: (username: string, password: string, totpCode: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // On mount: if a token exists in localStorage, validate it
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('expenso_auth_token');
      if (token) {
        try {
          // Verify token is still valid by calling /auth/me
          const meResponse = await authAPI.me();
          setUser(meResponse.data);
          setIsAuthenticated(true);

          // Fetch the user directory
          const usersResponse = await userAPI.list();
          setUsers(usersResponse.data);
        } catch (error) {
          // Token is invalid/expired, clear it
          localStorage.removeItem('expenso_auth_token');
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string, totpCode: string) => {
    try {
      const loginResponse = await authAPI.login({ username, password, totp_code: totpCode });
      const token = loginResponse.data.token;

      // Store token in localStorage
      localStorage.setItem('expenso_auth_token', token);

      // Fetch current user
      const meResponse = await authAPI.me();
      setUser(meResponse.data);
      setIsAuthenticated(true);

      // Fetch user directory
      const usersResponse = await userAPI.list();
      setUsers(usersResponse.data);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Logout might fail, but we still want to clear local state
    }
    localStorage.removeItem('expenso_auth_token');
    setIsAuthenticated(false);
    setUser(null);
    setUsers([]);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, users, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
