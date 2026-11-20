require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();
const errorHandlerMiddleware = require('./middlewares/errorHandler.js');
const csrfMiddleware = require('./middlewares/csrf.js');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const sequelize = require('./models/database.js');
require('./models/associations');

const ExpenseRouter = require('./routes/expense.js');
const UserRouter = require('./routes/user.js');
const CategoryRouter = require('./routes/category.js');

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api', csrfMiddleware);
app.use('/api', ExpenseRouter);
app.use('/api', UserRouter);
app.use('/api', CategoryRouter);

app.use(errorHandlerMiddleware);

const PORT = Number(process.env.PORT) || 3001;

async function main() {
  try {
    console.log('Iniciando conexão com o banco de dados...');
    await sequelize.authenticate();
    console.log('Autenticação com sucesso!');

    await sequelize.sync({ force: false });
    console.log('Sincronização com banco de dados realizada.');
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    const server = app.listen(PORT, () => {
      console.info(`✅ Servidor rodando na porta ${PORT}`);
    });

    server.on('error', (error) => {
      console.error('❌ Erro no servidor:', error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    console.error('Stack:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejection não tratada:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});

main();
