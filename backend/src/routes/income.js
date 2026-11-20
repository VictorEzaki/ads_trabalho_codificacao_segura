const express = require('express');
const path = require('path');
const IncomeView = require('../views/income');
const authMiddleware = require('../middlewares/auth');
const { createIncomeReceiptUpload } = require('../utils/receiptFile');

const router = express.Router();
const uploadDirectory = path.resolve(__dirname, '../../uploads/receitas');
const receiptUpload = createIncomeReceiptUpload(uploadDirectory);

/**
 * @swagger
 * /incomes:
 *   post:
 *     summary: Criar receita
 *     tags: [Incomes]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [description, amount, date]
 *             properties:
 *               description:
 *                 type: string
 *                 example: Salário mensal
 *               amount:
 *                 type: number
 *                 example: 4500.00
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2026-11-05
 *               receipt:
 *                 type: string
 *                 format: binary
 *                 description: Comprovante opcional em PDF ou PNG (até 10 MB).
 *     responses:
 *       201:
 *         description: Receita criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Income'
 *       400:
 *         description: Erro de validação nos dados enviados
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Token CSRF inválido ou ausente
 */
router.post('/incomes', authMiddleware, receiptUpload.single('receipt'), IncomeView.create);

/**
 * @swagger
 * /incomes:
 *   get:
 *     summary: Listar receitas do usuário autenticado
 *     tags: [Incomes]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de receitas
 */
router.get('/incomes', authMiddleware, IncomeView.getAll);

/**
 * @swagger
 * /incomes/{id}:
 *   get:
 *     summary: Buscar receita por ID
 *     tags: [Incomes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *       404:
 *         description: Receita não encontrada
 */
router.get('/incomes/:id', authMiddleware, IncomeView.getById);

/**
 * @swagger
 * /incomes/{id}:
 *   put:
 *     summary: Editar receita
 *     tags: [Incomes]
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
 *         description: Receita atualizada
 *       404:
 *         description: Receita não encontrada
 */
router.put('/incomes/:id', authMiddleware, receiptUpload.single('receipt'), IncomeView.update);

/**
 * @swagger
 * /incomes/{id}/receipt:
 *   get:
 *     summary: Visualizar ou baixar comprovante da receita (PDF ou PNG)
 *     tags: [Incomes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comprovante em PDF ou PNG
 *       404:
 *         description: Anexo não encontrado
 */
router.get('/incomes/:id/receipt', authMiddleware, IncomeView.getReceipt);

/**
 * @swagger
 * /incomes/{id}:
 *   delete:
 *     summary: Excluir receita
 *     tags: [Incomes]
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
 *         description: Receita excluída
 *       404:
 *         description: Receita não encontrada
 */
router.delete('/incomes/:id', authMiddleware, IncomeView.delete);

/**
 * @swagger
 * /dashboard/balance:
 *   get:
 *     summary: Retorna total de receitas, despesas e saldo do usuário autenticado
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BalanceSummary'
 */
router.get('/dashboard/balance', authMiddleware, IncomeView.getDashboardBalance);

module.exports = router;
