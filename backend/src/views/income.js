const fs = require('fs/promises');
const path = require('path');
const IncomeController = require('../controllers/income');
const {
    validateReceiptMagicBytes,
    resolveSafeReceiptPath,
} = require('../utils/receiptFile');

const uploadDirectory = path.resolve(__dirname, '../../uploads/receitas');

async function removeUploadedFile(filePath) {
    if (filePath) {
        await fs.unlink(filePath).catch(() => {});
    }
}

async function processUploadedReceipt(file) {
    if (!file) {
        return null;
    }

    const ext = path.extname(file.filename || '').toLowerCase();
    await validateReceiptMagicBytes(file.path, ext);
    return file.filename;
}

class IncomeView {
    async getAll(req, res, next) {
        try {
            const incomes = await IncomeController.getAll(req.user.id);
            res.status(200).json(incomes);
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const income = await IncomeController.getById(req.params.id, req.user.id);
            res.status(200).json(income);
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const { description, amount, date } = req.body;
            const receiptPath = await processUploadedReceipt(req.file);

            const income = await IncomeController.create(
                { description, amount, date },
                req.user.id,
                receiptPath
            );

            res.status(201).json(income);
        } catch (error) {
            await removeUploadedFile(req.file?.path);
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const { description, amount, date } = req.body;
            const { id } = req.params;
            const receiptPath = req.file ? await processUploadedReceipt(req.file) : undefined;

            const previousReceipt = req.file
                ? await IncomeController.getReceiptPathForUpdate(id, req.user.id)
                : null;

            const income = await IncomeController.update(
                { id, description, amount, date },
                req.user.id,
                receiptPath
            );

            if (req.file && previousReceipt && previousReceipt !== receiptPath) {
                await removeUploadedFile(path.join(uploadDirectory, path.basename(previousReceipt)));
            }

            res.status(200).json(income);
        } catch (error) {
            await removeUploadedFile(req.file?.path);
            next(error);
        }
    }

    async getReceipt(req, res, next) {
        try {
            const filename = await IncomeController.getReceipt(req.params.id, req.user.id);
            const { safePath, contentType, extension } = resolveSafeReceiptPath(uploadDirectory, filename);
            await fs.access(safePath);

            const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
            const safeId = Number(req.params.id);

            res.setHeader('Content-Type', contentType);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Content-Disposition', `${disposition}; filename="comprovante-receita-${safeId}${extension}"`);
            res.sendFile(safePath);
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const deletedReceiptPath = await IncomeController.delete(req.params.id, req.user.id);
            if (deletedReceiptPath) {
                await removeUploadedFile(path.join(uploadDirectory, path.basename(deletedReceiptPath)));
            }
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    async getDashboardBalance(req, res, next) {
        try {
            const summary = await IncomeController.getDashboardBalance(req.user.id);
            res.status(200).json(summary);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new IncomeView();
