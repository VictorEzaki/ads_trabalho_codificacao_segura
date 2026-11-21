const express = require('express');

const router = express.Router();
const UserView = require('../views/user');
const authMiddleware = require('../middlewares/auth');
const { requireRole } = require('../middlewares/authorize');

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Criar novo usuário
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Victor
 *               email:
 *                 type: string
 *                 example: victor@email.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Erro de validação nos dados enviados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               nomeObrigatorio:
 *                 $ref: '#/components/examples/UserNomeObrigatorio'
 *               emailObrigatorio:
 *                 $ref: '#/components/examples/UserEmailObrigatorio'
 *               senhaObrigatoria:
 *                 $ref: '#/components/examples/UserSenhaObrigatoria'
 *               senhaCurta:
 *                 $ref: '#/components/examples/UserSenhaCurta'
 *               emailInvalido:
 *                 $ref: '#/components/examples/UserEmailInvalido'
 *       409:
 *         description: Conflito ao criar usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               emailDuplicado:
 *                 $ref: '#/components/examples/UserEmailDuplicado'
 */
router.post("/users", UserView.create);
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: victor@email.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Erro de validação nos dados enviados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               InvalidCredentials:
 *                 $ref: '#/components/examples/InvalidCredentials'
 *               UserFieldsObrigatorio:
 *                 $ref: '#/components/examples/UserFieldsObrigatorio'
 */
router.post("/auth/login", UserView.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar sessão (Access e Refresh Token via cookies com rotação)
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     responses:
 *       200:
 *         description: Sessão renovada com sucesso (novos cookies definidos)
 *       401:
 *         description: Refresh token ausente, inválido, expirado ou reutilizado
 *       403:
 *         description: Token CSRF inválido ou ausente
 */
router.post("/auth/refresh", UserView.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Encerrar sessão revogando o refresh token e limpando os cookies
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     responses:
 *       204:
 *         description: Logout realizado com sucesso
 *       403:
 *         description: Token CSRF inválido ou ausente
 */
router.post("/auth/logout", UserView.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Retorna os dados do usuário autenticado via cookie HttpOnly
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário autenticado
 *       401:
 *         description: Não autenticado
 */
router.get("/auth/me", authMiddleware, UserView.me);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retorna todos os usuários
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Objeto de usuário
 *       401:
 *         description: Erro de autorização
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidToken:
 *                 $ref: '#/components/examples/InvalidToken'
 *               tokenNotProvide:
 *                 $ref: '#/components/examples/TokenNotProvide'
 *               tokenMalFormated:
 *                 $ref: '#/components/examples/TokenMalFormated'
 *       500:
 *          description: Ocorreu um erro ao buscar usuários
 */
router.get("/users", authMiddleware, requireRole('admin'), UserView.getAll);

/**
 * @swagger
 * /family/users:
 *   get:
 *     summary: Listar usuários filhos da família do administrador
 *     tags: [Family]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de dependentes da família
 *       403:
 *         description: Acesso negado (somente administradores)
 */
router.get("/family/users", authMiddleware, requireRole('admin'), UserView.getFamilyMembers);

/**
 * @swagger
 * /family/users:
 *   post:
 *     summary: Criar usuário dependente (role user) vinculado ao administrador autenticado
 *     tags: [Family]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dependente criado com sucesso
 *       403:
 *         description: Acesso negado (somente administradores)
 */
router.post("/family/users", authMiddleware, requireRole('admin'), UserView.createFamilyMember);

/**
 * @swagger
 * /family/users/{id}:
 *   put:
 *     summary: Editar usuário dependente da própria família
 *     tags: [Family]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dependente atualizado com sucesso
 *       403:
 *         description: Acesso negado (somente administradores)
 *       404:
 *         description: Usuário não encontrado
 */
router.put("/family/users/:id", authMiddleware, requireRole('admin'), UserView.updateFamilyMember);

/**
 * @swagger
 * /family/users/{id}:
 *   delete:
 *     summary: Remover usuário dependente da própria família
 *     tags: [Family]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Dependente removido com sucesso
 *       403:
 *         description: Acesso negado (somente administradores)
 *       404:
 *         description: Usuário não encontrado
 */
router.delete("/family/users/:id", authMiddleware, requireRole('admin'), UserView.deleteFamilyMember);
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Buscar usuário por ID
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Objeto de usuário
 *       401:
 *         description: Erro de autorização
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidToken:
 *                 $ref: '#/components/examples/InvalidToken'
 *               tokenNotProvide:
 *                 $ref: '#/components/examples/TokenNotProvide'
 *               tokenMalFormated:
 *                 $ref: '#/components/examples/TokenMalFormated'
 *       404:
 *         description: Nenhum usuário encontrado
 */
router.get("/users/:id", authMiddleware, UserView.getById);
/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Editar um usuário
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Victor
 *               email:
 *                 type: string
 *                 example: victor@email.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Objeto de usuário
 *       400:
 *         description: Erro de validação nos dados enviados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               nomeObrigatorio:
 *                 $ref: '#/components/examples/UserNomeObrigatorio'
 *               emailObrigatorio:
 *                 $ref: '#/components/examples/UserEmailObrigatorio'
 *               senhaObrigatoria:
 *                 $ref: '#/components/examples/UserSenhaObrigatoria'
 *               senhaCurta:
 *                 $ref: '#/components/examples/UserSenhaCurta'
 *               emailInvalido:
 *                 $ref: '#/components/examples/UserEmailInvalido'
 *       401:
 *         description: Erro de autorização
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidToken:
 *                 $ref: '#/components/examples/InvalidToken'
 *               tokenNotProvide:
 *                 $ref: '#/components/examples/TokenNotProvide'
 *               tokenMalFormated:
 *                 $ref: '#/components/examples/TokenMalFormated'
 *       404:
 *         description: Nenhum usuário encontrado
 *       409:
 *         description: Conflito ao editar usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               emailDuplicado:
 *                 $ref: '#/components/examples/UserEmailDuplicado'
 */
router.put("/users/:id", authMiddleware, UserView.update);
/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Deletar um usuário
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: integer
 *     responses:
 *       400:
 *         description: Erros de ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               IdObrigatorio:
 *                   $ref: '#/components/examples/IdObrigatorio'
 *               IdValid:
 *                   $ref: '#/components/examples/IdValid'
 *          
 *       401:
 *         description: Erro de autorização
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidToken:
 *                 $ref: '#/components/examples/InvalidToken'
 *               tokenNotProvide:
 *                 $ref: '#/components/examples/TokenNotProvide'
 *               tokenMalFormated:
 *                 $ref: '#/components/examples/TokenMalFormated'
 *       404:
 *         description: Nenhum usuário encontrado
 */
router.delete("/users/:id", authMiddleware, requireRole('admin'), UserView.delete);

module.exports = router;