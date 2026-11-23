# FinanceApp - Sistema de Controle Financeiro Pessoal
 
## Descrição do Projeto
 
O **FinanceApp** é uma aplicação web para controle financeiro pessoal, evoluída na disciplina de **Codificação Segura**. O sistema permite o gerenciamento completo de despesas, receitas, categorias e acompanhamento de saldo e indicadores em um painel administrativo.
 
Principais funcionalidades atuais:
 
- **Autenticação e Sessão Segura**: Cadastro e login de usuários com hash de senha (`bcrypt`), tokens JWT (`accessToken` e `refreshToken` com rotação e revogação) armazenados em cookies `HttpOnly` e proteção contra CSRF via Double Submit Cookie (`X-CSRF-Token`).
- **Despesas**: Cadastro, edição, exclusão, filtros por texto, período e faixa de valor, além de anexo opcional de cupom fiscal em PDF (validado por assinatura binária).
- **Receitas**: Cadastro, edição, exclusão e histórico de entradas financeiras, com anexo opcional de comprovante em PDF ou PNG (validado por extensão, MIME type e assinatura binária).
- **Categorias**: Cadastro, edição, listagem e remoção de categorias de despesas.
- **Dashboard e Atalhos Rápidos**: Exibição de saldo total (receitas menos despesas), total e quantidade de despesas, gráfico de gastos por categoria e botões globais de atalho para lançamento rápido de receitas e despesas.
- **Controle parental**: Um usuário administrador pode criar outros usuários com perfil restrito somente ao gerenciamento de suas despesas. As despesas desses usuário são considerados no balanço de saldo do usuário administrador.
 
---
 
## Tecnologias Utilizadas
 
### Backend
- **Node.js** e **Express 5**: Servidor HTTP e API RESTful organizada em camadas (`routes`, `views`, `controllers`, `models`).
- **Sequelize**, **Sequelize CLI** e **MySQL (`mysql2`)**: Modelagem, migrations, seeders e consultas parametrizadas ao banco relacional.
- **jsonwebtoken**, **bcrypt** e **cookie-parser**: Autenticação via cookies `HttpOnly`, rotação de refresh tokens e proteção CSRF.
- **Helmet**: Cabeçalhos de segurança HTTP (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Strict-Transport-Security`).
- **Multer**: Recebimento de uploads de comprovantes (`PDF` e `PNG`) com limite de tamanho e validação de assinatura.
- **Swagger (`swagger-jsdoc` e `swagger-ui-express`)**: Documentação interativa da API (habilitada apenas fora de produção).
- **dotenv** e **cors**: Configuração de ambiente e controle de origens permitidas.
 
### Frontend
- **React 19** e **Vite**: Interface SPA responsiva.
- **React Router DOM**: Roteamento público e rotas autenticadas protegidas.
- **Axios**: Comunicação com a API com envio automático de cookies, token CSRF e renovação automática de sessão.
- **ApexCharts (`react-apexcharts`)** e **FontAwesome**: Gráficos e ícones da interface.
 
---
 
## Como Executar o Projeto
 
### Pré-requisitos
- Node.js (v20 ou superior recomendado)
- npm
- MySQL em execução
 
### 1. Configurar e iniciar o Backend
 
Acesse a pasta do backend e instale as dependências:
 
```bash
cd backend
npm install
```
 
Crie o arquivo `.env` na pasta `backend/` com base em `backend/.env.example`:
 
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
 
DB_NAME=expense
DB_USER=root
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=3306
DB_DIALECT=mysql
 
JWT_ACCESS_SECRET=sua_chave_access_jwt
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=sua_chave_refresh_jwt
JWT_REFRESH_EXPIRES_IN=7d
 
COOKIE_ACCESS_MAX_AGE_MS=900000
COOKIE_REFRESH_MAX_AGE_MS=604800000
COOKIE_SAME_SITE=lax
```
 
Crie o banco de dados, execute as migrations e (opcionalmente) os seeders:
 
```bash
npm run db:create
npm run db:migrate
npm run db:seed
```
 
Inicie o servidor backend:
 
```bash
npm run dev
```
 
Ou em modo watch com nodemon:
 
```bash
npm run watch
```
 
O backend estará disponível em `http://localhost:3001`.
 
### 2. Configurar e iniciar o Frontend
 
Em outro terminal, acesse a pasta do frontend e instale as dependências:
 
```bash
cd frontend
npm install
```
 
Crie o arquivo `.env` na pasta `frontend/` com base em `frontend/.env.example`:
 
```env
VITE_BACKEND_URL=http://localhost:3001
```
 
Inicie a aplicação frontend:
 
```bash
npm run dev
```
 
O frontend estará disponível em `http://localhost:5173`.
 
---
 
## Documentação Swagger
 
Com o servidor backend em execução em ambiente de desenvolvimento (`NODE_ENV !== 'production'`), acesse a documentação interativa da API no navegador:
 
```text
http://localhost:3001/api-docs
```
 
---
 
## Segurança e Tratamento de Vulnerabilidades
 
Abaixo está o resumo de como o sistema **FinanceApp** trata os requisitos de segurança definidos para a disciplina, com base nas proteções implementadas no backend e no frontend.
 
### 1. Hardcoded SQL (Uso de ORM e Queries Parametrizadas)
 
- Toda a comunicação com o banco de dados MySQL é realizada por meio do ORM **Sequelize** (`backend/src/models/database.js` e models `user.js`, `expense.js`, `income.js`, `category.js` e `refreshToken.js`).
- O sistema não utiliza consultas SQL escritas manualmente com concatenação de strings nem chamadas diretas a `sequelize.query()`.
- Todas as operações de busca, criação, atualização, exclusão e agregação usam métodos do ORM (`findAll`, `findOne`, `findByPk`, `create`, `update`, `destroy`, `sum`, `count`) com objetos de condição e operadores (`Op.between`, `Op.gte`, `Op.lte`, `Op.ne`), gerando consultas parametrizadas automaticamente.
 
### 2. SQL Injection
 
- Como todas as queries passam pelo Sequelize utilizando o driver `mysql2` com consultas parametrizadas (*prepared statements*), valores enviados pelo usuário via `req.body`, `req.params` ou `req.query` são tratados como parâmetros de dados, e não como instruções SQL.
- Todos os fluxos (usuários, receitas, despesas, categorias e filtros `req.query`) passam por validação prévia de tipo, formato e faixa em `backend/src/utils/inputValidator.js` (`parsePositiveId`, `parsePositiveAmount`, `parseNonNegativeAmount`, `validateIsoDate`, `validatePastOrTodayDate`) e nos controllers antes de chegarem ao banco.
 
### 3. Cross-Site Scripting (XSS)
 
- **Escape automático no Frontend (React)**: Todos os dados exibidos nas telas (descrições de despesas e receitas, nomes de categorias, nomes e e-mails de usuários) são renderizados via JSX, onde o React faz o escape automático de caracteres HTML. Não há uso de `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `document.write` ou `eval`.
- **Proteção de tokens contra leitura via script**: Os tokens de autenticação (`accessToken` e `refreshToken`) são gravados em cookies `HttpOnly`, impedindo que eventuais scripts maliciosos no navegador acessem a sessão por meio de `document.cookie` ou `localStorage`.
- **Content-Security-Policy (CSP) e cabeçalhos `nosniff`**: O middleware `helmet` (`backend/src/middlewares/securityHeaders.js` e `backend/src/app.js`) aplica uma CSP restritiva nas rotas da API (`default-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `frame-ancestors 'none'`), permitindo recursos locais do Swagger UI apenas fora de produção. Além disso, `X-Content-Type-Options: nosniff` é enviado globalmente pelo `helmet` e reforçado na entrega de comprovantes tanto de receitas (`backend/src/views/income.js`) quanto de despesas (`backend/src/views/expense.js`), evitando que o navegador interprete arquivos anexados como HTML/script.
- **Sanitização de textos**: A função `sanitizeText` (`backend/src/utils/inputValidator.js`) remove caracteres de controle e espaços extras em textos de usuários, receitas, despesas e categorias.
 
### 4. Cross-Site Request Forgery (CSRF)
 
- O sistema implementa a proteção **Double Submit Cookie** no middleware `backend/src/middlewares/csrf.js`, aplicado globalmente às rotas `/api` em `backend/src/app.js`.
- **Funcionamento**:
  1. No login (`POST /api/auth/login`) e na renovação da sessão (`POST /api/auth/refresh`), o backend gera um token aleatório de 32 bytes (`generateCsrfToken()` em `backend/src/utils/token.js`) e o envia no cookie `csrfToken`.
  2. No frontend (`frontend/src/services/api.js`), um interceptor do Axios lê o cookie `csrfToken` (via `getCookie` em `frontend/src/utils/cookies.js`) e o envia automaticamente no cabeçalho `X-CSRF-Token` em todas as requisições que alteram estado (`POST`, `PUT`, `PATCH`, `DELETE`).
  3. No backend, o `csrfMiddleware` libera apenas métodos seguros (`GET`, `HEAD`, `OPTIONS`) e as rotas públicas sem sessão (`POST /api/auth/login` e `POST /api/users`). Nas demais rotas, compara o cookie e o cabeçalho usando `timingSafeEqualStrings` (`crypto.timingSafeEqual`), evitando ataques de *timing* e bloqueando requisições sem o token válido com HTTP `403`.
- **Reforço adicional**: O backend restringe origens permitidas via `CORS` (`CORS_ORIGIN`, `credentials: true` em `backend/src/app.js`, retornando `HttpError(403, ...)` para origens não autorizadas) e configura os cookies com atributo `SameSite` (`lax` por padrão, via `COOKIE_SAME_SITE` em `backend/src/utils/cookie.js`).
 
### 5. Mass Assignment
 
- Os endpoints não repassam `req.body` diretamente para os métodos `create` ou `update` do Sequelize. Cada view e controller extrai explicitamente apenas os campos esperados (*allowlist*).
- **Exemplos no código**:
  - **Auto-cadastro (`POST /api/users`)**: Em `backend/src/views/user.js` e `backend/src/controllers/user.js`, o sistema lê apenas `email`, `password` e `name`, e o servidor força `role: 'admin'` e `parentId: null`, ignorando qualquer tentativa do cliente de enviar esses campos manualmente.
  - **Cadastro de dependente (`POST /api/family/users`)**: O servidor força `role: 'user'` e define `parentId` a partir do usuário autenticado (`req.user.id`), nunca pelo corpo da requisição.
  - **Despesas e Receitas (`POST/PUT /api/expenses` e `/api/incomes`)**: O campo `userId` é obtido da sessão autenticada (`req.user.id`) ou preservado do registro original, e o campo `receiptPath` é definido exclusivamente pelo servidor após o upload validado pelo `multer`.
- **Filtragem de saída (DTOs)**: Métodos como `UserController.mapUser` e `mapIncomeDto` selecionam apenas os campos que podem ser retornados na API, evitando expor o hash da senha.
 
### 6. Session Hijacking (Sequestro de Sessão)
 
- **Cookies `HttpOnly` e escopo reduzido**: O `accessToken` (expiração padrão de `15m`) e o `refreshToken` (expiração padrão de `7d`) são armazenados em cookies `HttpOnly`, com flag `SameSite` e flag `secure` ativada quando `NODE_ENV === 'production'` ou `COOKIE_SAME_SITE === 'none'` (`backend/src/utils/cookie.js`). Além disso, o cookie `refreshToken` possui `path: '/api/auth'`, sendo enviado pelo navegador apenas para rotas de autenticação.
- **Segredos JWT exclusivamente via ambiente**: Em `backend/src/config/auth.js`, as chaves de assinatura `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` são lidas apenas das variáveis de ambiente (sem chaves de fallback fixas no código). Em produção, o `helmet` também ativa `Strict-Transport-Security` (HSTS) para reforçar o uso de HTTPS.
- **Armazenamento por hash e rotação de Refresh Token**: Os refresh tokens não são salvos em texto puro no banco de dados — a tabela `refresh_tokens` armazena apenas o hash SHA-256 (`hashToken` em `backend/src/utils/token.js`). A cada chamada em `POST /api/auth/refresh`, dentro de uma transação, o token atual é revogado (`revokedAt`) e substituído por um novo par de tokens.
- **Detecção de reutilização (*Reuse Detection*)**: Caso um refresh token já revogado seja reutilizado, o sistema identifica possível comprometimento da sessão e revoga imediatamente todos os refresh tokens do usuário (`revokeAllByUserId`).
- **Encerramento e validação contínua**: O logout (`POST /api/auth/logout`) revoga o refresh token no banco e limpa todos os cookies de autenticação. O `authMiddleware` (`backend/src/middlewares/auth.js`) também verifica no banco se o usuário ainda existe a cada requisição, invalidando imediatamente o acesso caso um dependente seja excluído.
 
### 7. Outras Práticas de Segurança Implementadas
 
- **Autenticação Segura e Política de Senha Forte**:
  - As senhas são armazenadas com `bcrypt` (fator de custo `10`) em `backend/src/controllers/user.js`. No login, erros retornam a mensagem genérica `"Credenciais inválidas."` para evitar enumeração de e-mails cadastrados.
  - A função `validatePassword` exige no cadastro e na alteração de senha: mínimo de **8 caracteres**, máximo de **72 bytes UTF-8** (evitando o truncamento silencioso do `bcrypt`), ausência de caracteres de controle e pelo menos **1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial** (com orientação equivalente nos formulários do frontend).
- **Cabeçalhos de Segurança HTTP (`helmet`)**: Configurados em `backend/src/middlewares/securityHeaders.js` e aplicados em `backend/src/app.js`, incluindo `X-Frame-Options: DENY` (proteção contra *Clickjacking*), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Content-Security-Policy`, `Strict-Transport-Security` (em produção) e remoção do cabeçalho `X-Powered-By`.
- **Tratamento Seguro de Erros**: Em `backend/src/middlewares/errorHandler.js`, erros inesperados não expõem `error.message` nem *stack traces* na resposta HTTP `500` — os detalhes ficam registrados apenas no log interno do servidor e o cliente recebe a mensagem genérica `"Erro interno do servidor."`. Requisições com JSON malformado (`entity.parse.failed`) são tratadas com HTTP `400`.
- **Controle de Acesso (RBAC) e Prevenção de IDOR**: O middleware `requireRole('admin')` (`backend/src/middlewares/authorize.js`) impede que usuários dependentes (`role: 'user'`) acessem receitas, dashboard, gerenciamento de categorias ou gerenciamento da família (retornando HTTP `403`). Além disso, consultas e alterações de despesas, receitas e dependentes verificam o vínculo com `req.user.id` (ou `parentId` do administrador), retornando `404` quando um usuário tenta acessar recursos de outra conta ou família.
- **Upload Seguro de Arquivos e Prevenção de Path Traversal**:
  - Os uploads via `multer` possuem limite de tamanho (`10 MB`) e de quantidade (`1` arquivo por envio), com geração de nomes aleatórios por `crypto.randomUUID()`, descartando o nome original enviado pelo cliente.
  - Em receitas (`backend/src/utils/receiptFile.js`) e despesas (`backend/src/views/expense.js`), o arquivo é validado por extensão, MIME type e assinatura binária (*magic bytes* `%PDF-` ou cabeçalho PNG), removendo o arquivo do disco caso a validação falhe.
  - Na leitura/download de anexos de receitas (`resolveSafeReceiptPath` em `backend/src/utils/receiptFile.js`) e despesas (`path.basename` em `backend/src/views/expense.js`), o sistema impede acesso a caminhos fora da pasta de uploads (*Path Traversal*).
- **Validação de Entrada Padronizada**: O módulo `backend/src/utils/inputValidator.js` centraliza validações de IDs inteiros positivos (`parsePositiveId`, rejeitando booleanos, objetos e decimais), textos higienizados (`sanitizeText`), valores monetários positivos até `99999999.99` (`parsePositiveAmount`) e datas válidas não futuras em horário local (`validatePastOrTodayDate`). Despesas, categorias e filtros `req.query` (`validateListFilters` em `ExpenseController.getAll`, incluindo validação de faixas `dateIni <= dateFim` e `vlMin <= vlMax`) seguem o mesmo padrão.
- **Restrição por Ambiente (Swagger e Seeders)**: Em produção (`NODE_ENV === 'production'`), a rota `/api-docs` não é registrada em `backend/src/app.js` e os seeders de demonstração em `backend/src/seeders/` bloqueiam sua execução via `assertNotProduction()`. Em desenvolvimento, o seeder `20260627185409-demo-users.js` usa `'Senha@1234'` em vez da senha fraca `"123456"`.
