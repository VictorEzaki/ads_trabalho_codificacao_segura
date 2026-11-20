// req, res
const ExpenseController = require('../controllers/expense');
const HttpError = require('./../errors/HttpError');
const fs = require('fs/promises');
const path = require('path');

const uploadDirectory = path.resolve(__dirname, '../../uploads/cupons');

class ExpenseView {
    async getAll(req, res, next) {
        try {
            const { categoryId, dateIni, dateFim, vlMin, vlMax, status } = req.query;
            const userId  = req.user.id;
            console.log(vlMin);
            console.log(vlMax);
            
            const expenses = await ExpenseController.getAll(categoryId, dateIni, dateFim, vlMin, vlMax, status, userId);
            
            res.status(200).json(expenses);
        } catch (error) {
            next(error)
        }
    }
    
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            
            const expense = await ExpenseController.getById(Number(id));
            
            res.status(200).json(expense);
        } catch (error) {
            next(error)
        }
    }
    
    async create(req, res, next) {
        try {
            const { amount, date, description, status, categoryId } = req.body;
            const userId = req.user.id;
            let receiptPath = null;

            if (req.file) {
                // Confere a assinatura do arquivo: um PDF válido começa com %PDF-.
                const handle = await fs.open(req.file.path, 'r');
                const header = Buffer.alloc(5);
                await handle.read(header, 0, 5, 0);
                await handle.close();

                if (header.toString() !== '%PDF-') {
                    await fs.unlink(req.file.path).catch(() => {});
                    throw new HttpError(400, 'O arquivo enviado não é um PDF válido.');
                }

                receiptPath = req.file.filename;
            }

            const expense = await ExpenseController.create(
                Number(amount), date, description, status,
                Number(categoryId), userId, receiptPath
            );

            res.status(201).json(expense);
        } catch (error) {
            if (req.file?.path) {
                await fs.unlink(req.file.path).catch(() => {});
            }
            next(error);
        }
    }
    
    async update(req, res, next) {
        try {
            const { amount, date, description, status, categoryId } = req.body;
            const { id } = req.params;
            let receiptPath;

            if (req.file) {
                const handle = await fs.open(req.file.path, 'r');
                const header = Buffer.alloc(5);
                await handle.read(header, 0, 5, 0);
                await handle.close();
                if (header.toString() !== '%PDF-') {
                    await fs.unlink(req.file.path).catch(() => {});
                    throw new HttpError(400, 'O arquivo enviado não é um PDF válido.');
                }
                receiptPath = req.file.filename;
            }

            const previousReceipt = req.file ? await ExpenseController.getReceiptPathForUpdate(Number(id), req.user.id) : null;
            const expense = await ExpenseController.update(
                amount === undefined ? undefined : Number(amount), date, description, status,
                categoryId === undefined ? undefined : Number(categoryId), req.user.id, Number(id), receiptPath
            );

            if (req.file && previousReceipt && previousReceipt !== receiptPath) {
                await fs.unlink(path.join(uploadDirectory, path.basename(previousReceipt))).catch(() => {});
            }
            res.status(200).json(expense);
        } catch (error) {
            if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
            next(error);
        }
    }

    async getReceipt(req, res, next) {
        try {
            const filename = await ExpenseController.getReceipt(Number(req.params.id), req.user.id);
            const safePath = path.join(uploadDirectory, path.basename(filename));
            await fs.access(safePath);
            const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `${disposition}; filename="cupom-${req.params.id}.pdf"`);
            res.sendFile(safePath);
        } catch (error) {
            next(error);
        }
    }
    
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            
            await ExpenseController.delete(Number(id));
            
            res.status(204).send();
        } catch (error) {
            next(error)
        }
    }
    
    async getTotalExpenses(req, res, next) {
        try {
            const userId = req.user.id;
            
            const totalExpenses = await ExpenseController.getTotalExpenses(userId);
            
            res.status(200).json(totalExpenses);
        } catch (error) {
            next(error)
        }
    }
    
    async getQuantidadeExpenses(req, res, next) {
        try {
            const userId  = req.user.id;
            
            const quantidadeExpenses = await ExpenseController.getQuantidadeExpenses(userId);
            
            res.status(200).json(quantidadeExpenses);
        } catch (error) {
            next(error)
        }
    }
    
    async getTotalExpensesByCategory(req, res, next) {
        try {
            const userId = req.user.id;
            
            const totalExpensesByCategory = await ExpenseController.getTotalExpensesByCategory(userId);
            
            res.status(200).json(totalExpensesByCategory);
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new ExpenseView();