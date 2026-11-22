"use strict";

const bcrypt = require('bcrypt');

function assertNotProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seeders de demonstração não podem ser executados em produção.');
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    assertNotProduction();

    const demoPassword = 'Senha@1234';
    const passwordHash = bcrypt.hashSync(demoPassword, 10);

    await queryInterface.bulkInsert("users", [
      {
        name: "Admin",
        email: "admin@email.com",
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "João Silva",
        email: "joao@email.com",
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Maria Souza",
        email: "maria@email.com",
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    assertNotProduction();

    await queryInterface.bulkDelete("users", {
      email: ["admin@email.com", "joao@email.com", "maria@email.com"]
    });
  }
};
