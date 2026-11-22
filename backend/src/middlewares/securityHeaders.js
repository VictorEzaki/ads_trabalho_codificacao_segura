const helmet = require('helmet');

/**
 * Monta as opções do helmet diferenciando a CSP de /api-docs (Swagger UI) e da API.
 */
function buildHelmetOptions({ isProduction, allowSwaggerUi }) {
  const directives = allowSwaggerUi
    ? {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      }
    : {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      };

  return {
    contentSecurityPolicy: { directives },
    frameguard: { action: 'deny' },
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  };
}

/**
 * Aplica os cabeçalhos de segurança HTTP com política dedicada para Swagger UI e API.
 */
function createSecurityHeadersMiddleware({ isProduction = process.env.NODE_ENV === 'production' } = {}) {
  const apiHelmet = helmet(buildHelmetOptions({ isProduction, allowSwaggerUi: false }));
  const swaggerHelmet = helmet(buildHelmetOptions({ isProduction, allowSwaggerUi: true }));

  return (req, res, next) => {
    if (!isProduction && (req.path === '/api-docs' || req.path.startsWith('/api-docs/'))) {
      return swaggerHelmet(req, res, next);
    }
    return apiHelmet(req, res, next);
  };
}

module.exports = {
  createSecurityHeadersMiddleware,
};
