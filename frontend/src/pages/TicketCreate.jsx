import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { PlusCircle, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  'Suporte Técnico Geral',
  'Hardware (Computadores e Periféricos)',
  'Software e Aplicativos',
  'Rede e Internet',
  'Acesso e Permissões',
  'Impressoras e Telefonia',
  'Outros'
];

const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente'];

export default function TicketCreate() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState('Média');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim()) {
      setError('Por favor, preencha o título e a descrição do problema.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title,
          category,
          priority,
          description
        })
      });

      navigate(`/tickets/${res.ticket.id}`);
    } catch (err) {
      setError(err.message || 'Erro ao criar ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Abrir Novo Ticket</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
              Descreva detalhadamente o incidente ou solicitação para que a equipe de suporte possa atendê-lo.
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título da Solicitação *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Não consigo acessar a impressora do 2º andar"
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Categoria *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Prioridade *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
              >
                {PRIORITIES.map((prio) => (
                  <option key={prio} value={prio}>
                    {prio}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descrição Detalhada do Problema *</label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique o que aconteceu, mensagens de erro exibidas, passos executados..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/tickets')}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <PlusCircle size={18} />
              {loading ? 'Criando Ticket...' : 'Criar Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
