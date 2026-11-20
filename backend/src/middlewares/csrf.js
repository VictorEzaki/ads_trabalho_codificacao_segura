const { CSRF_TOKEN_COOKIE_NAME } = require('../utils/cookie');
const { timingSafeEqualStrings } = require('../utils/token');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Endpoints públicos que ainda não possuem sessão/cookies autenticados
const PUBLIC_CSRF_EXEMPT_ROUTES = [
    { method: 'POST', path: '/auth/login' },
    { method: 'POST', path: '/users' },
];

function isPublicCsrfExempt(req) {
    const normalizedPath = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
    return PUBLIC_CSRF_EXEMPT_ROUTES.some(
        (route) => route.method === req.method && route.path === normalizedPath
    );
}

module.exports = function csrfMiddleware(req, res, next) {
    if (SAFE_METHODS.has(req.method) || isPublicCsrfExempt(req)) {
        return next();
    }

    const cookieToken = req.cookies?.[CSRF_TOKEN_COOKIE_NAME];
    const headerToken = req.get('X-CSRF-Token');

    if (!cookieToken || !headerToken || !timingSafeEqualStrings(cookieToken, headerToken)) {
        return res.status(403).json({ message: 'Token CSRF inválido ou ausente' });
    }

    return next();
};
