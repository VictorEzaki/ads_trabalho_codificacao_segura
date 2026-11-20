const CategoryModel = require('./category');
const ExpenseModel = require('./expense');
const UserModel = require('./user');
const RefreshTokenModel = require('./refreshToken');

const Category = CategoryModel.Category;
const Expense = ExpenseModel.Expense;
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


// Usuário e refresh tokens
User.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens'
});

RefreshToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});
