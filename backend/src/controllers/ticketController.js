const { db } = require('../config/db');
const { sendNotification, notifyAdminsAndTechnicians } = require('../utils/notifications');

const VALID_PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente'];
const VALID_STATUSES = ['Aberto', 'Em andamento', 'Aguardando usuário', 'Resolvido', 'Concluído'];

function createTicket(req, res) {
  const { title, description, category, priority } = req.body;

  if (!title || !description || !category || !priority) {
    return res.status(400).json({ error: 'Título, descrição, categoria e prioridade são obrigatórios.' });
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Prioridade inválida. Opções: ${VALID_PRIORITIES.join(', ')}` });
  }

  const insertStmt = db.prepare(`
    INSERT INTO tickets (title, description, category, priority, status, created_by, technician_id)
    VALUES (?, ?, ?, ?, 'Aberto', ?, NULL)
  `);

  const commentStmt = db.prepare(`
    INSERT INTO ticket_comments (ticket_id, user_id, comment, is_system)
    VALUES (?, ?, ?, 1)
  `);

  let ticketId;
  const runTransaction = db.transaction(() => {
    const result = insertStmt.run(title.trim(), description.trim(), category.trim(), priority, req.user.id);
    ticketId = result.lastInsertRowid;
    commentStmt.run(ticketId, req.user.id, `Ticket criado por ${req.user.name}.`);
  });

  runTransaction();

  // Notify Admins and Technicians
  notifyAdminsAndTechnicians(
    'Novo Ticket Criado',
    `Ticket #${ticketId} ("${title.trim()}") foi aberto por ${req.user.name}.`,
    ticketId
  );

  const createdTicket = db.prepare(`
    SELECT t.*, u.name as creator_name, u.username as creator_username
    FROM tickets t
    JOIN users u ON u.id = t.created_by
    WHERE t.id = ?
  `).get(ticketId);

  return res.status(201).json({ ticket: createdTicket });
}

function listNewTickets(req, res) {
  // Only Admin and Technician
  if (req.user.role === 'usuario') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const tickets = db.prepare(`
    SELECT 
      t.*, 
      u.name as creator_name, 
      u.username as creator_username
    FROM tickets t
    JOIN users u ON u.id = t.created_by
    WHERE t.technician_id IS NULL AND t.status = 'Aberto'
    ORDER BY t.created_at DESC
  `).all();

  return res.json({ tickets });
}

function listMyTickets(req, res) {
  let query = `
    SELECT 
      t.*, 
      u.name as creator_name, 
      u.username as creator_username,
      tech.name as technician_name,
      tech.username as technician_username
    FROM tickets t
    JOIN users u ON u.id = t.created_by
    LEFT JOIN users tech ON tech.id = t.technician_id
  `;
  const params = [];

  if (req.user.role === 'usuario') {
    query += ` WHERE t.created_by = ?`;
    params.push(req.user.id);
  } else if (req.user.role === 'tecnico') {
    query += ` WHERE t.technician_id = ?`;
    params.push(req.user.id);
  } else {
    // Admin sees all tickets
    query += ` WHERE 1=1`;
  }

  query += ` ORDER BY t.updated_at DESC`;

  const tickets = db.prepare(query).all(...params);
  return res.json({ tickets });
}

function getTicketById(req, res) {
  const { id } = req.params;

  const ticket = db.prepare(`
    SELECT 
      t.*, 
      u.name as creator_name, 
      u.username as creator_username,
      tech.name as technician_name,
      tech.username as technician_username
    FROM tickets t
    JOIN users u ON u.id = t.created_by
    LEFT JOIN users tech ON tech.id = t.technician_id
    WHERE t.id = ?
  `).get(id);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket não encontrado.' });
  }

  // Permission checks
  if (req.user.role === 'admin') {
    // Admin can view all
  } else if (req.user.role === 'usuario') {
    if (ticket.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado: este ticket pertence a outro usuário.' });
    }
  } else if (req.user.role === 'tecnico') {
    // Technician can only view if assigned to it OR if it's currently unassigned (to inspect before claim)
    if (ticket.technician_id !== null && ticket.technician_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado: ticket atribuído a outro técnico.' });
    }
  }

  return res.json({ ticket });
}

function claimTicket(req, res) {
  const { id } = req.params;

  // Only Technician or Admin can claim
  if (req.user.role === 'usuario') {
    return res.status(403).json({ error: 'Usuários não podem assumir tickets.' });
  }

  const ticket = db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket não encontrado.' });
  }

  // Atomic claim: only succeeds if technician_id IS NULL
  const updateStmt = db.prepare(`
    UPDATE tickets 
    SET technician_id = ?, status = 'Em andamento', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND technician_id IS NULL
  `);

  const commentStmt = db.prepare(`
    INSERT INTO ticket_comments (ticket_id, user_id, comment, is_system)
    VALUES (?, ?, ?, 1)
  `);

  let success = false;
  const runClaim = db.transaction(() => {
    const result = updateStmt.run(req.user.id, id);
    if (result.changes > 0) {
      success = true;
      commentStmt.run(id, req.user.id, `Ticket assumido pelo técnico ${req.user.name}.`);
    }
  });

  runClaim();

  if (!success) {
    return res.status(409).json({ error: 'Este ticket já foi assumido por outro técnico ou não está mais disponível.' });
  }

  // Notify ticket creator
  sendNotification(
    ticket.created_by,
    'Ticket em Atendimento',
    `O técnico ${req.user.name} assumiu o atendimento do seu ticket #${ticket.id}.`,
    ticket.id
  );

  const updatedTicket = db.prepare(`
    SELECT t.*, u.name as creator_name, tech.name as technician_name
    FROM tickets t
    JOIN users u ON u.id = t.created_by
    LEFT JOIN users tech ON tech.id = t.technician_id
    WHERE t.id = ?
  `).get(id);

  return res.json({ message: 'Ticket assumido com sucesso!', ticket: updatedTicket });
}

function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (req.user.role === 'usuario') {
    return res.status(403).json({ error: 'Usuários não têm permissão para alterar o status do ticket.' });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Opções: ${VALID_STATUSES.join(', ')}` });
  }

  const ticket = db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket não encontrado.' });
  }

  if (req.user.role === 'tecnico') {
    if (ticket.technician_id !== req.user.id) {
      return res.status(403).json({ error: 'Você só pode alterar o status de tickets sob sua responsabilidade.' });
    }

    // Strict progressive status validation for Technician:
    // Aberto -> Em andamento
    // Em andamento -> Aguardando usuário | Resolvido
    // Aguardando usuário -> Em andamento | Resolvido
    // Resolvido -> Concluído
    const current = ticket.status;
    let allowed = false;

    if (current === status) {
      return res.json({ message: 'O ticket já está com este status.', ticket });
    }

    if (current === 'Aberto' && status === 'Em andamento') {
      allowed = true;
    } else if (current === 'Em andamento' && (status === 'Aguardando usuário' || status === 'Resolvido')) {
      allowed = true;
    } else if (current === 'Aguardando usuário' && (status === 'Em andamento' || status === 'Resolvido')) {
      allowed = true;
    } else if (current === 'Resolvido' && status === 'Concluído') {
      allowed = true;
    }

    if (!allowed) {
      return res.status(400).json({
        error: `Transição de status inválida para perfil Técnico de "${current}" para "${status}". O fluxo permitido é: Aberto → Em andamento → Aguardando usuário/Resolvido → Concluído.`
      });
    }
  }

  // Determine closed_at
  let closedAtValue = ticket.closed_at;
  if (status === 'Concluído') {
    closedAtValue = new Date().toISOString();
  } else if (ticket.status === 'Concluído' && status !== 'Concluído') {
    closedAtValue = null;
  }

  const updateStmt = db.prepare(`
    UPDATE tickets 
    SET status = ?, closed_at = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);

  const commentStmt = db.prepare(`
    INSERT INTO ticket_comments (ticket_id, user_id, comment, is_system)
    VALUES (?, ?, ?, 1)
  `);

  const runUpdate = db.transaction(() => {
    updateStmt.run(status, closedAtValue, id);
    commentStmt.run(id, req.user.id, `Status alterado de "${ticket.status}" para "${status}" por ${req.user.name}.`);
  });

  runUpdate();

  // Notify ticket creator if someone else changed status
  if (ticket.created_by !== req.user.id) {
    sendNotification(
      ticket.created_by,
      'Status de Ticket Atualizado',
      `O status do seu ticket #${ticket.id} ("${ticket.title}") foi alterado para "${status}".`,
      ticket.id
    );
  }

  const updated = db.prepare(`
    SELECT t.*, u.name as creator_name, tech.name as technician_name
    FROM tickets t
    JOIN users u ON u.id = t.created_by
    LEFT JOIN users tech ON tech.id = t.technician_id
    WHERE t.id = ?
  `).get(id);

  return res.json({ message: 'Status atualizado com sucesso.', ticket: updated });
}

function reassignTicket(req, res) {
  const { id } = req.params;
  const { technician_id } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Somente administradores podem reatribuir tickets.' });
  }

  if (!technician_id) {
    return res.status(400).json({ error: 'Selecione o novo técnico responsável.' });
  }

  const ticket = db.prepare(`
    SELECT t.*, tech.name as old_tech_name 
    FROM tickets t 
    LEFT JOIN users tech ON tech.id = t.technician_id
    WHERE t.id = ?
  `).get(id);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket não encontrado.' });
  }

  const newTech = db.prepare(`SELECT id, name, role, active FROM users WHERE id = ?`).get(technician_id);
  if (!newTech || newTech.role !== 'tecnico' || newTech.active !== 1) {
    return res.status(400).json({ error: 'Técnico selecionado inválido ou inativo.' });
  }

  if (ticket.technician_id === newTech.id) {
    return res.status(400).json({ error: 'O ticket já está atribuído a este técnico.' });
  }

  const oldTechId = ticket.technician_id;
  const oldTechName = ticket.old_tech_name || 'Nenhum';

  const updateStmt = db.prepare(`
    UPDATE tickets 
    SET technician_id = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);

  const commentStmt = db.prepare(`
    INSERT INTO ticket_comments (ticket_id, user_id, comment, is_system)
    VALUES (?, ?, ?, 1)
  `);

  const runReassign = db.transaction(() => {
    updateStmt.run(newTech.id, id);
    commentStmt.run(
      id,
      req.user.id,
      `Reatribuído de ${oldTechName} para ${newTech.name} por Admin ${req.user.name}.`
    );
  });

  runReassign();

  // Notifications:
  // 1. New technician
  sendNotification(
    newTech.id,
    'Novo Ticket Atribuído',
    `O ticket #${ticket.id} ("${ticket.title}") foi atribuído a você por ${req.user.name}.`,
    ticket.id
  );

  // 2. Previous technician (if existed)
  if (oldTechId && oldTechId !== newTech.id) {
    sendNotification(
      oldTechId,
      'Ticket Reatribuído',
      `O ticket #${ticket.id} ("${ticket.title}") foi reatribuído para outro técnico.`,
      ticket.id
    );
  }

  // 3. User owner
  sendNotification(
    ticket.created_by,
    'Técnico Responsável Alterado',
    `Seu ticket #${ticket.id} agora está sob os cuidados do técnico ${newTech.name}.`,
    ticket.id
  );

  const updated = db.prepare(`
    SELECT t.*, u.name as creator_name, tech.name as technician_name
    FROM tickets t
    JOIN users u ON u.id = t.created_by
    LEFT JOIN users tech ON tech.id = t.technician_id
    WHERE t.id = ?
  `).get(id);

  return res.json({ message: 'Ticket reatribuído com sucesso.', ticket: updated });
}

function deleteTicket(req, res) {
  const { id } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Somente administradores podem excluir tickets.' });
  }

  const ticket = db.prepare(`SELECT id FROM tickets WHERE id = ?`).get(id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket não encontrado.' });
  }

  db.prepare(`DELETE FROM tickets WHERE id = ?`).run(id);

  return res.json({ message: 'Ticket excluído com sucesso.' });
}

module.exports = {
  createTicket,
  listNewTickets,
  listMyTickets,
  getTicketById,
  claimTicket,
  updateStatus,
  reassignTicket,
  deleteTicket
};
