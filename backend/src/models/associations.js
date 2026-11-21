const CategoryModel = require('./category');
const ExpenseModel = require('./expense');
const IncomeModel = require('./income');
const UserModel = require('./user');
const RefreshTokenModel = require('./refreshToken');

const Category = CategoryModel.Category;
const Expense = ExpenseModel.Expense;
const Income = IncomeModel.Income;
const User = UserModel.User;
const RefreshToken = RefreshTokenModel.RefreshToken;


// Categoria e despesa
Category.hasMany(Expense, {
    foreignKey: 'categoryId',
    as: 'expenses'
});

Expense.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'categories'
});


// Usuário e despesa
User.hasMany(Expense, {
    foreignKey: 'userId',
    as: 'expenses'
});

Expense.belongsTo(User, {
    foreignKey: 'userId',
    as: 'users'
});


// Usuário e receita
User.hasMany(Income, {
    foreignKey: 'userId',
    as: 'incomes'
});

Income.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});


// Usuário e refresh tokens
User.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens'
});

RefreshToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});


// Controle parental: administrador e dependentes
User.hasMany(User, {
    foreignKey: 'parentId',
    as: 'children'
});

User.belongsTo(User, {
    foreignKey: 'parentId',
    as: 'parent'
});
