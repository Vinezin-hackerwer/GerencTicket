const bcrypt = require('bcryptjs');
const { db } = require('../config/db');

function listUsers(req, res) {
  const users = db.prepare(`
    SELECT id, username, name, role, must_change_password, active, created_at
    FROM users
    ORDER BY id ASC
  `).all();

  return res.json({ users });
}

function createUser(req, res) {
  const { username, name, role, temporary_password } = req.body;

  if (!username || !name || !role || !temporary_password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const validRoles = ['admin', 'tecnico', 'usuario'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Perfil inválido. Deve ser admin, tecnico ou usuario.' });
  }

  if (temporary_password.length < 6) {
    return res.status(400).json({ error: 'A senha temporária deve conter no mínimo 6 caracteres.' });
  }

  const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(cleanUsername);
  if (existing) {
    return res.status(409).json({ error: 'Este nome de usuário já está em uso.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(temporary_password, salt);

  const result = db.prepare(`
    INSERT INTO users (username, name, password_hash, role, must_change_password, active)
    VALUES (?, ?, ?, ?, 1, 1)
  `).run(cleanUsername, name.trim(), hash, role);

  const createdUser = db.prepare(`
    SELECT id, username, name, role, must_change_password, active, created_at
    FROM users WHERE id = ?
  `).get(result.lastInsertRowid);

  return res.status(201).json({ user: createdUser });
}

function resetUserPassword(req, res) {
  const { id } = req.params;
  const { temporary_password } = req.body;

  if (!temporary_password || temporary_password.length < 6) {
    return res.status(400).json({ error: 'A nova senha temporária deve ter no mínimo 6 caracteres.' });
  }

  const user = db.prepare(`SELECT id, username FROM users WHERE id = ?`).get(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(temporary_password, salt);

  // Invalidate user sessions and update password
  const updateStmt = db.prepare(`
    UPDATE users 
    SET password_hash = ?, must_change_password = 1 
    WHERE id = ?
  `);
  const deleteSessionsStmt = db.prepare(`DELETE FROM sessions WHERE user_id = ?`);

  const runReset = db.transaction(() => {
    updateStmt.run(hash, id);
    deleteSessionsStmt.run(id);
  });

  runReset();

  return res.json({ message: 'Senha temporária definida e todas as sessões ativas do usuário foram encerradas.' });
}

function toggleUserActive(req, res) {
  const { id } = req.params;

  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'Você não pode desativar o seu próprio usuário.' });
  }

  const user = db.prepare(`SELECT id, active FROM users WHERE id = ?`).get(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const newStatus = user.active === 1 ? 0 : 1;

  const updateStmt = db.prepare(`UPDATE users SET active = ? WHERE id = ?`);
  const deleteSessionsStmt = db.prepare(`DELETE FROM sessions WHERE user_id = ?`);

  const runToggle = db.transaction(() => {
    updateStmt.run(newStatus, id);
    if (newStatus === 0) {
      deleteSessionsStmt.run(id);
    }
  });

  runToggle();

  return res.json({
    message: newStatus === 1 ? 'Usuário ativado com sucesso.' : 'Usuário desativado e sessões encerradas.',
    active: newStatus
  });
}

function listTechnicians(req, res) {
  const technicians = db.prepare(`
    SELECT id, username, name 
    FROM users 
    WHERE role = 'tecnico' AND active = 1 
    ORDER BY name ASC
  `).all();

  return res.json({ technicians });
}

module.exports = {
  listUsers,
  createUser,
  resetUserPassword,
  toggleUserActive,
  listTechnicians
};
