import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, Lock, User, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset request state
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { login, requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(username, password);
      if (loggedUser.must_change_password === 1) {
        navigate('/force-password-change');
      } else {
        if (loggedUser.role === 'admin' || loggedUser.role === 'tecnico') {
          navigate('/tickets/unassigned');
        } else {
          navigate('/tickets');
        }
      }
    } catch (err) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);

    try {
      const res = await requestPasswordReset(resetUsername);
      setResetMessage(res.message);
      setResetUsername('');
    } catch (err) {
      setResetError(err.message || 'Erro ao solicitar redefinição.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#eff6ff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem'
          }}>
            <Ticket size={28} color="#2563eb" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
            Helpdesk Tickets
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
            {isResetMode
              ? 'Solicite a um administrador a troca da sua senha'
              : 'Acesse o sistema com suas credenciais'}
          </p>
        </div>

        {!isResetMode ? (
          <form onSubmit={handleLogin}>
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Usuário</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu nome de usuário"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.7rem' }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
            </button>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(true);
                  setError('');
                }}
                style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 500 }}
              >
                Esqueceu a senha? Solicitar troca da senha
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRequestReset}>
            {resetError && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{resetError}</span>
              </div>
            )}

            {resetMessage && (
              <div className="alert alert-success">
                <CheckCircle2 size={18} />
                <span>{resetMessage}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Nome de Usuário</label>
              <input
                type="text"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                placeholder="Informe seu usuário cadastrado"
                required
                autoFocus
              />
              <span className="form-helper">
                Uma notificação será enviada diretamente a todos os administradores.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.7rem' }}
              disabled={resetLoading}
            >
              {resetLoading ? 'Enviando solicitação...' : 'Enviar Solicitação aos Admins'}
            </button>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setResetError('');
                  setResetMessage('');
                }}
                className="btn btn-secondary btn-sm"
              >
                <ArrowLeft size={16} /> Voltar ao Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
