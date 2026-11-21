const { DataTypes } = require('sequelize'); 
const sequelize = require('./database.js');

const db = sequelize.define('users', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('admin', 'user'),
        allowNull: false,
        defaultValue: 'admin'
    },
    parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    }
});

class UserModel {
    
    constructor() {}
    
    async getAllUsers() {
        return db.findAll();
    }
    
    async createUser(email, password, name, { role = 'admin', parentId = null } = {}) {
        return db.create({ email, password, name, role, parentId });
    }
    
    async getUserByEmail(email) {
        return db.findOne({ where: { email } });
    }
    
    async getUserById(id) {
        return db.findByPk(id);
    }

    async getUsersByParentId(parentId) {
        return db.findAll({
            where: { parentId },
            order: [['id', 'ASC']]
        });
    }

    async getChildIdsByParentId(parentId) {
        const children = await db.findAll({
            attributes: ['id'],
            where: { parentId },
            raw: true
        });
        return children.map((child) => child.id);
    }

    async getUserByIdAndParent(id, parentId) {
        return db.findOne({
            where: { id, parentId }
        });
    }
    
    async updateUser(id, email, password, name) {
        const user = await db.findByPk(id);
        
        if (!user) {
            return null;
        }
        
        user.email = email;
        if (password) {
            user.password = password;
        }
        user.name = name;
        
        await user.save();
        
        return user;
    }
    
    async deleteUser(id) {
        return db.destroy({
            where: { id }
        });
    }

    async deleteChildUser(id, parentId) {
        return db.destroy({
            where: { id, parentId }
        });
    }
    
}

const userModel = new UserModel();
userModel.User = db;

module.exports = userModel;