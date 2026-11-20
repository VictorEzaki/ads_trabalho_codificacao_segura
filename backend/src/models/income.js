const { DataTypes } = require('sequelize');
const sequelize = require('./database.js');

const db = sequelize.define('incomes', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0.01
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: true
        }
    },
    receiptPath: {
        type: DataTypes.STRING(255),
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
});

class IncomeModel {
    async getAll(userId) {
        return db.findAll({
            where: { userId },
            order: [['date', 'DESC'], ['id', 'DESC']]
        });
    }

    async getByIdAndUser(id, userId) {
        return db.findOne({
            where: { id, userId }
        });
    }

    async create({ description, amount, date, userId, receiptPath = null }) {
        return db.create({
            description,
            amount,
            date,
            userId,
            receiptPath
        });
    }

    async update({ id, userId, description, amount, date, receiptPath }) {
        const income = await db.findOne({
            where: { id, userId }
        });

        if (!income) {
            return null;
        }

        income.description = description;
        income.amount = amount;
        income.date = date;
        if (receiptPath !== undefined) {
            income.receiptPath = receiptPath;
        }

        await income.save();
        return income;
    }

    async delete(id, userId) {
        return db.destroy({
            where: { id, userId }
        });
    }

    async getTotalIncomes(userId) {
        const total = await db.sum('amount', {
            where: { userId }
        });

        return {
            total: Number(total || 0)
        };
    }
}

const incomeModel = new IncomeModel();
incomeModel.Income = db;

module.exports = incomeModel;
