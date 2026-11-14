import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('helpdesk_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('helpdesk_token') || null);
  const [loading, setLoading] = useState(true);

  const mustChangePassword = Boolean(user && user.must_change_password === 1);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const res = await apiRequest('/auth/me');
          setUser(res.user);
          localStorage.setItem('helpdesk_user', JSON.stringify(res.user));
        } catch (err) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('helpdesk_token');
          localStorage.removeItem('helpdesk_user');
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, [token]);

  const login = async (username, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('helpdesk_token', res.token);
    localStorage.setItem('helpdesk_user', JSON.stringify(res.user));

    return res.user;
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('/auth/logout', { method: 'POST' });
      }
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('helpdesk_token');
      localStorage.removeItem('helpdesk_user');
    }
  };

  const changePassword = async (newPassword, confirmPassword) => {
    const res = await apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, confirmPassword })
    });

    const updatedUser = { ...user, must_change_password: 0 };
    setUser(updatedUser);
    localStorage.setItem('helpdesk_user', JSON.stringify(updatedUser));
    return res;
  };

  const requestPasswordReset = async (username) => {
    return await apiRequest('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
  };

  const value = {
    user,
    token,
    loading,
    mustChangePassword,
    login,
    logout,
    changePassword,
    requestPasswordReset,
    isAdmin: user?.role === 'admin',
    isTechnician: user?.role === 'tecnico',
    isUser: user?.role === 'usuario'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
