const express = require('express');

const router = express.Router();
const ExpenseView = require('../views/expense');

const authMiddleware = require('../middlewares/auth');
const { requireRole } = require('../middlewares/authorize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDirectory = path.resolve(__dirname, '../../uploads/cupons');
fs.mkdirSync(uploadDirectory, { recursive: true });

const receiptUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => callback(null, uploadDirectory),
        filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}.pdf`)
    }),
    fileFilter: (req, file, callback) => {
        const isPdfExtension = path.extname(file.originalname).toLowerCase() === '.pdf';
        const isPdfMime = file.mimetype === 'application/pdf';
        if (isPdfExtension && isPdfMime) return callback(null, true);
        callback(new Error('Envie somente arquivos PDF.'));
    },
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

/**
 * @swagger
 * /expenses:
 *   post:
 *     summary: Criar despesa
 *     tags: [Expenses]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [amount, date, status, categoryId]
 *             properties:
 *               description:
 *                 type: string
 *                 example: Jantar
 *               amount:
 *                 type: number
 *                 example: 150.40
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2026-02-10
 *               status:
 *                 type: string
 *                 enum: [PAGA, PENDENTE]
 *                 example: PAGA
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               receipt:
 *                 type: string
 *                 format: binary
 *                 description: Cupom fiscal em PDF (opcional, até 10 MB).
 *     responses:
 *       201:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Erro de validação nos dados enviados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               ExpenseMenorQueZero:
 *                 $ref: '#/components/examples/ExpenseMenorQueZero'
 *               validDate:
 *                 $ref: '#/components/examples/validDate'
 *               validValue:
 *                 $ref: '#/components/examples/validValue'
 *               categoryRequired:
 *                 $ref: '#/components/examples/categoryRequired'
 *               descriptionValid:
 *                 $ref: '#/components/examples/descriptionValid'
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro ao criar despesa
 */
router.post("/expenses", authMiddleware, receiptUpload.single("receipt"), ExpenseView.create);
/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: Listar despesas
 *     tags: [Expenses]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/expenses", authMiddleware, ExpenseView.getAll);
/**
 * @swagger
 * /expenses/{id}:
 *   get:
 *     summary: Buscar despesa por ID
 *     tags: [Expenses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da despesa
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Erro no envio dos dados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               IdObrigatorio:
 *                 $ref: '#/components/examples/IdObrigatorio'
 *               IdValid:
 *                 $ref: '#/components/examples/IdValid'
 *       404:
 *         description: Despesa não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/expenses/:id", authMiddleware, ExpenseView.getById);
/**
 * @swagger
 * /expenses/{id}:
 *   put:
 *     summary: Editar despesa
 *     tags: [Expenses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da despesa
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [amount, date, status, categoryId]
 *             properties:
 *               description:
 *                 type: string
 *                 example: Jantar
 *               amount:
 *                 type: double
 *                 example: 150.40
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2026-02-10
 *               status:
 *                 type: string
 *                 enum: [PAGA, PENDENTE]
 *                 example: PAGA
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               receipt:
 *                 type: string
 *                 format: binary
 *                 description: Novo cupom fiscal em PDF (opcional, até 10 MB). Se não enviado, mantém o anexo atual.
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Erro no envio dos dados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               IdObrigatorio:
 *                 $ref: '#/components/examples/IdObrigatorio'
 *               IdValid:
 *                 $ref: '#/components/examples/IdValid'
 *               ExpenseMenorQueZero:
 *                 $ref: '#/components/examples/ExpenseMenorQueZero'
 *               validDate:
 *                 $ref: '#/components/examples/validDate'
 *               validValue:
 *                 $ref: '#/components/examples/validValue'
 *               categoryRequired:
 *                 $ref: '#/components/examples/categoryRequired'
 *               descriptionValid:
 *                 $ref: '#/components/examples/descriptionValid'
 *               FormatDateInvalid:
 *                 $ref: '#/components/examples/FormatDateInvalid'
 *       404:
 *         description: Despesa não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.put("/expenses/:id", authMiddleware, receiptUpload.single("receipt"), ExpenseView.update);
router.get("/expenses/:id/receipt", authMiddleware, ExpenseView.getReceipt);
/**
 * @swagger
 * /expenses/{id}:
 *   delete:
 *     summary: Deletar despesa
 *     tags: [Expenses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da despesa
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Erro no envio dos dados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               IdObrigatorio:
 *                 $ref: '#/components/examples/IdObrigatorio'
 *               IdValid:
 *                 $ref: '#/components/examples/IdValid'
 *       404:
 *         description: Despesa não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.delete("/expenses/:id", authMiddleware, ExpenseView.delete);

// Dashboard
/**
 * @swagger
 * /dashboard/total-expenses:
 *   get:
 *     summary: Retorna o total de despesas
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: double
 *                   example: 140.5
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/dashboard/total-expenses", authMiddleware, requireRole('admin'), ExpenseView.getTotalExpenses);
/**
 * @swagger
 * /dashboard/expenses-count:
 *   get:
 *     summary: Retorna o total de despesas
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quantidade:
 *                   type: integer
 *                   example: 1
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/dashboard/expenses-count", authMiddleware, requireRole('admin'), ExpenseView.getQuantidadeExpenses);
/**
 * @swagger
 * /dashboard/expenses-by-category:
 *   get:
 *     summary: Retorna o total de despesas
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categoria:
 *                   type: string
 *                   example: Lazer
 *                 total:
 *                   type: double
 *                   example: 150.4
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/dashboard/expenses-by-category", authMiddleware, requireRole('admin'), ExpenseView.getTotalExpensesByCategory);

module.exports = router;
