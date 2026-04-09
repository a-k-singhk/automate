import { createContext, useContext, useState, useCallback } from 'react';
import {
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  login as apiLogin,
  register as apiRegister,
} from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setTokenState] = useState(getToken);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    setToken(data.token);
    setStoredUser(data.user);
    setTokenState(data.token);
    setUser(data.user);
    return data;
  }, []);

  const registerUser = useCallback(async (username, password) => {
    const data = await apiRegister(username, password);
    setToken(data.token);
    setStoredUser(data.user);
    setTokenState(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    removeToken();
    removeStoredUser();
    setTokenState(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, registerUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
