const bcrypt = require('bcrypt');
const UserModel = require('../models/user');
const RefreshTokenModel = require('../models/refreshToken');
const sequelize = require('../models/database');
const HttpError = require('../errors/HttpError');
const { getRefreshMaxAgeMs } = require('../utils/cookie');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashToken,
    generateCsrfToken,
} = require('../utils/token');

class UserController {
    constructor() {
    }

    mapUser(user) {
        const userData = user.dataValues || user;

        return {
            id: userData.id,
            name: userData.name,
            email: userData.email
        };
    }

    async issueSession(user, transaction = undefined) {
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        const csrfToken = generateCsrfToken();
        const refreshTokenHash = hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + getRefreshMaxAgeMs());

        await RefreshTokenModel.create(
            user.id,
            refreshTokenHash,
            expiresAt,
            transaction ? { transaction } : {}
        );

        return {
            accessToken,
            refreshToken,
            csrfToken,
            refreshTokenHash,
            user: this.mapUser(user),
        };
    }

    async getAll() {
        const users = (await UserModel.getAllUsers()).map(u => this.mapUser(u));

        if (!users) {
            throw new HttpError(500, 'Ocorreu um erro ao buscar usuários.');
        }

        return users;
    }

    async create(email, password, name) {
        if (!email) {
            throw new HttpError(400, 'Email é um campo obrigatório.');
        }

        if (!password) {
            throw new HttpError(400, 'Senha é um campo obrigatório.');
        }

        if (!name) {
            throw new HttpError(400, 'Nome é um campo obrigatório.');
        }

        if (password.length < 6) {
            throw new HttpError(400, 'A senha deve conter pelo menos 6 caracteres');
        }

        if (email.length < 5 || !email.includes('@')) {
            throw new HttpError(400, 'O email deve conter pelo menos 5 caracteres e incluir um "@"');
        }

        const userExists = await UserModel.getUserByEmail(email);
        if (userExists) {
            throw new HttpError(409, 'Já existe um usuário cadastrado com este email.');
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const user = await UserModel.createUser(email, hashPassword, name);

        return this.mapUser(user);
    }

    async login(email, password) {
        if (!email || !password) {
            throw new HttpError(400, 'Email e senha são obrigatórios.');
        }

        const user = await UserModel.getUserByEmail(email);
        if (!user) {
            throw new HttpError(400, 'Credenciais inválidas.');
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            throw new HttpError(400, 'Credenciais inválidas.');
        }

        const session = await this.issueSession(user);

        return {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            csrfToken: session.csrfToken,
            user: session.user,
        };
    }

    async refresh(rawRefreshToken) {
        if (!rawRefreshToken) {
            throw new HttpError(401, 'Refresh token não informado.');
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(rawRefreshToken);
        } catch (error) {
            throw new HttpError(401, 'Refresh token inválido ou expirado.');
        }

        const tokenHash = hashToken(rawRefreshToken);
        const storedToken = await RefreshTokenModel.findByTokenHash(tokenHash);

        if (!storedToken) {
            throw new HttpError(401, 'Refresh token inválido.');
        }

        // Reuse detection: token já revogado sendo reutilizado indica possível comprometimento
        if (storedToken.revokedAt !== null) {
            await RefreshTokenModel.revokeAllByUserId(storedToken.userId);
            throw new HttpError(401, 'Sessão revogada por reutilização de token.');
        }

        if (new Date(storedToken.expiresAt) <= new Date()) {
            await RefreshTokenModel.revokeByTokenHash(tokenHash);
            throw new HttpError(401, 'Refresh token expirado.');
        }

        if (storedToken.userId !== decoded.id) {
            await RefreshTokenModel.revokeAllByUserId(storedToken.userId);
            throw new HttpError(401, 'Refresh token inválido.');
        }

        const user = await UserModel.getUserById(storedToken.userId);
        if (!user) {
            await RefreshTokenModel.revokeAllByUserId(storedToken.userId);
            throw new HttpError(401, 'Usuário não encontrado.');
        }

        return sequelize.transaction(async (transaction) => {
            const accessToken = generateAccessToken(user);
            const newRefreshToken = generateRefreshToken(user);
            const csrfToken = generateCsrfToken();
            const newRefreshTokenHash = hashToken(newRefreshToken);
            const expiresAt = new Date(Date.now() + getRefreshMaxAgeMs());

            const [updatedRows] = await RefreshTokenModel.revokeByTokenHash(
                tokenHash,
                newRefreshTokenHash,
                { transaction }
            );

            if (updatedRows === 0) {
                throw new HttpError(401, 'Refresh token já utilizado.');
            }

            await RefreshTokenModel.create(user.id, newRefreshTokenHash, expiresAt, { transaction });

            return {
                accessToken,
                refreshToken: newRefreshToken,
                csrfToken,
                user: this.mapUser(user),
            };
        });
    }

    async logout(rawRefreshToken) {
        if (!rawRefreshToken) {
            return;
        }

        const tokenHash = hashToken(rawRefreshToken);
        await RefreshTokenModel.revokeByTokenHash(tokenHash);
    }

    async getById(id) {
        const user = await UserModel.getUserById(id);

        if (!user) {
            throw new HttpError(404, 'Nenhum usuário encontrado.');
        }

        return this.mapUser(user);
    }

    async update(id, email, password, name) {
        if (!email) {
            throw new HttpError(400, 'Email é um campo obrigatório.');
        }

        if (!password) {
            throw new HttpError(400, 'Senha é um campo obrigatório.');
        }

        if (!name) {
            throw new HttpError(400, 'Nome é um campo obrigatório.');
        }

        if (password.length < 6) {
            throw new HttpError(400, 'A senha deve conter pelo menos 6 caracteres');
        }

        if (email.length < 5 || !email.includes('@')) {
            throw new HttpError(400, 'O email deve conter pelo menos 5 caracteres e incluir um "@"');
        }

        const userExists = await UserModel.getUserById(Number(id));
        if (!userExists) {
            throw new HttpError(404, 'Usuário não encontrado.');
        }

        const emailExists = await UserModel.getUserByEmail(email);
        if (emailExists && emailExists.id !== Number(id)) {
            throw new HttpError(409, 'Já existe um usuário cadastrado com este email.');
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const user = await UserModel.updateUser(id, email, hashPassword, name);

        return this.mapUser(user);
    }

    async delete(id) {
        // ID é obrigatório para edição
        if (!id) {
            throw new HttpError(400, 'ID é obrigatório.');
        }

        // verifica se ID é maior que zero
        if (id < 1) {
            throw new HttpError(400, 'ID não pode ser menor que 1.');
        }

        const user = await UserModel.getUserById(Number(id));
        if (!user) {
            throw new HttpError(404, 'Usuário não encontrado.');
        }

        return await UserModel.deleteUser(id);
    }
}

module.exports = new UserController();
