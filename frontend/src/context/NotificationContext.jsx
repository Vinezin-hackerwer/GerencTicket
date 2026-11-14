import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token, mustChangePassword } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!token || mustChangePassword) return;
    try {
      const res = await apiRequest('/notifications/unread-count');
      setUnreadCount(res.count);
    } catch (err) {
      // Ignore polling errors
    }
  }, [token, mustChangePassword]);

  const fetchNotifications = useCallback(async () => {
    if (!token || mustChangePassword) return;
    try {
      const res = await apiRequest('/notifications');
      setNotifications(res.notifications);
    } catch (err) {
      // Ignore
    }
  }, [token, mustChangePassword]);

  useEffect(() => {
    if (!token || mustChangePassword) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    fetchNotifications();

    // 30 seconds polling
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (isOpen) {
        fetchNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [token, mustChangePassword, isOpen, fetchUnreadCount, fetchNotifications]);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(prev => !prev);
  };

  const closeDropdown = () => setIsOpen(false);

  const markAsRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        toggleDropdown,
        closeDropdown,
        markAsRead,
        markAllAsRead,
        refresh: () => {
          fetchUnreadCount();
          fetchNotifications();
        }
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
