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
- **Multer**: Recebimento de uploads de comprovantes (`PDF` e `PNG`) com limite de tamanho e validação de assinatura.
- **Swagger (`swagger-jsdoc` e `swagger-ui-express`)**: Documentação interativa da API.
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

Com o servidor backend em execução, acesse a documentação interativa da API no navegador:

```text
http://localhost:3001/api-docs
```
