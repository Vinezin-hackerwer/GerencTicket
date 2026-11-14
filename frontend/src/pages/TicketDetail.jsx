import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { 
  ArrowLeft, 
  Send, 
  UserCheck, 
  CheckCircle, 
  Trash2, 
  Info, 
  MessageSquare, 
  Clock, 
  ShieldAlert, 
  User, 
  CheckCircle2 
} from 'lucide-react';

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Comment input
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Status update
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Reassignment Modal (Admin)
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);

  // Delete Confirm Modal (Admin)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadTicketData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const ticketRes = await apiRequest(`/tickets/${id}`);
      setTicket(ticketRes.ticket);
      setSelectedStatus(ticketRes.ticket.status);

      const commentsRes = await apiRequest(`/tickets/${id}/comments`);
      setComments(commentsRes.comments);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados do ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  // Load technicians when reassign modal opens
  const openReassignModal = async () => {
    try {
      const res = await apiRequest('/users/technicians');
      setTechnicians(res.technicians);
      setSelectedTechId(ticket?.technician_id || (res.technicians[0]?.id || ''));
      setShowReassignModal(true);
    } catch (err) {
      setError('Erro ao carregar técnicos para reatribuição.');
    }
  };

  const handleClaim = async () => {
    setError('');
    setActionSuccess('');
    try {
      const res = await apiRequest(`/tickets/${id}/claim`, { method: 'POST' });
      setActionSuccess('Ticket assumido com sucesso!');
      setTicket(res.ticket);
      loadTicketData();
    } catch (err) {
      setError(err.message || 'Erro ao assumir ticket.');
    }
  };

  const handleStatusChange = async (targetStatus) => {
    setError('');
    setActionSuccess('');
    setStatusLoading(true);
    try {
      const res = await apiRequest(`/tickets/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: targetStatus || selectedStatus })
      });
      setActionSuccess(`Status alterado para "${targetStatus || selectedStatus}".`);
      setTicket(res.ticket);
      setSelectedStatus(res.ticket.status);
      loadTicketData();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleReassign = async (e) => {
    e.preventDefault();
    if (!selectedTechId) return;

    setReassignLoading(true);
    setError('');
    setActionSuccess('');
    try {
      const res = await apiRequest(`/tickets/${id}/reassign`, {
        method: 'PUT',
        body: JSON.stringify({ technician_id: selectedTechId })
      });
      setActionSuccess('Ticket reatribuído com sucesso!');
      setShowReassignModal(false);
      setTicket(res.ticket);
      loadTicketData();
    } catch (err) {
      setError(err.message || 'Erro ao reatribuir ticket.');
    } finally {
      setReassignLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setError('');
    try {
      await apiRequest(`/tickets/${id}`, { method: 'DELETE' });
      navigate('/tickets');
    } catch (err) {
      setError(err.message || 'Erro ao excluir ticket.');
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    setError('');
    setActionSuccess('');
    try {
      const res = await apiRequest(`/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment: newComment })
      });
      setNewComment('');
      setComments(res.comments);
      if (res.autoResumedStatus) {
        setActionSuccess('Comentário enviado! O ticket retornou para "Em andamento".');
      }
      loadTicketData();
    } catch (err) {
      setError(err.message || 'Erro ao adicionar comentário.');
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Carregando detalhes do ticket...
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <div className="alert alert-error">
          <ShieldAlert size={20} />
          <span>{error}</span>
        </div>
        <button onClick={() => navigate('/tickets')} className="btn btn-secondary">
          <ArrowLeft size={16} /> Voltar aos Tickets
        </button>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isAssignedTech = user?.role === 'tecnico' && ticket?.technician_id === user?.id;
  const isTicketOwner = ticket?.created_by === user?.id;
  const isUnassigned = !ticket?.technician_id;

  // Allowed transitions for technician
  const getTechAllowedTransitions = () => {
    const s = ticket?.status;
    if (s === 'Aberto') return ['Em andamento'];
    if (s === 'Em andamento') return ['Aguardando usuário', 'Resolvido'];
    if (s === 'Aguardando usuário') return ['Em andamento', 'Resolvido'];
    if (s === 'Resolvido') return ['Concluído'];
    return [];
  };

  const techTransitions = getTechAllowedTransitions();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Bar Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Claim button if unassigned */}
          {isUnassigned && (isAdmin || user?.role === 'tecnico') && (
            <button className="btn btn-primary btn-sm" onClick={handleClaim}>
              <CheckCircle size={16} /> Assumir Atendimento
            </button>
          )}

          {/* Admin Reassign Button */}
          {isAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={openReassignModal}>
              <UserCheck size={16} /> Reatribuir Técnico
            </button>
          )}

          {/* Admin Delete Ticket */}
          {isAdmin && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={16} /> Excluir Ticket
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Ticket Header Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#64748b' }}>
                #{ticket.id}
              </span>
              <span className={`badge badge-status-${ticket.status.toLowerCase().replace(/\s/g, '')}`}>
                {ticket.status}
              </span>
              <span className={`badge badge-prio-${ticket.priority.toLowerCase()}`}>
                Prioridade: {ticket.priority}
              </span>
              <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                {ticket.category}
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
              {ticket.title}
            </h1>
          </div>

          {/* Status update widget for Tech and Admin */}
          {(isAdmin || isAssignedTech) && ticket.status !== 'Concluído' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Alterar Status:</span>
              {isAdmin ? (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.3rem 0.5rem', width: 'auto' }}
                  >
                    <option value="Aberto">Aberto</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Aguardando usuário">Aguardando usuário</option>
                    <option value="Resolvido">Resolvido</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleStatusChange(selectedStatus)}
                    disabled={statusLoading || selectedStatus === ticket.status}
                  >
                    Atualizar
                  </button>
                </div>
              ) : (
                /* Technician allowed transitions */
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {techTransitions.length > 0 ? (
                    techTransitions.map((nextSt) => (
                      <button
                        key={nextSt}
                        className={`btn btn-sm ${nextSt === 'Concluído' ? 'btn-success' : 'btn-primary'}`}
                        onClick={() => handleStatusChange(nextSt)}
                        disabled={statusLoading}
                      >
                        {nextSt === 'Concluído' ? 'Confirmar Conclusão' : `Mudar p/ ${nextSt}`}
                      </button>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sem transição permitida</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '1.25rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #f1f5f9',
          fontSize: '0.875rem'
        }}>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>CRIADO POR</div>
            <div style={{ fontWeight: 600, marginTop: '2px' }}>{ticket.creator_name} (@{ticket.creator_username})</div>
          </div>

          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>TÉCNICO RESPONSÁVEL</div>
            <div style={{ fontWeight: 600, marginTop: '2px' }}>
              {ticket.technician_name ? ticket.technician_name : (
                <span style={{ color: '#d97706', fontStyle: 'italic' }}>Não atribuído</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>DATA DE ABERTURA</div>
            <div style={{ marginTop: '2px' }}>{new Date(ticket.created_at).toLocaleString('pt-BR')}</div>
          </div>

          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>STATUS FINALIZAÇÃO</div>
            <div style={{ marginTop: '2px' }}>
              {ticket.closed_at ? (
                <span style={{ color: '#15803d', fontWeight: 600 }}>
                  Concluído em {new Date(ticket.closed_at).toLocaleString('pt-BR')}
                </span>
              ) : (
                <span style={{ color: '#64748b' }}>Em aberto</span>
              )}
            </div>
          </div>
        </div>

        {/* Description Box */}
        <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
            Descrição Inicial
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#1e293b' }}>
            {ticket.description}
          </div>
        </div>
      </div>

      {/* Comments & History Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={20} color="#2563eb" /> Histórico e Respostas ({comments.length})
          </h3>
        </div>

        {/* Comments timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {comments.map((c) => {
            if (c.is_system) {
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    background: '#f1f5f9',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    color: '#475569',
                    borderLeft: '3px solid #94a3b8'
                  }}
                >
                  <Info size={16} color="#64748b" />
                  <span style={{ flex: 1, fontStyle: 'italic' }}>{c.comment}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(c.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              );
            }

            const isMine = c.user_id === user?.id;

            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: isMine ? '#f0f7ff' : '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  maxWidth: '90%',
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                      {c.author_name}
                    </span>
                    <span className={`badge badge-role-${c.author_role}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                      {c.author_role}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(c.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.9rem', color: '#1e293b' }}>
                  {c.comment}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comment Input Box */}
        {(isAdmin || isAssignedTech || isTicketOwner) ? (
          <form onSubmit={handleAddComment} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            {user?.role === 'usuario' && ticket.status === 'Aguardando usuário' && (
              <div className="alert alert-info" style={{ fontSize: '0.825rem', marginBottom: '0.75rem' }}>
                <Info size={16} />
                <span>Ao responder este ticket, o status retornará automaticamente para <strong>"Em andamento"</strong>.</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Adicionar Comentário ou Resposta</label>
              <textarea
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Digite seu comentário ou esclarecimento..."
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={commentLoading || !newComment.trim()}
              >
                <Send size={16} />
                {commentLoading ? 'Enviando...' : 'Publicar Resposta'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.875rem', borderTop: '1px solid #f1f5f9' }}>
            Apenas o autor do ticket, o técnico responsável ou um administrador podem responder.
          </div>
        )}
      </div>

      {/* Reassign Modal (Admin Only) */}
      {showReassignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Reatribuir Técnico Responsável</h3>
              <button onClick={() => setShowReassignModal(false)} style={{ fontSize: '1.2rem' }}>&times;</button>
            </div>
            <form onSubmit={handleReassign}>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                  Selecione o novo técnico para assumir o atendimento do ticket <strong>#{ticket.id}</strong>.
                </p>
                <div className="form-group">
                  <label className="form-label">Técnico Ativo *</label>
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    required
                  >
                    <option value="">Selecione um técnico...</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (@{t.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReassignModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reassignLoading || !selectedTechId}
                >
                  {reassignLoading ? 'Reatribuindo...' : 'Confirmar Reatribuição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Ticket Confirmation Modal (Admin Only) */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#b91c1c' }}>Confirmar Exclusão de Ticket</h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ fontSize: '1.2rem' }}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                Tem certeza que deseja apagar o ticket <strong>#{ticket.id} - "{ticket.title}"</strong>?
              </p>
              <p style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.5rem' }}>
                Esta ação é irreversível e excluirá todo o histórico de comentários e notificações relacionadas.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Excluindo...' : 'Excluir Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
