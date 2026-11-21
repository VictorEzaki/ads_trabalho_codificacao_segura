const HttpError = require('../errors/HttpError');

/**
 * Garante que apenas usuários com uma das roles permitidas acessem a rota.
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return next(new HttpError(403, 'Acesso negado. Permissão insuficiente.'));
        }

        return next();
    };
}

module.exports = { requireRole };
