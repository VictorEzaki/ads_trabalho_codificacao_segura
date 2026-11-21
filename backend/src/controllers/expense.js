// validações e regra de negócio
const CategoryModel = require('../models/category');
const ExpenseModel = require('../models/expense');
const UserModel = require('../models/user');
const HttpError = require('../errors/HttpError');

class ExpenseController {
    async getAuthorizedUserIds(currentUser) {
        const userId = Number(currentUser?.id ?? currentUser);
        if (currentUser?.role === 'admin') {
            const childIds = await UserModel.getChildIdsByParentId(userId);
            return [userId, ...childIds];
        }
        return [userId];
    }

    async findAuthorizedExpense(expenseId, currentUser, notFoundMessage = 'Despesa não encontrada.') {
        const expense = await ExpenseModel.getById(Number(expenseId));
        if (!expense) {
            throw new HttpError(404, notFoundMessage);
        }

        const authorizedIds = await this.getAuthorizedUserIds(currentUser);
        if (!authorizedIds.includes(Number(expense.userId))) {
            throw new HttpError(404, notFoundMessage);
        }

        return expense;
    }

    async getAll(categoryId, dateIni, dateFim, vlMin, vlMax, status, currentUser) {
        const authorizedUserIds = await this.getAuthorizedUserIds(currentUser);
        return ExpenseModel.getAll(categoryId, dateIni, dateFim, vlMin, vlMax, status, authorizedUserIds);
    }
    
    async getById(id, currentUser) {
        if (!id) {
            throw new HttpError(400, 'ID não informado.');
        }
        
        if (id < 1) {
            throw new HttpError(400, 'ID não pode ser menor que 1.');
        }
        
        return this.findAuthorizedExpense(id, currentUser);
    }
    
    async create(amount, date, description, status, categoryId, userId, receiptPath = null) {
        // validações da regra de negócio
        // O campo amount deve ser maior que zero
        if (amount !== undefined && amount < 0) {
            throw new HttpError(400, 'Valor da despesa não pode ser menor que zero.');
        }
        
        // O campo date não pode ser no futuro
        if (date) {
            const dateAtual = new Date().toISOString().split('T')[0];
            const dateDespesa = new Date(date).toISOString().split('T')[0];
            
            if (dateDespesa > dateAtual) {
                throw new HttpError(400, 'A data da despesa não pode ser maior que atual.');
            }
        }
        
        // Validações extras para tratamento
        
        // verifica se amount é number caso tenha sido enviado
        if (amount !== undefined && typeof amount !== "number") {
            throw new HttpError(400, "Valor de despesa inválido.");
        }
        
        if (!categoryId) {
            throw new HttpError(400, 'Categoria é um campo obrigatório.');
        }
        
        const categoryExists = await CategoryModel.getById(categoryId);
        if (!categoryExists) {
            throw new HttpError(404, 'Categoria não encontrada.');
        }
        
        // verifica se foi enviado com o tipo correto(string)
        if (description !== undefined && typeof description !== "string") {
            throw new HttpError(400, "Descrição de despesa ausente ou inválido.");
        }
        
        const expenseCreated = await ExpenseModel.create(amount, date, description, status, categoryId, userId, receiptPath)
        
        if (!expenseCreated) {
            throw new HttpError(500, 'Erro ao criar despesa.');
        }
        
        return expenseCreated;
    }
    
    async update(amount, date, description, status, categoryId, currentUser, id, receiptPath) {
        // validações da regra de negócio
        // ID é obrigatório para edição
        if (!id) {
            throw new HttpError(400, 'ID é obrigatório.')
        }
        
        // verifica se ID é maior que zero
        if (id < 1) {
            throw new HttpError(400, 'ID não pode ser menor que 1.')
        }
        
        // * O campo amount deve ser maior que zero
        if (amount !== undefined && amount < 0) {
            throw new HttpError(400, 'Valor da despesa não pode ser menor que zero.')
        }
        
        // * O campo date não pode ser no futuro
        if (date) {
            const dateAtual = new Date().toISOString().split('T')[0];
            const dateDespesa = new Date(date).toISOString().split('T')[0];
            
            if (dateDespesa > dateAtual) {
                throw new HttpError(400, 'A data da despesa não pode ser maior que atual.');
            }
        }
        
        // validações extras para tratamento
        
        // verifica se amount é number caso tenha sido enviado
        if (amount !== undefined && typeof amount !== "number") {
            throw new HttpError(400, "Valor de despesa inválido.");
        }
        
        if (!categoryId) {
            throw new HttpError(400, 'Categoria é um campo obrigatório.');
        }
        
        const categoryExists = await CategoryModel.getById(categoryId);
        if (!categoryExists) {
            throw new HttpError(404, 'Categoria não encontrada.');
        }
        
        // verifica se é uma data válida quando enviada
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (date !== undefined && !dateRegex.test(date)) {
            throw new HttpError(400, "Formato de data inválido. Use YYYY-MM-DD.");
        }
        
        // verifica se foi enviado com o tipo correto(string)
        if (description !== undefined && typeof description !== "string") {
            throw new HttpError(400, "Descrição de despesa ausente ou inválido.");
        }
        
        await this.findAuthorizedExpense(id, currentUser);
        
        const expenseUpdated = await ExpenseModel.update(amount, date, description, status, categoryId, id, receiptPath);
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
        if (!id || id < 1) throw new HttpError(400, 'ID inválido.');
        const expense = await this.findAuthorizedExpense(id, currentUser, 'Anexo não encontrado.');
        if (!expense.receiptPath) {
            throw new HttpError(404, 'Anexo não encontrado.');
        }
        return expense.receiptPath;
    }

    async delete(id, currentUser) {
        // ID é obrigatório para exclusão
        if (!id) {
            throw new HttpError(400, 'ID é obrigatório.');
        }
        
        // verifica se ID é maior que zero
        if (id < 1) {
            throw new HttpError(400, 'ID não pode ser menor que 1.');
        }
        
        const expense = await this.findAuthorizedExpense(id, currentUser);
        
        await ExpenseModel.delete(Number(id));
        return expense.receiptPath || null;
    }
    
    async getTotalExpenses(adminId) {
        const childIds = await UserModel.getChildIdsByParentId(adminId);
        const familyUserIds = [Number(adminId), ...childIds];
        return ExpenseModel.getTotalExpenses(familyUserIds);
    }
    
    async getQuantidadeExpenses(adminId) {
        const childIds = await UserModel.getChildIdsByParentId(adminId);
        const familyUserIds = [Number(adminId), ...childIds];
        return ExpenseModel.getQuantidadeExpenses(familyUserIds);
    }
    
    async getTotalExpensesByCategory(adminId) {
        const childIds = await UserModel.getChildIdsByParentId(adminId);
        const familyUserIds = [Number(adminId), ...childIds];
        return ExpenseModel.getTotalExpensesByCategory(familyUserIds);
    }
}

module.exports = new ExpenseController();
