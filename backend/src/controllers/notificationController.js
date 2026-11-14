const { db } = require('../config/db');

function listNotifications(req, res) {
  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
  `).all(req.user.id);

  return res.json({ notifications });
}

function getUnreadCount(req, res) {
  const row = db.prepare(`
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE user_id = ? AND read = 0
  `).get(req.user.id);

  return res.json({ count: row ? row.count : 0 });
}

function markAsRead(req, res) {
  const { id } = req.params;

  db.prepare(`
    UPDATE notifications 
    SET read = 1 
    WHERE id = ? AND user_id = ?
  `).run(id, req.user.id);

  return res.json({ message: 'Notificação marcada como lida.' });
}

function markAllAsRead(req, res) {
  db.prepare(`
    UPDATE notifications 
    SET read = 1 
    WHERE user_id = ?
  `).run(req.user.id);

  return res.json({ message: 'Todas as notificações foram marcadas como lidas.' });
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
