const { ACCESS_TOKEN_COOKIE_NAME } = require('../utils/cookie');
const { verifyAccessToken } = require('../utils/token');

module.exports = function authMiddleware(req, res, next) {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ message: 'Token não informado' });
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = {
            id: decoded.id,
            email: decoded.email,
        };

        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
};
