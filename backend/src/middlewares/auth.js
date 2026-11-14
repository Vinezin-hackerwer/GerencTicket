const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'helpdesk_super_secret_jwt_key_2026_antigravity';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido ou inválido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Validate active session in database
    const session = db.prepare(`
      SELECT * FROM sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `).get(token);

    if (!session) {
      return res.status(401).json({ error: 'Sessão expirada ou encerrada. Faça login novamente.' });
    }

    // Fetch user and check if active
    const user = db.prepare(`
      SELECT id, username, name, role, must_change_password, active 
      FROM users 
      WHERE id = ?
    `).get(decoded.userId);

    if (!user || user.active !== 1) {
      return res.status(401).json({ error: 'Usuário inativo ou inexistente.' });
    }

    // If user must change password, restrict to change-password, logout, and me routes
    if (user.must_change_password === 1) {
      const allowedPaths = [
        '/api/auth/change-password',
        '/api/auth/logout',
        '/api/auth/me'
      ];
      const currentPath = req.baseUrl + req.path;
      if (!allowedPaths.includes(currentPath)) {
        return res.status(403).json({
          error: 'É necessário alterar sua senha temporária antes de acessar o sistema.',
          mustChangePassword: true
        });
      }
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

module.exports = {
  authenticate,
  JWT_SECRET
};
