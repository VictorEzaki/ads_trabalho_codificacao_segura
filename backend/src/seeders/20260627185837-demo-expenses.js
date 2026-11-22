'use strict';

function assertNotProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seeders de demonstração não podem ser executados em produção.');
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    assertNotProduction();
    await queryInterface.bulkInsert("expenses", [
      {
        description: "Supermercado mensal",
        amount: 350.75,
        date: "2026-06-01",
        status: "PAGA",
        categoryId: 1,
        userId: 1
      },
      {
        description: "Uber ida trabalho",
        amount: 18.90,
        date: "2026-06-03",
        status: "PAGA",
        categoryId: 2,
        userId: 1
      },
      {
        description: "Cinema com amigos",
        amount: 65.0,
        date: "2026-06-05",
        status: "PAGA",
        categoryId: 5,
        userId: 1
      },
      {
        description: "Consulta médica",
        amount: 120.0,
        date: "2026-06-10",
        status: "PENDENTE",
        categoryId: 4,
        userId: 2
      },
      {
        description: "Curso online",
        amount: 199.99,
        date: "2026-06-12",
        status: "PAGA",
        categoryId: 6,
        userId: 2
      },
      {
        description: "Aluguel mensal",
        amount: 1200.0,
        date: "2026-06-01",
        status: "PAGA",
        categoryId: 3,
        userId: 1
      },
      {
        description: "Farmácia",
        amount: 45.5,
        date: "2026-06-15",
        status: "PAGA",
        categoryId: 4,
        userId: 1
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    assertNotProduction();
    await queryInterface.bulkDelete("expenses", null, {});
  }
};
