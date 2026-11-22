// validações e regra de negócio
const HttpError = require('../errors/HttpError');
const CategoryModel = require('../models/category');
const { parsePositiveId, sanitizeText } = require('../utils/inputValidator');

function validateCategoryPayload(name, description) {
    const safeName = sanitizeText(name, {
        fieldName: 'Nome da categoria',
        minLength: 1,
        maxLength: 255,
        required: true,
    });

    const safeDescription = sanitizeText(description, {
        fieldName: 'Descrição da categoria',
        minLength: 0,
        maxLength: 255,
        required: false,
    });

    return { safeName, safeDescription };
}

class CategoryController {
    async getAll() {
        return await CategoryModel.getAll();
    }

    async getById(id) {
        const safeId = parsePositiveId(id, 'ID');
        const category = await CategoryModel.getById(safeId);
        if (!category) {
            throw new HttpError(404, 'Categoria não encontrada.');
        }

        return category;
    }

    async create(name, description) {
        const { safeName, safeDescription } = validateCategoryPayload(name, description);

        const categoryCreated = await CategoryModel.create(safeName, safeDescription);
        if (!categoryCreated) {
            throw new HttpError(500, 'Erro ao criar categoria.');
        }

        return categoryCreated;
    }

    async update(name, description, id) {
        const safeId = parsePositiveId(id, 'ID');
        const { safeName, safeDescription } = validateCategoryPayload(name, description);

        const category = await CategoryModel.getById(safeId);
        if (!category) {
            throw new HttpError(404, 'Categoria não encontrada.');
        }

        const categoryUpdated = await CategoryModel.update(safeName, safeDescription, safeId);
        if (!categoryUpdated) {
            throw new HttpError(500, 'Ocorreu um erro ao editar a categoria!');
        }

        return categoryUpdated;
    }

    async delete(id) {
        const safeId = parsePositiveId(id, 'ID');

        const category = await CategoryModel.getById(safeId);
        if (!category) {
            throw new HttpError(404, 'Categoria não encontrada.');
        }

        return CategoryModel.delete(safeId);
    }
}

module.exports = new CategoryController();
