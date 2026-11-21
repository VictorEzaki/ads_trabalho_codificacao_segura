"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("users", "role", {
            type: Sequelize.ENUM("admin", "user"),
            allowNull: false,
            defaultValue: "admin",
        });

        await queryInterface.addColumn("users", "parentId", {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            references: {
                model: "users",
                key: "id",
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("users", "parentId");
        await queryInterface.removeColumn("users", "role");
    },
};
