require('dotenv').config();
const { initDb, db } = require('./db');
const bcrypt = require('bcryptjs');

console.log('[Seed] Inicializando banco de dados e verificando schema...');
initDb();

// Seed initial admin
const adminUser = db.prepare(`SELECT * FROM users WHERE username = 'admin'`).get();
if (adminUser) {
  console.log(`[Seed] Usuário Admin verificado: id=${adminUser.id}, username=${adminUser.username}, must_change_password=${adminUser.must_change_password}`);
}

console.log('[Seed] Concluído com sucesso.');
