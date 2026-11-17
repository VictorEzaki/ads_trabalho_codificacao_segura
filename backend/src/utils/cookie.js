require('dotenv').config();

const ACCESS_TOKEN_COOKIE_NAME = "accessToken";
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

function getBaseCookieOptions() {
  const isSecure =
    process.env.NODE_ENV === "production" || process.env.COOKIE_SAME_SITE === "none";

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: process.env.COOKIE_SAME_SITE,
    partitioned: isSecure && process.env.COOKIE_SAME_SITE === "none",
    path: "/",
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  const baseOptions = getBaseCookieOptions();

  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    ...baseOptions,
    maxAge: process.env.COOKIE_ACCESS_MAX_AGE_MS,
  });

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...baseOptions,
    maxAge: process.env.COOKIE_REFRESH_MAX_AGE_MS,
  });
}

function clearAuthCookies(res) {
  const baseOptions = getBaseCookieOptions();

  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, baseOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, baseOptions);
}

module.exports = {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  setAuthCookies,
  clearAuthCookies,
};