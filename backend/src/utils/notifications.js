const { db } = require('../config/db');

function sendNotification(userId, title, message, relatedTicketId = null) {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, related_ticket_id, read)
      VALUES (?, ?, ?, ?, 0)
    `).run(userId, title, message, relatedTicketId);
  } catch (err) {
    console.error('[Notification Error]', err.message);
  }
}

function notifyAdmins(title, message, relatedTicketId = null) {
  try {
    const admins = db.prepare(`SELECT id FROM users WHERE role = 'admin' AND active = 1`).all();
    const insertStmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, related_ticket_id, read)
      VALUES (?, ?, ?, ?, 0)
    `);
    const insertMany = db.transaction((users) => {
      for (const u of users) {
        insertStmt.run(u.id, title, message, relatedTicketId);
      }
    });
    insertMany(admins);
  } catch (err) {
    console.error('[Notify Admins Error]', err.message);
  }
}

function notifyTechnicians(title, message, relatedTicketId = null) {
  try {
    const techs = db.prepare(`SELECT id FROM users WHERE role = 'tecnico' AND active = 1`).all();
    const insertStmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, related_ticket_id, read)
      VALUES (?, ?, ?, ?, 0)
    `);
    const insertMany = db.transaction((users) => {
      for (const u of users) {
        insertStmt.run(u.id, title, message, relatedTicketId);
      }
    });
    insertMany(techs);
  } catch (err) {
    console.error('[Notify Technicians Error]', err.message);
  }
}

function notifyAdminsAndTechnicians(title, message, relatedTicketId = null) {
  try {
    const staff = db.prepare(`
      SELECT id FROM users 
      WHERE role IN ('admin', 'tecnico') AND active = 1
    `).all();
    const insertStmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, related_ticket_id, read)
      VALUES (?, ?, ?, ?, 0)
    `);
    const insertMany = db.transaction((users) => {
      for (const u of users) {
        insertStmt.run(u.id, title, message, relatedTicketId);
      }
    });
    insertMany(staff);
  } catch (err) {
    console.error('[Notify Staff Error]', err.message);
  }
}

module.exports = {
  sendNotification,
  notifyAdmins,
  notifyTechnicians,
  notifyAdminsAndTechnicians
};
