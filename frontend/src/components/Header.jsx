import React, { useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, LogOut, CheckCheck, Ticket, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    isOpen,
    toggleDropdown,
    closeDropdown,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown]);

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    if (notif.related_ticket_id) {
      navigate(`/tickets/${notif.related_ticket_id}`);
      closeDropdown();
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'tecnico': return 'Técnico';
      case 'usuario': return 'Usuário';
      default: return role;
    }
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <Ticket size={24} color="#2563eb" />
        <span>Helpdesk Central</span>
      </div>

      <div className="header-actions">
        {/* Notification Bell */}
        <div className="notification-wrapper" ref={dropdownRef}>
          <button
            className="bell-btn"
            onClick={toggleDropdown}
            title="Notificações"
            aria-label="Notificações"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="unread-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="notification-dropdown">
              <div className="notif-header">
                <h4>Notificações ({unreadCount} não lidas)</h4>
                {unreadCount > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={markAllAsRead}
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    <CheckCheck size={14} /> Marcar todas
                  </button>
                )}
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">Nenhuma notificação no momento.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                      style={{ cursor: n.related_ticket_id ? 'pointer' : 'default' }}
                    >
                      <div className="notif-content">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-message">{n.message}</div>
                        <div className="notif-time">
                          {new Date(n.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      {!n.read && (
                        <button
                          className="btn btn-sm"
                          style={{ padding: '0.2rem', color: '#64748b' }}
                          title="Marcar como lida"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                        >
                          <CheckCheck size={16} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569'
          }}>
            <UserIcon size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.name}</div>
            <span className={`badge badge-role-${user?.role}`}>
              {getRoleLabel(user?.role)}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={logout}
          title="Encerrar Sessão"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.5rem' }}
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
}
