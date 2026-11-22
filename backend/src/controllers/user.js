const bcrypt = require('bcrypt');
const UserModel = require('../models/user');
const ExpenseModel = require('../models/expense');
const RefreshTokenModel = require('../models/refreshToken');
const sequelize = require('../models/database');
const HttpError = require('../errors/HttpError');
const { parsePositiveId, sanitizeText } = require('../utils/inputValidator');
const { getRefreshMaxAgeMs } = require('../utils/cookie');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashToken,
    generateCsrfToken,
} = require('../utils/token');

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

function validateUserEmail(email) {
    const cleaned = sanitizeText(email, {
        fieldName: 'Email',
        minLength: 1,
        maxLength: 255,
        required: true,
    }).toLowerCase();

    if (cleaned.length < 5 || !cleaned.includes('@') || /\s/.test(cleaned)) {
        throw new HttpError(400, 'O email deve conter pelo menos 5 caracteres e incluir um "@"');
    }

    return cleaned;
}

function validateUserName(name) {
    return sanitizeText(name, {
        fieldName: 'Nome',
        minLength: 1,
        maxLength: 255,
        required: true,
    });
}

function validatePassword(password, { required = true } = {}) {
    if (password === undefined || password === null || password === '') {
        if (required) {
            throw new HttpError(400, 'Senha é um campo obrigatório.');
        }
        return null;
    }

    if (typeof password !== 'string') {
        throw new HttpError(400, 'Senha inválida.');
    }

    if (CONTROL_CHARS_REGEX.test(password)) {
        throw new HttpError(400, 'A senha não pode conter caracteres de controle.');
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        throw new HttpError(400, 'A senha deve conter pelo menos 8 caracteres.');
    }

    if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
        throw new HttpError(400, 'A senha deve ter no máximo 72 bytes.');
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9\s]/.test(password);

    if (!hasLower || !hasUpper || !hasDigit || !hasSpecial) {
        throw new HttpError(
            400,
            'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.'
        );
    }

    return password;
}

class UserController {
    constructor() {
    }

    mapUser(user) {
        const userData = user.dataValues || user;

        return {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role || 'admin',
            parentId: userData.parentId ?? null,
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

    async getAll(requester) {
        const adminId = parsePositiveId(requester?.id, 'Administrador');
        const [admin, children] = await Promise.all([
            UserModel.getUserById(adminId),
            UserModel.getUsersByParentId(adminId),
        ]);

        const familyUsers = [admin, ...children].filter(Boolean);
        return familyUsers.map((u) => this.mapUser(u));
    }

    async create(email, password, name) {
        const safeEmail = validateUserEmail(email);
        const safePassword = validatePassword(password, { required: true });
        const safeName = validateUserName(name);

        const userExists = await UserModel.getUserByEmail(safeEmail);
        if (userExists) {
            throw new HttpError(409, 'Já existe um usuário cadastrado com este email.');
        }

        const hashPassword = await bcrypt.hash(safePassword, 10);

        // Cadastro público (/register) cria sempre um administrador independente
        const user = await UserModel.createUser(safeEmail, hashPassword, safeName, {
            role: 'admin',
            parentId: null,
        });

        return this.mapUser(user);
    }

    async getFamilyMembers(adminId) {
        const safeAdminId = parsePositiveId(adminId, 'Administrador');
        const children = await UserModel.getUsersByParentId(safeAdminId);
        return children.map((child) => this.mapUser(child));
    }

    async createFamilyMember(adminId, { email, password, name }) {
        const safeAdminId = parsePositiveId(adminId, 'Administrador');
        const safeEmail = validateUserEmail(email);
        const safePassword = validatePassword(password, { required: true });
        const safeName = validateUserName(name);

        const userExists = await UserModel.getUserByEmail(safeEmail);
        if (userExists) {
            throw new HttpError(409, 'Já existe um usuário cadastrado com este email.');
        }

        const hashPassword = await bcrypt.hash(safePassword, 10);

        // Usuário criado por um admin tem sempre role 'user' e fica vinculado à família
        const child = await UserModel.createUser(safeEmail, hashPassword, safeName, {
            role: 'user',
            parentId: safeAdminId,
        });

        return this.mapUser(child);
    }

    async updateFamilyMember(adminId, childId, { email, password, name }) {
        const safeAdminId = parsePositiveId(adminId, 'Administrador');
        const safeChildId = parsePositiveId(childId, 'Usuário');

        const child = await UserModel.getUserByIdAndParent(safeChildId, safeAdminId);
        if (!child) {
            throw new HttpError(404, 'Usuário não encontrado.');
        }

        const safeEmail = validateUserEmail(email);
        const safeName = validateUserName(name);
        const safePassword = validatePassword(password, { required: false });

        const emailExists = await UserModel.getUserByEmail(safeEmail);
        if (emailExists && emailExists.id !== safeChildId) {
            throw new HttpError(409, 'Já existe um usuário cadastrado com este email.');
        }

        const hashPassword = safePassword ? await bcrypt.hash(safePassword, 10) : null;
        const updatedChild = await UserModel.updateUser(safeChildId, safeEmail, hashPassword, safeName);

        return this.mapUser(updatedChild);
    }

    async deleteFamilyMember(adminId, childId) {
        const safeAdminId = parsePositiveId(adminId, 'Administrador');
        const safeChildId = parsePositiveId(childId, 'Usuário');

        const child = await UserModel.getUserByIdAndParent(safeChildId, safeAdminId);
        if (!child) {
            throw new HttpError(404, 'Usuário não encontrado.');
        }

        const receiptPaths = await ExpenseModel.getReceiptPathsByUserId(safeChildId);
        await RefreshTokenModel.revokeAllByUserId(safeChildId);
        await UserModel.deleteChildUser(safeChildId, safeAdminId);

        return receiptPaths;
    }

    async login(email, password) {
        if (!email || !password) {
            throw new HttpError(400, 'Email e senha são obrigatórios.');
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await UserModel.getUserByEmail(normalizedEmail);
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

    async getById(id, requester = null) {
        const safeId = parsePositiveId(id, 'ID');
        const user = await UserModel.getUserById(safeId);

        if (!user) {
            throw new HttpError(404, 'Nenhum usuário encontrado.');
        }

        if (requester) {
            const isSelf = Number(user.id) === Number(requester.id);
            const isOwnChild = requester.role === 'admin' && Number(user.parentId) === Number(requester.id);
            if (!isSelf && !isOwnChild) {
                throw new HttpError(404, 'Nenhum usuário encontrado.');
            }
        }

        return this.mapUser(user);
    }

    async update(id, email, password, name, requester) {
        const safeId = parsePositiveId(id, 'ID');
        const userExists = await UserModel.getUserById(safeId);

        if (!userExists) {
            throw new HttpError(404, 'Usuário não encontrado.');
        }

        const isSelf = Number(userExists.id) === Number(requester?.id);
        const isOwnChild = requester?.role === 'admin' && Number(userExists.parentId) === Number(requester.id);
        if (!isSelf && !isOwnChild) {
            throw new HttpError(404, 'Usuário não encontrado.');
        }

        const safeEmail = validateUserEmail(email);
        const safeName = validateUserName(name);
        const safePassword = validatePassword(password, { required: true });

        const emailExists = await UserModel.getUserByEmail(safeEmail);
        if (emailExists && emailExists.id !== safeId) {
            throw new HttpError(409, 'Já existe um usuário cadastrado com este email.');
        }

        const hashPassword = await bcrypt.hash(safePassword, 10);
        const user = await UserModel.updateUser(safeId, safeEmail, hashPassword, safeName);

        return this.mapUser(user);
    }

    async delete(id, requester) {
        const safeId = parsePositiveId(id, 'ID');
        return this.deleteFamilyMember(requester?.id, safeId);
    }
}

module.exports = new UserController();
