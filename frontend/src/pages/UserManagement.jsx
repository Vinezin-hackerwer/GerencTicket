import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Key, 
  Power, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Lock 
} from 'lucide-react';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('usuario');
  const [newTempPassword, setNewTempPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/users');
      setUsers(res.users);
    } catch (err) {
      setError(err.message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreateLoading(true);

    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername,
          name: newName,
          role: newRole,
          temporary_password: newTempPassword
        })
      });

      setSuccess(`Usuário "${newUsername}" criado com sucesso! Senha temporária configurada.`);
      setShowCreateModal(false);
      setNewUsername('');
      setNewName('');
      setNewRole('usuario');
      setNewTempPassword('');
      loadUsers();
    } catch (err) {
      setError(err.message || 'Erro ao criar usuário.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser) return;

    setError('');
    setSuccess('');
    setResetLoading(true);

    try {
      await apiRequest(`/users/${resetModalUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ temporary_password: tempPassword })
      });

      setSuccess(`Senha temporária definida para o usuário "${resetModalUser.username}". As sessões ativas dele foram invalidadas.`);
      setResetModalUser(null);
      setTempPassword('');
      loadUsers();
    } catch (err) {
      setError(err.message || 'Erro ao resetar senha.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleToggleActive = async (targetUser) => {
    setError('');
    setSuccess('');

    try {
      const res = await apiRequest(`/users/${targetUser.id}/toggle-active`, {
        method: 'PUT'
      });
      setSuccess(res.message);
      loadUsers();
    } catch (err) {
      setError(err.message || 'Erro ao alterar status do usuário.');
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
    <div>
      <div className="card-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="card-title" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} color="#2563eb" /> Gestão de Usuários
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
            Controle de contas, definição de perfis (Admin, Técnico, Usuário), redefinição de senhas temporárias e ativação/desativação.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateModal(true)}
          >
            <UserPlus size={16} /> Novo Usuário
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Carregando usuários...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Nome Completo</th>
                <th>Nome de Usuário</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Troca Obrigatória</th>
                <th>Criado em</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isCurrent = u.id === currentUser?.id;
                return (
                  <tr key={u.id} style={{ opacity: u.active === 1 ? 1 : 0.65 }}>
                    <td style={{ fontWeight: 600 }}>#{u.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      {isCurrent && (
                        <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>
                          (Você)
                        </span>
                      )}
                    </td>
                    <td>@{u.username}</td>
                    <td>
                      <span className={`badge badge-role-${u.role}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td>
                      {u.active === 1 ? (
                        <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                          Ativo
                        </span>
                      ) : (
                        <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                          Inativo
                        </span>
                      )}
                    </td>
                    <td>
                      {u.must_change_password === 1 ? (
                        <span className="badge" style={{ background: '#fef3c7', color: '#d97706' }}>
                          Pendente
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Concluída</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {/* Reset Password */}
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Resetar senha com senha temporária"
                          onClick={() => setResetModalUser(u)}
                        >
                          <Key size={14} /> Resetar Senha
                        </button>

                        {/* Toggle Active */}
                        <button
                          className={`btn btn-sm ${u.active === 1 ? 'btn-secondary' : 'btn-success'}`}
                          title={u.active === 1 ? 'Desativar usuário' : 'Ativar usuário'}
                          onClick={() => handleToggleActive(u)}
                          disabled={isCurrent}
                        >
                          <Power size={14} />
                          {u.active === 1 ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Criar Usuário */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cadastrar Novo Usuário</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ fontSize: '1.2rem' }}>&times;</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome Completo *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nome de Usuário (login) *</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ex: carlossilva"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Perfil de Acesso *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    required
                  >
                    <option value="usuario">Usuário (Apenas abre e acompanha seus tickets)</option>
                    <option value="tecnico">Técnico (Assume tickets e presta atendimento)</option>
                    <option value="admin">Administrador (Controle total do sistema)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Senha Temporária Inicial *</label>
                  <input
                    type="password"
                    value={newTempPassword}
                    onChange={(e) => setNewTempPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <span className="form-helper">
                    O usuário será obrigado a trocar esta senha no primeiro login antes de acessar o sistema.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  <UserPlus size={16} />
                  {createLoading ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Resetar Senha */}
      {resetModalUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Resetar Senha de {resetModalUser.name}
              </h3>
              <button onClick={() => setResetModalUser(null)} style={{ fontSize: '1.2rem' }}>&times;</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                  Defina uma nova senha temporária para o usuário <strong>@{resetModalUser.username}</strong>.
                  Todas as sessões ativas deste usuário serão invalidadas imediatamente e ele deverá criar uma nova senha pessoal no próximo login.
                </p>

                <div className="form-group">
                  <label className="form-label">Nova Senha Temporária *</label>
                  <input
                    type="password"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResetModalUser(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetLoading || tempPassword.length < 6}
                >
                  <Key size={16} />
                  {resetLoading ? 'Salvando...' : 'Definir Senha Temporária'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
