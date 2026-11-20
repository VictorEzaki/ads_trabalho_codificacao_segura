const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: 'access',
    },
    authConfig.access.secret,
    {
      expiresIn: authConfig.access.expiresIn,
      jwtid: crypto.randomUUID(),
    }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: 'refresh',
    },
    authConfig.refresh.secret,
    {
      expiresIn: authConfig.refresh.expiresIn,
      jwtid: crypto.randomUUID(),
    }
  );
}

function verifyAccessToken(token) {
  const decoded = jwt.verify(token, authConfig.access.secret);
  if (decoded.type !== 'access') {
    throw new Error('Tipo de token inválido');
  }
  return decoded;
}

function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, authConfig.refresh.secret);
  if (decoded.type !== 'refresh') {
    throw new Error('Tipo de token inválido');
  }
  return decoded;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function timingSafeEqualStrings(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  if (bufferA.length === 0 || bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateCsrfToken,
  timingSafeEqualStrings,
};
