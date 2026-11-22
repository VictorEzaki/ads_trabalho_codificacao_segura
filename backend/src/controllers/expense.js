// validações e regra de negócio
const CategoryModel = require('../models/category');
const ExpenseModel = require('../models/expense');
const UserModel = require('../models/user');
const HttpError = require('../errors/HttpError');
const {
    parsePositiveId,
    sanitizeText,
    parsePositiveAmount,
    parseNonNegativeAmount,
    validateIsoDate,
    validatePastOrTodayDate,
    isEmptyFilterValue,
} = require('../utils/inputValidator');

const ALLOWED_EXPENSE_STATUSES = new Set(['PENDENTE', 'PAGA']);

function validateExpenseStatus(status) {
    if (typeof status !== 'string') {
        throw new HttpError(400, 'Status da despesa inválido. Use PENDENTE ou PAGA.');
    }

    const normalized = status.trim();
    if (!ALLOWED_EXPENSE_STATUSES.has(normalized)) {
        throw new HttpError(400, 'Status da despesa inválido. Use PENDENTE ou PAGA.');
    }

    return normalized;
}

function validateScalarFilter(value, fieldName) {
    if (value !== undefined && value !== null && typeof value === 'object') {
        throw new HttpError(400, `${fieldName} inválido.`);
    }
}

class ExpenseController {
    async getAuthorizedUserIds(currentUser) {
        const userId = parsePositiveId(currentUser?.id ?? currentUser, 'Usuário');
        if (currentUser?.role === 'admin') {
            const childIds = await UserModel.getChildIdsByParentId(userId);
            return [userId, ...childIds];
        }
        return [userId];
    }

    async findAuthorizedExpense(expenseId, currentUser, notFoundMessage = 'Despesa não encontrada.') {
        const safeId = parsePositiveId(expenseId, 'ID');
        const expense = await ExpenseModel.getById(safeId);
        if (!expense) {
            throw new HttpError(404, notFoundMessage);
        }

        const authorizedIds = await this.getAuthorizedUserIds(currentUser);
        if (!authorizedIds.includes(Number(expense.userId))) {
            throw new HttpError(404, notFoundMessage);
        }

        return expense;
    }

    validateListFilters({ categoryId, dateIni, dateFim, vlMin, vlMax, status }) {
        validateScalarFilter(categoryId, 'Categoria');
        validateScalarFilter(dateIni, 'Data inicial');
        validateScalarFilter(dateFim, 'Data final');
        validateScalarFilter(vlMin, 'Valor mínimo');
        validateScalarFilter(vlMax, 'Valor máximo');
        validateScalarFilter(status, 'Status');

        const safeCategoryId = isEmptyFilterValue(categoryId)
            ? null
            : parsePositiveId(categoryId, 'Categoria');

        const safeStatus = isEmptyFilterValue(status)
            ? null
            : validateExpenseStatus(status);

        const safeDateIni = isEmptyFilterValue(dateIni)
            ? null
            : validateIsoDate(typeof dateIni === 'string' ? dateIni.trim() : dateIni, 'Data inicial');

        const safeDateFim = isEmptyFilterValue(dateFim)
            ? null
            : validateIsoDate(typeof dateFim === 'string' ? dateFim.trim() : dateFim, 'Data final');

        if (safeDateIni && safeDateFim && safeDateIni > safeDateFim) {
            throw new HttpError(400, 'A data inicial não pode ser maior que a data final.');
        }

        const safeVlMin = isEmptyFilterValue(vlMin)
            ? null
            : parseNonNegativeAmount(vlMin, 'Valor mínimo');

        const safeVlMax = isEmptyFilterValue(vlMax)
            ? null
            : parseNonNegativeAmount(vlMax, 'Valor máximo');

        if (safeVlMin !== null && safeVlMax !== null && safeVlMin > safeVlMax) {
            throw new HttpError(400, 'O valor mínimo não pode ser maior que o valor máximo.');
        }

        return {
            categoryId: safeCategoryId,
            dateIni: safeDateIni,
            dateFim: safeDateFim,
            vlMin: safeVlMin,
            vlMax: safeVlMax,
            status: safeStatus,
        };
    }

    async validateExpensePayload({ amount, date, description, status, categoryId }) {
        const safeAmount = parsePositiveAmount(amount, 'Valor da despesa');
        const safeDate = validatePastOrTodayDate(date, 'Data da despesa');
        const safeDescription = sanitizeText(description, {
            fieldName: 'Descrição da despesa',
            minLength: 0,
            maxLength: 255,
            required: false,
        });
        const safeStatus = validateExpenseStatus(status);
        const safeCategoryId = parsePositiveId(categoryId, 'Categoria');

        const categoryExists = await CategoryModel.getById(safeCategoryId);
        if (!categoryExists) {
            throw new HttpError(404, 'Categoria não encontrada.');
        }

        return {
            amount: safeAmount,
            date: safeDate,
            description: safeDescription,
            status: safeStatus,
            categoryId: safeCategoryId,
        };
    }

    async getAll(categoryId, dateIni, dateFim, vlMin, vlMax, status, currentUser) {
        const filters = this.validateListFilters({
            categoryId,
            dateIni,
            dateFim,
            vlMin,
            vlMax,
            status,
        });
        const authorizedUserIds = await this.getAuthorizedUserIds(currentUser);

        return ExpenseModel.getAll(
            filters.categoryId,
            filters.dateIni,
            filters.dateFim,
            filters.vlMin,
            filters.vlMax,
            filters.status,
            authorizedUserIds
        );
    }

    async getById(id, currentUser) {
        return this.findAuthorizedExpense(id, currentUser);
    }

    async create(amount, date, description, status, categoryId, userId, receiptPath = null) {
        const safeUserId = parsePositiveId(userId, 'Usuário');
        const safePayload = await this.validateExpensePayload({
            amount,
            date,
            description,
            status,
            categoryId,
        });

        const expenseCreated = await ExpenseModel.create(
            safePayload.amount,
            safePayload.date,
            safePayload.description,
            safePayload.status,
            safePayload.categoryId,
            safeUserId,
            receiptPath
        );

        if (!expenseCreated) {
            throw new HttpError(500, 'Erro ao criar despesa.');
        }

        return expenseCreated;
    }

    async update(amount, date, description, status, categoryId, currentUser, id, receiptPath) {
        const safeId = parsePositiveId(id, 'ID');
        const safePayload = await this.validateExpensePayload({
            amount,
            date,
            description,
            status,
            categoryId,
        });

        await this.findAuthorizedExpense(safeId, currentUser);

        const expenseUpdated = await ExpenseModel.update(
            safePayload.amount,
            safePayload.date,
            safePayload.description,
            safePayload.status,
            safePayload.categoryId,
            safeId,
            receiptPath
        );
        if (!expenseUpdated) {
            throw new HttpError(500, 'Ocorreu um erro ao editar a despesa!');
        }

        return expenseUpdated;
    }

    async getReceiptPathForUpdate(id, currentUser) {
        const expense = await this.findAuthorizedExpense(id, currentUser);
        return expense.receiptPath || null;
    }

    async getReceipt(id, currentUser) {
        const expense = await this.findAuthorizedExpense(id, currentUser, 'Anexo não encontrado.');
        if (!expense.receiptPath) {
            throw new HttpError(404, 'Anexo não encontrado.');
        }
        return expense.receiptPath;
    }

    async delete(id, currentUser) {
        const safeId = parsePositiveId(id, 'ID');
        const expense = await this.findAuthorizedExpense(safeId, currentUser);

        await ExpenseModel.delete(safeId);
        return expense.receiptPath || null;
    }

    async getTotalExpenses(adminId) {
        const safeAdminId = parsePositiveId(adminId, 'Administrador');
        const childIds = await UserModel.getChildIdsByParentId(safeAdminId);
        const familyUserIds = [safeAdminId, ...childIds];
        return ExpenseModel.getTotalExpenses(familyUserIds);
    }

    async getQuantidadeExpenses(adminId) {
        const safeAdminId = parsePositiveId(adminId, 'Administrador');
        const childIds = await UserModel.getChildIdsByParentId(safeAdminId);
        const familyUserIds = [safeAdminId, ...childIds];
        return ExpenseModel.getQuantidadeExpenses(familyUserIds);
    }

    async getTotalExpensesByCategory(adminId) {
        const safeAdminId = parsePositiveId(adminId, 'Administrador');
        const childIds = await UserModel.getChildIdsByParentId(safeAdminId);
        const familyUserIds = [safeAdminId, ...childIds];
        return ExpenseModel.getTotalExpensesByCategory(familyUserIds);
    }
}

module.exports = new ExpenseController();
