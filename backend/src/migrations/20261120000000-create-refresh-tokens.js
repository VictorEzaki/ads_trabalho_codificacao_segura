"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("refresh_tokens", {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "users",
                    key: "id"
                },
                onDelete: "CASCADE",
                onUpdate: "CASCADE"
            },
            tokenHash: {
                type: Sequelize.STRING(64),
                allowNull: false,
                unique: true
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: false
            },
            revokedAt: {
                type: Sequelize.DATE,
                allowNull: true
            },
            replacedByTokenHash: {
                type: Sequelize.STRING(64),
                allowNull: true
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });

        await queryInterface.addIndex("refresh_tokens", ["userId"]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("refresh_tokens");
    }
};
