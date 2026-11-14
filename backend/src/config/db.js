const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

// Enable Foreign Keys and WAL Mode
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'tecnico', 'usuario')),
      must_change_password INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('Baixa', 'Média', 'Alta', 'Urgente')),
      status TEXT NOT NULL DEFAULT 'Aberto' CHECK(status IN ('Aberto', 'Em andamento', 'Aguardando usuário', 'Resolvido', 'Concluído')),
      created_by INTEGER NOT NULL REFERENCES users(id),
      technician_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS ticket_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      comment TEXT NOT NULL,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      related_ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin if no admin exists
  const adminExists = db.prepare(`SELECT id FROM users WHERE username = 'admin'`).get();
  if (!adminExists) {
    const rawPass = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(rawPass, salt);

    db.prepare(`
      INSERT INTO users (username, name, password_hash, role, must_change_password, active)
      VALUES (?, ?, ?, 'admin', 1, 1)
    `).run('admin', 'Administrador', hash);

    console.log('[DB] Usuário Admin padrão criado com sucesso: login "admin", must_change_password = 1');
  }
}

module.exports = {
  db,
  initDb
};
