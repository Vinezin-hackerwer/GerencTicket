const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');
const { notifyAdmins } = require('../utils/notifications');

function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username.trim());

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  if (user.active !== 1) {
    return res.status(401).json({ error: 'Usuário desativado. Entre em contato com um administrador.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, token, expiresAt);

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      must_change_password: user.must_change_password
    }
  });
}

function logout(req, res) {
  const token = req.token;
  if (token) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  }
  return res.json({ message: 'Sessão encerrada com sucesso.' });
}

function me(req, res) {
  return res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role,
      must_change_password: req.user.must_change_password
    }
  });
}

function changeMandatoryPassword(req, res) {
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 6 caracteres.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'A confirmação de senha não coincide com a nova senha.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);

  db.prepare(`
    UPDATE users 
    SET password_hash = ?, must_change_password = 0 
    WHERE id = ?
  `).run(hash, req.user.id);

  return res.json({
    message: 'Senha alterada com sucesso! O acesso ao sistema está liberado.',
    must_change_password: 0
  });
}

function requestPasswordReset(req, res) {
  const { username } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Informe o nome de usuário.' });
  }

  const cleanUser = username.trim();
  const user = db.prepare(`SELECT id, username, name FROM users WHERE username = ?`).get(cleanUser);

  if (user) {
    notifyAdmins(
      'Solicitação de Redefinição de Senha',
      `O usuário "${user.name}" (${user.username}) solicitou a redefinição de sua senha.`
    );
  }

  return res.json({
    message: 'Se o usuário existir no sistema, os administradores foram notificados para realizar a redefinição de senha.'
  });
}

module.exports = {
  login,
  logout,
  me,
  changeMandatoryPassword,
  requestPasswordReset
};
