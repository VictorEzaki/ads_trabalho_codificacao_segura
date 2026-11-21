const { ACCESS_TOKEN_COOKIE_NAME } = require('../utils/cookie');
const { verifyAccessToken } = require('../utils/token');
const UserModel = require('../models/user');

module.exports = async function authMiddleware(req, res, next) {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ message: 'Token não informado' });
    }

    try {
        const decoded = verifyAccessToken(token);
        const user = await UserModel.getUserById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Usuário não encontrado ou sessão inválida' });
        }

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            parentId: user.parentId,
        };

        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
};
