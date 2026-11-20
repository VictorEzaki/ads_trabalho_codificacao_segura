const IncomeModel = require('../models/income');
const ExpenseModel = require('../models/expense');
const HttpError = require('../errors/HttpError');
const {
    parsePositiveId,
    sanitizeText,
    parsePositiveAmount,
    validatePastOrTodayDate,
} = require('../utils/inputValidator');

function mapIncomeDto(income) {
    const data = income.dataValues || income;
    return {
        id: Number(data.id),
        description: data.description,
        amount: Number(data.amount),
        date: data.date,
        receiptPath: data.receiptPath || null,
    };
}

class IncomeController {
    async getAll(userId) {
        const safeUserId = parsePositiveId(userId, 'Usuário');
        const incomes = await IncomeModel.getAll(safeUserId);
        return incomes.map(mapIncomeDto);
    }

    async getById(id, userId) {
        const safeId = parsePositiveId(id, 'ID');
        const safeUserId = parsePositiveId(userId, 'Usuário');

        const income = await IncomeModel.getByIdAndUser(safeId, safeUserId);
        if (!income) {
            throw new HttpError(404, 'Receita não encontrada.');
        }

        return mapIncomeDto(income);
    }

    async create({ description, amount, date }, userId, receiptPath = null) {
        const safeUserId = parsePositiveId(userId, 'Usuário');
        const safeDescription = sanitizeText(description, {
            fieldName: 'Descrição da receita',
            minLength: 1,
            maxLength: 255,
            required: true,
        });
        const safeAmount = parsePositiveAmount(amount, 'Valor da receita');
        const safeDate = validatePastOrTodayDate(date, 'Data da receita');

        const created = await IncomeModel.create({
            description: safeDescription,
            amount: safeAmount,
            date: safeDate,
            userId: safeUserId,
            receiptPath: receiptPath || null,
        });

        if (!created) {
            throw new HttpError(500, 'Erro ao criar receita.');
        }

        return mapIncomeDto(created);
    }

    async update({ id, description, amount, date }, userId, receiptPath) {
        const safeId = parsePositiveId(id, 'ID');
        const safeUserId = parsePositiveId(userId, 'Usuário');
        const safeDescription = sanitizeText(description, {
            fieldName: 'Descrição da receita',
            minLength: 1,
            maxLength: 255,
            required: true,
        });
        const safeAmount = parsePositiveAmount(amount, 'Valor da receita');
        const safeDate = validatePastOrTodayDate(date, 'Data da receita');

        const existing = await IncomeModel.getByIdAndUser(safeId, safeUserId);
        if (!existing) {
            throw new HttpError(404, 'Receita não encontrada.');
        }

        const updated = await IncomeModel.update({
            id: safeId,
            userId: safeUserId,
            description: safeDescription,
            amount: safeAmount,
            date: safeDate,
            receiptPath,
        });

        if (!updated) {
            throw new HttpError(500, 'Ocorreu um erro ao editar a receita.');
        }

        return mapIncomeDto(updated);
    }

    async getReceiptPathForUpdate(id, userId) {
        const safeId = parsePositiveId(id, 'ID');
        const safeUserId = parsePositiveId(userId, 'Usuário');

        const income = await IncomeModel.getByIdAndUser(safeId, safeUserId);
        if (!income) {
            throw new HttpError(404, 'Receita não encontrada.');
        }

        return income.receiptPath || null;
    }

    async getReceipt(id, userId) {
        const safeId = parsePositiveId(id, 'ID');
        const safeUserId = parsePositiveId(userId, 'Usuário');

        const income = await IncomeModel.getByIdAndUser(safeId, safeUserId);
        if (!income || !income.receiptPath) {
            throw new HttpError(404, 'Anexo não encontrado.');
        }

        return income.receiptPath;
    }

    async delete(id, userId) {
        const safeId = parsePositiveId(id, 'ID');
        const safeUserId = parsePositiveId(userId, 'Usuário');

        const income = await IncomeModel.getByIdAndUser(safeId, safeUserId);
        if (!income) {
            throw new HttpError(404, 'Receita não encontrada.');
        }

        const deletedCount = await IncomeModel.delete(safeId, safeUserId);
        if (!deletedCount) {
            throw new HttpError(404, 'Receita não encontrada.');
        }

        return income.receiptPath || null;
    }

    async getDashboardBalance(userId) {
        const safeUserId = parsePositiveId(userId, 'Usuário');
        const [incomesData, expensesData] = await Promise.all([
            IncomeModel.getTotalIncomes(safeUserId),
            ExpenseModel.getTotalExpenses(safeUserId),
        ]);

        const totalIncomes = Number(incomesData?.total || 0);
        const totalExpenses = Number(expensesData?.total || 0);
        const balance = Math.round((totalIncomes - totalExpenses) * 100) / 100;

        return {
            totalIncomes,
            totalExpenses,
            balance,
        };
    }
}

module.exports = new IncomeController();
