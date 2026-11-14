import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { 
  ListFilter, 
  PlusCircle, 
  Search, 
  RefreshCw, 
  Eye, 
  AlertCircle 
} from 'lucide-react';

export default function TicketsMy() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const pageTitle = user?.role === 'admin'
    ? 'Todos os Tickets do Sistema'
    : user?.role === 'tecnico'
    ? 'Meus Tickets Atribuídos'
    : 'Meus Tickets Abertos';

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/tickets/my');
      setTickets(res.tickets);
    } catch (err) {
      setError(err.message || 'Erro ao carregar tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Aberto': return 'badge-status-aberto';
      case 'Em andamento': return 'badge-status-emandamento';
      case 'Aguardando usuário': return 'badge-status-aguardandousuario';
      case 'Resolvido': return 'badge-status-resolvido';
      case 'Concluído': return 'badge-status-concluido';
      default: return '';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'Baixa': return 'badge-prio-baixa';
      case 'Média': return 'badge-prio-media';
      case 'Alta': return 'badge-prio-alta';
      case 'Urgente': return 'badge-prio-urgente';
      default: return '';
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchId = String(t.id).includes(q);
      const matchCreator = (t.creator_name || '').toLowerCase().includes(q);
      const matchTech = (t.technician_name || '').toLowerCase().includes(q);
      return matchTitle || matchId || matchCreator || matchTech;
    }
    return true;
  });

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="card-title" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ListFilter size={24} color="#2563eb" /> {pageTitle}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
            {user?.role === 'admin'
              ? 'Visão geral de todos os chamados registrados no Helpdesk.'
              : user?.role === 'tecnico'
              ? 'Tickets sob sua responsabilidade técnica.'
              : 'Acompanhe o andamento dos tickets que você abriu.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadTickets}
            disabled={loading}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
          <Link to="/tickets/new" className="btn btn-primary btn-sm">
            <PlusCircle size={16} /> Novo Ticket
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Pesquisar</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar por ID, título ou pessoa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="Aberto">Aberto</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Aguardando usuário">Aguardando usuário</option>
              <option value="Resolvido">Resolvido</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Prioridade</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">Todas as Prioridades</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Carregando tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <p>Nenhum ticket encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Título</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Categoria</th>
                {user?.role !== 'usuario' && <th>Aberto por</th>}
                <th>Técnico Responsável</th>
                <th>Última Atualização</th>
                <th style={{ textAlign: 'right' }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/tickets/${t.id}`} style={{ fontWeight: 600 }}>
                      #{t.id}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/tickets/${t.id}`} style={{ color: 'inherit', fontWeight: 600 }}>
                      {t.title}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Aberto em {new Date(t.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusClass(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getPriorityClass(t.priority)}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td>{t.category}</td>
                  {user?.role !== 'usuario' && (
                    <td>
                      <span style={{ fontWeight: 500 }}>{t.creator_name}</span>
                    </td>
                  )}
                  <td>
                    {t.technician_name ? (
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>
                        {t.technician_name}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        Aguardando técnico
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {new Date(t.updated_at).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/tickets/${t.id}`} className="btn btn-secondary btn-sm">
                      <Eye size={15} /> Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
