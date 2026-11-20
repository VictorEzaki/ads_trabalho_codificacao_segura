const { DataTypes, Op } = require('sequelize');
const sequelize = require('./database.js');

const db = sequelize.define('refresh_tokens', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
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
    },
    tokenHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    revokedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    replacedByTokenHash: {
        type: DataTypes.STRING(64),
        allowNull: true
    }
});

class RefreshTokenModel {
    constructor() {}

    async create(userId, tokenHash, expiresAt, options = {}) {
        return db.create({ userId, tokenHash, expiresAt }, options);
    }

    async findByTokenHash(tokenHash, options = {}) {
        return db.findOne({ where: { tokenHash }, ...options });
    }

    async revokeByTokenHash(tokenHash, replacedByTokenHash = null, options = {}) {
        return db.update(
            {
                revokedAt: new Date(),
                replacedByTokenHash,
            },
            {
                where: {
                    tokenHash,
                    revokedAt: null,
                },
                ...options,
            }
        );
    }

    async revokeAllByUserId(userId, options = {}) {
        return db.update(
            {
                revokedAt: new Date(),
            },
            {
                where: {
                    userId,
                    revokedAt: null,
                },
                ...options,
            }
        );
    }

    async deleteExpired() {
        return db.destroy({
            where: {
                expiresAt: {
                    [Op.lte]: new Date(),
                },
            },
        });
    }
}

const refreshTokenModel = new RefreshTokenModel();
refreshTokenModel.RefreshToken = db;

module.exports = refreshTokenModel;
