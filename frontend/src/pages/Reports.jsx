import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  RefreshCw, 
  Eye, 
  TrendingUp, 
  Users 
} from 'lucide-react';

export default function Reports() {
  const [data, setData] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [technicianId, setTechnicianId] = useState('all');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status !== 'all') params.append('status', status);
      if (priority !== 'all') params.append('priority', priority);
      if (technicianId !== 'all') params.append('technicianId', technicianId);

      const res = await apiRequest(`/reports?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados do relatório.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status, priority, technicianId]);

  useEffect(() => {
    async function loadTechs() {
      try {
        const res = await apiRequest('/users/technicians');
        setTechnicians(res.technicians);
      } catch (e) {
        // ignore
      }
    }
    loadTechs();
    fetchReports();
  }, [fetchReports]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatus('all');
    setPriority('all');
    setTechnicianId('all');
  };

  const getStatusClass = (st) => {
    switch (st) {
      case 'Aberto': return 'badge-status-aberto';
      case 'Em andamento': return 'badge-status-emandamento';
      case 'Aguardando usuário': return 'badge-status-aguardandousuario';
      case 'Resolvido': return 'badge-status-resolvido';
      case 'Concluído': return 'badge-status-concluido';
      default: return '';
    }
  };

  const getPriorityClass = (prio) => {
    switch (prio) {
      case 'Baixa': return 'badge-prio-baixa';
      case 'Média': return 'badge-prio-media';
      case 'Alta': return 'badge-prio-alta';
      case 'Urgente': return 'badge-prio-urgente';
      default: return '';
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="card-title" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={24} color="#2563eb" /> Relatório de Acompanhamento
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
            Visão gerencial consolidada com métricas operacionais, tempo médio de resolução e desempenho da equipe técnica.
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={fetchReports}
          disabled={loading}
        >
          <RefreshCw size={16} /> Atualizar Relatório
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Card */}
      <form onSubmit={handleApplyFilter} className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Todos os Status</option>
              <option value="Aberto">Aberto</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Aguardando usuário">Aguardando usuário</option>
              <option value="Resolvido">Resolvido</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>

          <div>
            <label className="form-label">Prioridade</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="all">Todas as Prioridades</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>

          <div>
            <label className="form-label">Técnico</label>
            <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
              <option value="all">Todos os Técnicos</option>
              <option value="unassigned">Sem Responsável</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              <Filter size={16} /> Filtrar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClearFilters}
              title="Limpar filtros"
            >
              Limpar
            </button>
          </div>
        </div>
      </form>

      {/* KPI Cards */}
      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>TOTAL DE TICKETS</span>
                <TrendingUp size={20} color="#2563eb" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>
                {data.summary.totalTickets}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                No período filtrado
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>TICKETS CONCLUÍDOS</span>
                <CheckCircle2 size={20} color="#15803d" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#15803d', marginTop: '0.35rem' }}>
                {data.summary.closedTickets}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                {data.summary.totalTickets > 0
                  ? `${Math.round((data.summary.closedTickets / data.summary.totalTickets) * 100)}% de resolução`
                  : 'Nenhum ticket registrado'}
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>TEMPO MÉDIO DE RESOLUÇÃO</span>
                <Clock size={20} color="#d97706" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#d97706', marginTop: '0.35rem' }}>
                {data.summary.avgResolutionFormatted}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                Para tickets já concluídos
              </div>
            </div>
          </div>

          {/* Breakdown Section: Status & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Status Breakdown */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                <h3 className="card-title" style={{ fontSize: '1.05rem' }}>Distribuição por Status</h3>
              </div>
              {data.summary.byStatus.length === 0 ? (
                <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>Nenhum dado.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {data.summary.byStatus.map((s) => (
                    <div key={s.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={`badge ${getStatusClass(s.status)}`}>{s.status}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.count} chamados</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Breakdown */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                <h3 className="card-title" style={{ fontSize: '1.05rem' }}>Distribuição por Prioridade</h3>
              </div>
              {data.summary.byPriority.length === 0 ? (
                <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>Nenhum dado.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {data.summary.byPriority.map((p) => (
                    <div key={p.priority} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={`badge ${getPriorityClass(p.priority)}`}>{p.priority}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.count} chamados</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Technician Performance Table */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Users size={18} color="#2563eb" /> Desempenho por Técnico Responsável
              </h3>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Técnico</th>
                    <th>Total Atribuído</th>
                    <th>Concluídos</th>
                    <th>Em Andamento / Abertos</th>
                    <th>Taxa de Eficiência</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.byTechnician.map((tech, idx) => {
                    const rate = tech.total > 0 ? Math.round((tech.completed / tech.total) * 100) : 0;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{tech.technician_name}</td>
                        <td>{tech.total}</td>
                        <td style={{ color: '#15803d', fontWeight: 600 }}>{tech.completed}</td>
                        <td style={{ color: '#d97706', fontWeight: 600 }}>{tech.active}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '80px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${rate}%`, height: '100%', background: '#2563eb' }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Filtered Tickets List */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: '1.05rem' }}>
                Lista de Tickets Filtrados ({data.tickets.length})
              </h3>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              {data.tickets.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Nenhum ticket encontrado para estes filtros.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '70px' }}>ID</th>
                      <th>Título</th>
                      <th>Status</th>
                      <th>Prioridade</th>
                      <th>Solicitante</th>
                      <th>Técnico</th>
                      <th>Abertura</th>
                      <th style={{ textAlign: 'right' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tickets.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>#{t.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.title}</div>
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
                        <td>{t.creator_name}</td>
                        <td>{t.technician_name || '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(t.created_at).toLocaleDateString('pt-BR')}
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
        </>
      )}
    </div>
  );
}
