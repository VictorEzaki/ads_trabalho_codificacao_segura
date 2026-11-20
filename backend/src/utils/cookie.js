require('dotenv').config();

const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const CSRF_TOKEN_COOKIE_NAME = 'csrfToken';

const DEFAULT_ACCESS_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos
const DEFAULT_REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const VALID_SAME_SITE_VALUES = new Set(['lax', 'strict', 'none']);

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getAccessMaxAgeMs() {
  return parsePositiveNumber(process.env.COOKIE_ACCESS_MAX_AGE_MS, DEFAULT_ACCESS_MAX_AGE_MS);
}

function getRefreshMaxAgeMs() {
  return parsePositiveNumber(process.env.COOKIE_REFRESH_MAX_AGE_MS, DEFAULT_REFRESH_MAX_AGE_MS);
}

function getSameSite() {
  const raw = (process.env.COOKIE_SAME_SITE || 'lax').trim().toLowerCase();
  return VALID_SAME_SITE_VALUES.has(raw) ? raw : 'lax';
}

function getBaseCookieOptions({ httpOnly = true, path = '/' } = {}) {
  const sameSite = getSameSite();
  const isSecure = process.env.NODE_ENV === 'production' || sameSite === 'none';

  const options = {
    httpOnly,
    secure: isSecure,
    sameSite,
    path,
  };

  if (isSecure && sameSite === 'none') {
    options.partitioned = true;
  }

  return options;
}

function setCsrfCookie(res, csrfToken) {
  res.cookie(CSRF_TOKEN_COOKIE_NAME, csrfToken, {
    ...getBaseCookieOptions({ httpOnly: false, path: '/' }),
    maxAge: getRefreshMaxAgeMs(),
  });
}

function setAuthCookies(res, accessToken, refreshToken, csrfToken) {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    ...getBaseCookieOptions({ httpOnly: true, path: '/' }),
    maxAge: getAccessMaxAgeMs(),
  });

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...getBaseCookieOptions({ httpOnly: true, path: '/api/auth' }),
    maxAge: getRefreshMaxAgeMs(),
  });

  if (csrfToken) {
    setCsrfCookie(res, csrfToken);
  }
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getBaseCookieOptions({ httpOnly: true, path: '/' }));
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getBaseCookieOptions({ httpOnly: true, path: '/api/auth' }));
  res.clearCookie(CSRF_TOKEN_COOKIE_NAME, getBaseCookieOptions({ httpOnly: false, path: '/' }));
}

module.exports = {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  CSRF_TOKEN_COOKIE_NAME,
  getAccessMaxAgeMs,
  getRefreshMaxAgeMs,
  setCsrfCookie,
  setAuthCookies,
  clearAuthCookies,
};
