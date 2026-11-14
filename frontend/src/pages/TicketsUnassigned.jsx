import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { Inbox, CheckCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';

export default function TicketsUnassigned() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [claimingId, setClaimingId] = useState(null);

  const navigate = useNavigate();

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/tickets/new');
      setTickets(res.tickets);
    } catch (err) {
      setError(err.message || 'Erro ao carregar novos tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleClaim = async (ticketId) => {
    setClaimingId(ticketId);
    setError('');
    setSuccessMsg('');

    try {
      await apiRequest(`/tickets/${ticketId}/claim`, { method: 'POST' });
      setSuccessMsg(`Você assumiu o ticket #${ticketId} com sucesso!`);
      // Remove from unassigned list
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      // Navigate to the ticket after short delay or direct
      setTimeout(() => {
        navigate(`/tickets/${ticketId}`);
      }, 800);
    } catch (err) {
      if (err.status === 409) {
        setError('Aviso: Este ticket já foi assumido por outro técnico no mesmo instante.');
      } else {
        setError(err.message || 'Erro ao assumir ticket.');
      }
      loadTickets();
    } finally {
      setClaimingId(null);
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

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="card-title" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Inbox size={24} color="#2563eb" /> Novos Tickets Aguardando Atendimento
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
            Tickets abertos recentemente que ainda não possuem um técnico responsável associado.
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={loadTickets}
          disabled={loading}
        >
          <RefreshCw size={16} /> Atualizar Lista
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Carregando novos tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Inbox size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>Nenhum ticket aguardando atendimento no momento.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Título</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Aberto por</th>
                <th>Data de Abertura</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/tickets/${t.id}`} style={{ fontWeight: 600 }}>
                      #{t.id}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description}
                    </div>
                  </td>
                  <td>{t.category}</td>
                  <td>
                    <span className={`badge ${getPriorityClass(t.priority)}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{t.creator_name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                      @{t.creator_username}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {new Date(t.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Link
                        to={`/tickets/${t.id}`}
                        className="btn btn-secondary btn-sm"
                        title="Ver detalhes"
                      >
                        <Eye size={15} />
                      </Link>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleClaim(t.id)}
                        disabled={claimingId === t.id}
                      >
                        <CheckCircle size={15} />
                        {claimingId === t.id ? 'Assumindo...' : 'Assumir'}
                      </button>
                    </div>
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
