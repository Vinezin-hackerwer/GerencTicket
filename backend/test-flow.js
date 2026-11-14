const http = require('http');

const PORT = 3001;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (dataString) {
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api${path}`,
        method,
        headers
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(responseBody);
          } catch {
            parsed = responseBody;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function run() {
  console.log('--- INICIANDO VALIDAÇÃO DO FLUXO COMPLETO ---');

  // 1. Login inicial com Admin (senha temporária)
  console.log('\n[Passo 1] Login com admin inicial...');
  const adminLogin1 = await request('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  assert(adminLogin1.status === 200, 'Login inicial admin bem-sucedido');
  assert(adminLogin1.data.user.must_change_password === 1, 'Admin inicial possui must_change_password = 1');
  const adminToken1 = adminLogin1.data.token;

  // 2. Testar bloqueio de rotas enquanto must_change_password = 1
  console.log('\n[Passo 2] Testar bloqueio de rotas com flag de troca obrigatória ativa...');
  const blockedAccess = await request('GET', '/tickets/my', null, adminToken1);
  assert(blockedAccess.status === 403, 'Acesso bloqueado com 403 para rotas protegidas');
  assert(blockedAccess.data.mustChangePassword === true, 'Resposta indica mustChangePassword = true');

  // 3. Troca obrigatória de senha do Admin
  console.log('\n[Passo 3] Realizar troca obrigatória de senha...');
  const changePassRes = await request('POST', '/auth/change-password', {
    newPassword: 'adminNewPass456',
    confirmPassword: 'adminNewPass456'
  }, adminToken1);
  assert(changePassRes.status === 200, 'Senha alterada com sucesso');
  assert(changePassRes.data.must_change_password === 0, 'Flag must_change_password zerada');

  // 4. Verificar se rotas agora estão liberadas
  console.log('\n[Passo 4] Verificar liberação de rotas após troca de senha...');
  const unblockedAccess = await request('GET', '/tickets/my', null, adminToken1);
  assert(unblockedAccess.status === 200, 'Acesso a /tickets/my agora é permitido');

  // 5. Admin cria um Técnico e um Usuário
  console.log('\n[Passo 5] Admin cadastra um Técnico e um Usuário comum...');
  const createTechRes = await request('POST', '/users', {
    username: 'tecnico1',
    name: 'Carlos Técnico',
    role: 'tecnico',
    temporary_password: 'tempPass123'
  }, adminToken1);
  assert(createTechRes.status === 201, 'Técnico criado com sucesso');
  const tech1Id = createTechRes.data.user.id;

  const createUserRes = await request('POST', '/users', {
    username: 'usuario1',
    name: 'Maria Usuária',
    role: 'usuario',
    temporary_password: 'tempPass123'
  }, adminToken1);
  assert(createUserRes.status === 201, 'Usuário criado com sucesso');
  const user1Id = createUserRes.data.user.id;

  // 6. Usuário faz login e cumpre troca obrigatória
  console.log('\n[Passo 6] Usuário1 faz login e troca sua senha temporária...');
  const userLogin = await request('POST', '/auth/login', { username: 'usuario1', password: 'tempPass123' });
  assert(userLogin.status === 200, 'Login do usuário bem-sucedido');
  const userToken = userLogin.data.token;

  const userChangePass = await request('POST', '/auth/change-password', {
    newPassword: 'userSecretPass789',
    confirmPassword: 'userSecretPass789'
  }, userToken);
  assert(userChangePass.status === 200, 'Usuário trocou sua senha temporária');

  // 7. Usuário cria um ticket
  console.log('\n[Passo 7] Usuário cria um ticket...');
  const createTicketRes = await request('POST', '/tickets', {
    title: 'Falha ao acessar módulo financeiro',
    category: 'Software e Aplicativos',
    priority: 'Alta',
    description: 'Ao clicar no botão de faturas, a tela fica em branco e exibe erro 500.'
  }, userToken);
  assert(createTicketRes.status === 201, 'Ticket criado com sucesso');
  const ticketId = createTicketRes.data.ticket.id;
  assert(createTicketRes.data.ticket.status === 'Aberto', 'Status inicial é Aberto');

  // 8. Técnico1 faz login e troca de senha
  console.log('\n[Passo 8] Técnico1 faz login e troca de senha...');
  const techLogin = await request('POST', '/auth/login', { username: 'tecnico1', password: 'tempPass123' });
  const techToken = techLogin.data.token;
  await request('POST', '/auth/change-password', {
    newPassword: 'techSecretPass789',
    confirmPassword: 'techSecretPass789'
  }, techToken);

  // 9. Técnico1 visualiza o ticket em "Novos tickets"
  console.log('\n[Passo 9] Técnico1 visualiza ticket em /tickets/new...');
  const newTicketsRes = await request('GET', '/tickets/new', null, techToken);
  assert(newTicketsRes.status === 200, 'Lista de novos tickets acessada com sucesso');
  const hasTicket = newTicketsRes.data.tickets.some(t => t.id === ticketId);
  assert(hasTicket, 'Ticket recém-criado está presente na lista de novos tickets');

  // 10. Técnico1 assume o ticket (atômico)
  console.log('\n[Passo 10] Técnico1 assume o ticket...');
  const claimRes = await request('POST', `/tickets/${ticketId}/claim`, null, techToken);
  assert(claimRes.status === 200, 'Técnico assumiu ticket com sucesso');
  assert(claimRes.data.ticket.technician_id === tech1Id, 'technician_id atualizado para o Técnico1');
  assert(claimRes.data.ticket.status === 'Em andamento', 'Status do ticket virou "Em andamento"');

  // 11. Testar 409 Conflict se tentar assumir novamente
  console.log('\n[Passo 11] Testar tentativa concorrente de assumir ticket já assumido...');
  const claimConflictRes = await request('POST', `/tickets/${ticketId}/claim`, null, adminToken1);
  assert(claimConflictRes.status === 409, 'Retornou 409 Conflict ao tentar assumir ticket que já tem técnico');

  // 12. Técnico1 move status para "Aguardando usuário"
  console.log('\n[Passo 12] Técnico1 altera status para "Aguardando usuário"...');
  const statusWaitUser = await request('PUT', `/tickets/${ticketId}/status`, { status: 'Aguardando usuário' }, techToken);
  assert(statusWaitUser.status === 200, 'Status alterado para "Aguardando usuário"');

  // Testar retrocesso inválido por Técnico (ex: de Aguardando usuário para Aberto deve falhar)
  console.log('\n[Passo 12.1] Testar rejeição de retrocesso inválido pelo técnico...');
  const invalidRetro = await request('PUT', `/tickets/${ticketId}/status`, { status: 'Aberto' }, techToken);
  assert(invalidRetro.status === 400, 'Backend rejeitou retrocesso inválido para o Técnico');

  // 13. Usuário comenta no ticket e o sistema retorna automaticamente para "Em andamento"
  console.log('\n[Passo 13] Usuário responde e ticket retorna automaticamente para "Em andamento"...');
  const userComment = await request('POST', `/tickets/${ticketId}/comments`, {
    comment: 'Segue mensagem de erro exata que apareceu no navegador: Connection refused.'
  }, userToken);
  assert(userComment.status === 201, 'Comentário do usuário adicionado');
  assert(userComment.data.autoResumedStatus === true, 'autoResumedStatus foi acionado');

  const checkResumed = await request('GET', `/tickets/${ticketId}`, null, userToken);
  assert(checkResumed.data.ticket.status === 'Em andamento', 'Status voltou para "Em andamento" após resposta do usuário');

  // 14. Admin cadastra Técnico2 e reatribui o ticket
  console.log('\n[Passo 14] Admin cria Técnico2 e reatribui o ticket...');
  const createTech2 = await request('POST', '/users', {
    username: 'tecnico2',
    name: 'Ana Especialista',
    role: 'tecnico',
    temporary_password: 'tempPass123'
  }, adminToken1);
  const tech2Id = createTech2.data.user.id;

  const reassignRes = await request('PUT', `/tickets/${ticketId}/reassign`, { technician_id: tech2Id }, adminToken1);
  assert(reassignRes.status === 200, 'Ticket reatribuído com sucesso pelo Admin');
  assert(reassignRes.data.ticket.technician_id === tech2Id, 'technician_id agora é do Técnico2');

  // 15. Verificar que Técnico1 perdeu acesso ao ticket
  console.log('\n[Passo 15] Verificar que Técnico anterior perdeu acesso...');
  const tech1AccessLost = await request('GET', `/tickets/${ticketId}`, null, techToken);
  assert(tech1AccessLost.status === 403, 'Técnico anterior recebe 403 Forbidden ao tentar acessar ticket reatribuído');

  // 16. Técnico2 faz login, troca de senha e conclui o ticket
  console.log('\n[Passo 16] Técnico2 assume e conclui o ticket...');
  const tech2Login = await request('POST', '/auth/login', { username: 'tecnico2', password: 'tempPass123' });
  const tech2Token = tech2Login.data.token;
  await request('POST', '/auth/change-password', {
    newPassword: 'tech2SecretPass789',
    confirmPassword: 'tech2SecretPass789'
  }, tech2Token);

  // Técnico2 altera para Resolvido, depois para Concluído
  const setResolved = await request('PUT', `/tickets/${ticketId}/status`, { status: 'Resolvido' }, tech2Token);
  assert(setResolved.status === 200, 'Status alterado para Resolvido');

  const setConcluded = await request('PUT', `/tickets/${ticketId}/status`, { status: 'Concluído' }, tech2Token);
  assert(setConcluded.status === 200, 'Status alterado para Concluído');
  assert(setConcluded.data.ticket.closed_at !== null, 'closed_at foi preenchido');

  // 17. Admin consulta relatório de acompanhamento
  console.log('\n[Passo 17] Admin consulta Relatório de Acompanhamento...');
  const reportsRes = await request('GET', '/reports', null, adminToken1);
  assert(reportsRes.status === 200, 'Relatório consultado com sucesso');
  assert(reportsRes.data.summary.totalTickets >= 1, 'Total de tickets computado');
  assert(reportsRes.data.summary.closedTickets >= 1, 'Total de tickets concluídos computado');
  console.log(`    Tempo médio de resolução formatado: ${reportsRes.data.summary.avgResolutionFormatted}`);

  // 18. Testar notificação de solicitação de troca de senha
  console.log('\n[Passo 18] Solicitação pública de redefinição de senha...');
  const reqReset = await request('POST', '/auth/request-password-reset', { username: 'usuario1' });
  assert(reqReset.status === 200, 'Solicitação enviada');

  const adminNotifs = await request('GET', '/notifications', null, adminToken1);
  assert(adminNotifs.status === 200, 'Notificações do Admin consultadas');
  const foundResetNotif = adminNotifs.data.notifications.some(n => n.title.includes('Redefinição de Senha'));
  assert(foundResetNotif, 'Admin recebeu notificação da solicitação de troca de senha');

  // 19. Testar invalidação de sessões ao resetar senha de usuário
  console.log('\n[Passo 19] Invalidação de sessões ao resetar senha de usuário...');
  const resetUserRes = await request('POST', `/users/${user1Id}/reset-password`, {
    temporary_password: 'anotherTempPass123'
  }, adminToken1);
  assert(resetUserRes.status === 200, 'Admin resetou senha do usuário');

  // Usuário tenta usar o token antigo -> deve retornar 401
  const deadTokenRes = await request('GET', '/tickets/my', null, userToken);
  assert(deadTokenRes.status === 401, 'Token antigo do usuário foi imediatamente invalidado (401)');

  // 20. Logout invalidando o token do Admin
  console.log('\n[Passo 20] Logout invalidando sessão...');
  const logoutRes = await request('POST', '/auth/logout', null, adminToken1);
  assert(logoutRes.status === 200, 'Logout bem-sucedido');

  const afterLogout = await request('GET', '/tickets/my', null, adminToken1);
  assert(afterLogout.status === 401, 'Token de admin inválido após logout (401)');

  console.log('\n======================================================');
  console.log('🎉 TODOS OS 20 PASSOS DO FLUXO COMPLETO FORAM VALIDADOS COM SUCESSO!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
