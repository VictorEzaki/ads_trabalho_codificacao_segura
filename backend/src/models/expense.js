const sequelize = require('./database.js');
const { fn, col, Op } = require('sequelize');
const { DataTypes } = require('sequelize');
const CategoryModel = require('./category.js');
const UserModel = require('./user.js');

const db = sequelize.define('expenses', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    amount: {
        type: DataTypes.DOUBLE,
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDENTE', 'PAGA'),
        allowNull: false
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    receiptPath: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    }
}, {
    createdAt: false,
    updatedAt: false
});

class ExpenseModel {
    constructor() { }
    
    async getAll(categoryId, dateIni, dateFim, vlMin, vlMax, status, userId) {
        if (Array.isArray(userId) && userId.length === 0) {
            return [];
        }

        const where = {};
        
        // filtrar por usuário
        if (userId) {
            where.userId = userId;
        }

        // filtrar categoria
        if (categoryId !== undefined && categoryId !== null) {
            where.categoryId = categoryId;
        }
        
        // filtrar status
        if (status) {
            where.status = status;
        }
        
        // filtrar período
        if (dateIni && dateFim) {
            where.date = {
                [Op.between]: [dateIni, dateFim]
            };
        } else if (dateIni) {
            where.date = {
                [Op.gte]: dateIni
            };
        } else if (dateFim) {
            where.date = {
                [Op.lte]: dateFim
            };
        }
        
        // valor mínimo
        if (vlMin !== undefined && vlMin !== null) {
            where.amount = {
                ...where.amount,
                [Op.gte]: vlMin
            };
        }
        
        // valor máximo
        if (vlMax !== undefined && vlMax !== null) {
            where.amount = {
                ...where.amount,
                [Op.lte]: vlMax
            };
        }

        return db.findAll({
            where,
            include: [
                {
                    model: UserModel.User,
                    as: 'users',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

    }
    
    async getById(id) {
        return db.findOne({
            where: { id }
        });
    }
    
    async create(amount, date, description, status, categoryId, userId, receiptPath = null) {
        return db.create({ amount, date, description, status, categoryId, userId, receiptPath })
    }
    
    async update(amount, date, description, status, categoryId, id, receiptPath) {
        const expense = await db.findByPk(id);
        
        if (!expense) {
            return null;
        }
        
        expense.amount = amount;
        expense.date = date;
        expense.description = description;
        expense.status = status;
        expense.categoryId = categoryId;
        if (receiptPath !== undefined) expense.receiptPath = receiptPath;
        
        await expense.save();
        
        return expense;
    }
    
    async delete(id) {
        return db.destroy({
            where: { id }
        });
    }

    async getReceiptPathsByUserId(userId) {
        const expenses = await db.findAll({
            attributes: ['receiptPath'],
            where: {
                userId,
                receiptPath: {
                    [Op.ne]: null
                }
            },
            raw: true
        });
        return expenses.map((item) => item.receiptPath).filter(Boolean);
    }
    
    async getTotalExpenses(userId) {
        if (Array.isArray(userId) && userId.length === 0) {
            return { total: 0 };
        }

        const total = await db.sum("amount", {
            where: {
                userId: userId
            }
        });
        
        return {
            total: Number(total || 0)
        };
    }
    
    async getQuantidadeExpenses(userId) {
        if (Array.isArray(userId) && userId.length === 0) {
            return { quantidade: 0 };
        }

        const quantidade = await db.count({
            where: {
                userId: userId
            }
        });
        
        return {
            quantidade
        };
    }
    
    async getTotalExpensesByCategory(userId) {
        if (Array.isArray(userId) && userId.length === 0) {
            return [];
        }

        const expensesByCategory = await db.findAll({
            attributes: [
                [fn("SUM", col("expenses.amount")), "total"]
            ],
            include: [
                {
                    model: CategoryModel.Category,
                    as: "categories",
                    attributes: ["name"]
                }
            ],
            where: {
                userId: userId
            },
            group: ["categories.id", "categories.name"],
            raw: true,
            nest: true
        });
        
        const formattedResult = expensesByCategory.map((item) => ({
            categoria: item.categories.name,
            total: Number(item.total || 0)
        }));
        
        return formattedResult;
    }
}

const expenseModel = new ExpenseModel();
expenseModel.Expense = db;

module.exports = expenseModel;
