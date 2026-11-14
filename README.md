# Helpdesk Central - Sistema de Gerenciamento de Tickets

Sistema web completo e funcional para gerenciamento de chamados de suporte técnico (Helpdesk), desenvolvido em arquitetura monorepo com separação estrita entre backend e frontend, autenticação JWT com controle de sessões em banco de dados SQLite local, controle de acesso baseado em perfis (Admin, Técnico e Usuário) e sistema de notificações em tempo real com polling.

---

## 🛠️ Stack Tecnológica

- **Frontend:** React 19 (JavaScript puro, sem TypeScript), Vite, React Router DOM v7, Lucide Icons.
- **Backend:** Node.js, Express, Better-SQLite3, JWT (`jsonwebtoken`), Criptografia (`bcryptjs`), Rate Limiting (`express-rate-limit`), CORS.
- **Banco de Dados:** SQLite local (`better-sqlite3`), com foreign keys ativas e criação automática do schema na inicialização.
- **Estrutura:** Monorepo com `/backend` e `/frontend`.

---

## 👥 Perfis de Acesso e Regras de Negócio

| Perfil | Permissões e Acesso |
| :--- | :--- |
| **Administrador (Admin)** | • Visualiza e gerencia **todos** os tickets do sistema.<br>• Cria usuários e define perfis (Admin, Técnico, Usuário).<br>• Ativa, desativa e reseta senhas de usuários (invalidando sessões ativas).<br>• Reatribui tickets entre técnicos ativos (com registro automático no histórico).<br>• Altera status de qualquer ticket para qualquer valor e pode apagar tickets.<br>• Acesso ao **Relatório de Acompanhamento** com métricas e tempo médio de resolução. |
| **Técnico** | • Acesso à tela **Novos tickets** (sem responsável) para assumir chamados (operação atômica com bloqueio de concorrência 409).<br>• Visualiza apenas tickets atribuídos a ele em **Meus tickets** (se for reatribuído a outro técnico, perde o acesso imediatamente).<br>• Responde aos tickets sob sua responsabilidade.<br>• Transição de status estritamente progressiva (`Aberto` → `Em andamento` → `Aguardando usuário` / `Resolvido` → `Concluído`). Não pode retroceder, exceto retorno para `Em andamento` quando o usuário responder.<br>• Confirma a solução e conclusão do ticket (`Concluído`). |
| **Usuário** | • Abre tickets próprios (Título, Descrição, Categoria e Prioridade).<br>• Visualiza e acompanha apenas os seus próprios tickets em **Meus tickets**.<br>• Não altera status, não reatribui e não conclui tickets.<br>• Responde nos seus chamados (ao responder um ticket em `Aguardando usuário`, o status retorna automaticamente para `Em andamento`).<br>• Notificado sempre que técnicos/admins respondem ao seu chamado. |

---

## 🔐 Autenticação e Ciclo de Senhas

1. **Login e Sessões:**
   - Tela de login com usuário e senha.
   - Protegido por rate-limiting contra força bruta.
   - Ao logar, gera JWT com validade de 8h e registra a sessão na tabela `sessions`.
   - O middleware valida tanto a assinatura do JWT quanto a existência da sessão ativa no banco.
   - Ao deslogar (`Logout`), a sessão é removida do banco, invalidando o token instantaneamente.
   - Ao resetar a senha de um usuário ou desativá-lo, todas as suas sessões ativas são invalidadas no banco.

2. **Troca Obrigatória de Senha (Senha Temporária):**
   - Usuários criados pelo Admin ou que tiveram senha resetada recebem `must_change_password = 1`.
   - No login seguinte, o backend **bloqueia todas as rotas da aplicação** (retornando `403`), exceto a rota de troca de senha e logout.
   - O usuário é forçado a definir uma nova senha pessoal antes de acessar qualquer tela. Após a troca, a flag é zerada (`0`).
   - Não há opção de alteração espontânea de senha pelo usuário: a troca apenas ocorre nesse fluxo obrigatório.

3. **Solicitação de Troca de Senha:**
   - Na tela de login, há o link **"Solicitar troca da senha"**.
   - O usuário informa seu nome de usuário. Se existir, é gerada uma notificação no sino para todos os administradores ativos.

4. **Notificações (Sino no Header):**
   - Contador de não lidas e dropdown com histórico.
   - Polling automático a cada 30 segundos.
   - Eventos: solicitação de troca de senha (para Admins), novo ticket criado (Admins e Técnicos), técnico assumiu ticket (para Usuário dono), resposta no ticket (para dono ou técnico), ticket reatribuído (novo técnico, técnico anterior e usuário dono).

---

## 🚀 Instruções de Instalação e Execução

### Pré-requisitos
- **Node.js** (versão 18+ recomendada) e **npm**.

---

### 1. Configuração e Inicialização do Backend

Abra um terminal e acesse a pasta `backend`:

```bash
cd backend

# Instalar dependências
npm install

# (Opcional) Executar o seed inicial manualmente
# Observação: O schema e o Admin padrão são criados automaticamente na inicialização do servidor.
npm run seed

# Iniciar o servidor
npm start
```
O servidor backend iniciará em `http://localhost:3001`.

#### Variáveis de Ambiente do Backend (`backend/.env`):
- `PORT`: Porta do servidor HTTP (padrão: `3001`).
- `JWT_SECRET`: Chave secreta para assinatura dos tokens JWT.
- `INITIAL_ADMIN_PASSWORD`: Senha do Admin inicial gerada no seed (padrão: `admin123`).

---

### 2. Configuração e Inicialização do Frontend

Abra outro terminal e acesse a pasta `frontend`:

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento com Vite
npm run dev
```
O frontend estará acessível em: `http://localhost:5173`.

---

## 🔑 Credenciais Padrão do Seed

| Campo | Valor Inicial |
| :--- | :--- |
| **Usuário** | `admin` |
| **Senha Temporária Inicial** | `admin123` |
| **Perfil** | Administrador |
| **Flag inicial** | `must_change_password = 1` |

> [!NOTE]
> Ao fazer o primeiro login com `admin` e `admin123`, a tela de **Troca Obrigatória de Senha** será exibida automaticamente solicitando que você defina uma nova senha pessoal (mínimo 6 caracteres).

---

## 🧪 Teste Automatizado de Fluxo Completo

Para verificar todos os requisitos e regras de negócio da especificação ponta a ponta:

1. Garanta que o servidor backend esteja rodando (`cd backend && npm start`).
2. Em outro terminal, execute:

```bash
node backend/test-flow.js
```

O script testará automaticamente os 20 passos do ciclo de vida:
- Login com senha temporária
- Bloqueio de rotas pelo middleware com `must_change_password = 1`
- Troca obrigatória de senha e liberação de acesso
- Criação de usuários (Técnico e Usuário comum)
- Abertura de ticket pelo Usuário
- Notificações de novos tickets
- Técnico assumindo ticket de forma atômica
- Detecção e retorno de erro 409 em corrida concorrente
- Transições de status progressivas e bloqueio de retrocesso
- Resposta do usuário retornando status automaticamente para "Em andamento"
- Reatribuição do ticket pelo Admin para outro técnico
- Perda imediata de acesso do técnico anterior
- Conclusão do chamado (`closed_at`)
- Relatório de acompanhamento com tempo médio de resolução
- Solicitação pública de redefinição de senha com alerta aos Admins
- Invalidação imediata de sessões ativas ao resetar senha de usuário
- Logout com exclusão da sessão no banco de dados e revogação do token
