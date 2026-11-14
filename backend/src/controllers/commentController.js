const { db } = require('../config/db');
const { sendNotification, notifyAdmins } = require('../utils/notifications');

function getTicketComments(req, res) {
  const { ticketId } = req.params;

  const ticket = db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket não encontrado.' });
  }

  // Check view access
  if (req.user.role === 'admin') {
    // Access allowed
  } else if (req.user.role === 'usuario') {
    if (ticket.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
  } else if (req.user.role === 'tecnico') {
    if (ticket.technician_id !== null && ticket.technician_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
  }

  const comments = db.prepare(`
    SELECT 
      c.*,
      u.name as author_name,
      u.username as author_username,
      u.role as author_role
    FROM ticket_comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.ticket_id = ?
    ORDER BY c.created_at ASC
  `).all(ticketId);

  return res.json({ comments });
}

function addComment(req, res) {
  const { ticketId } = req.params;
  const { comment } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'O comentário não pode ser vazio.' });
  }

  const ticket = db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket não encontrado.' });
  }

  // Permission check
  if (req.user.role === 'admin') {
    // Admin can comment on any ticket
  } else if (req.user.role === 'usuario') {
    if (ticket.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Você só pode comentar nos seus próprios tickets.' });
    }
  } else if (req.user.role === 'tecnico') {
    if (ticket.technician_id !== req.user.id) {
      return res.status(403).json({ error: 'Você só pode comentar em tickets atribuídos a você.' });
    }
  }

  const insertCommentStmt = db.prepare(`
    INSERT INTO ticket_comments (ticket_id, user_id, comment, is_system)
    VALUES (?, ?, ?, 0)
  `);

  const updateTicketStmt = db.prepare(`
    UPDATE tickets 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);

  let autoResumedStatus = false;

  const runComment = db.transaction(() => {
    insertCommentStmt.run(ticketId, req.user.id, comment.trim());
    updateTicketStmt.run(ticketId);

    // Rule: when user responds and ticket is in 'Aguardando usuário', return to 'Em andamento'
    if (req.user.role === 'usuario' && ticket.status === 'Aguardando usuário') {
      db.prepare(`
        UPDATE tickets 
        SET status = 'Em andamento', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(ticketId);

      db.prepare(`
        INSERT INTO ticket_comments (ticket_id, user_id, comment, is_system)
        VALUES (?, ?, ?, 1)
      `).run(ticketId, req.user.id, 'Status retornado para "Em andamento" após resposta do usuário.');

      autoResumedStatus = true;
    }
  });

  runComment();

  // Notification logic:
  // - Resposta de técnico/admin em ticket → Usuário dono do ticket.
  // - Comentário do usuário → Técnico responsável (ou Admins, se não houver responsável).
  if (req.user.role === 'tecnico' || req.user.role === 'admin') {
    if (ticket.created_by !== req.user.id) {
      sendNotification(
        ticket.created_by,
        'Nova Resposta no seu Ticket',
        `${req.user.name} respondeu ao ticket #${ticket.id} ("${ticket.title}").`,
        ticket.id
      );
    }
  } else if (req.user.role === 'usuario') {
    if (ticket.technician_id) {
      sendNotification(
        ticket.technician_id,
        'Novo Comentário do Usuário',
        `O usuário ${req.user.name} comentou no ticket #${ticket.id} ("${ticket.title}").`,
        ticket.id
      );
    } else {
      notifyAdmins(
        'Novo Comentário em Ticket sem Técnico',
        `O usuário ${req.user.name} comentou no ticket #${ticket.id} ("${ticket.title}").`,
        ticket.id
      );
    }
  }

  const comments = db.prepare(`
    SELECT 
      c.*,
      u.name as author_name,
      u.username as author_username,
      u.role as author_role
    FROM ticket_comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.ticket_id = ?
    ORDER BY c.created_at ASC
  `).all(ticketId);

  return res.status(201).json({
    message: 'Comentário adicionado com sucesso.',
    autoResumedStatus,
    comments
  });
}

module.exports = {
  getTicketComments,
  addComment
};
