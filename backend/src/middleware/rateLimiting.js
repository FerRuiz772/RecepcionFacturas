/**
 * Middleware de rate limiting selectivo y por usuario
 * - readRateLimit: GET (30k/5min)
 * - writeRateLimit: POST/PUT/DELETE (10k/5min)
 * - authRateLimit: login/forgot/reset (500/5min)
 *
 * Reglas:
 * - Si req.user.userId existe, la key será `user_<id>` para separar por usuario
 * - Si no existe, la key será `ip_<ip>` (req.ip)
 * - En development (NODE_ENV=development) se usan límites muy altos
 * - Saltar limit para IPs locales (127.0.0.1, ::1, 192.168.*) en dev
 */
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const DEFAULTS = {
  READ: { windowMs: 5 * 60 * 1000, max: 30000 },
  WRITE: { windowMs: 5 * 60 * 1000, max: 10000 },
  AUTH: { windowMs: 5 * 60 * 1000, max: 500 },
  DEVELOPMENT: { windowMs: 5 * 60 * 1000, max: 100000 }
};

function isLocalIp(ip) {
  if (!ip) return false;
  return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('::ffff:192.168.');
}

function keyGenerator(req) {
  try {
    if (req.user && req.user.userId) return `user_${req.user.userId}`;
    // req.ip respetará trust proxy si está configurado
    return `ip_${req.ip || req.connection?.remoteAddress || 'unknown'}`;
  } catch (err) {
    return `ip_${req.ip || 'unknown'}`;
  }
}

function makeMessage(tipo) {
  return `Demasiadas peticiones ${tipo}. Intente nuevamente más tarde.`;
}

function createLimiter({ windowMs, max, tipo }) {
  const isDev = process.env.NODE_ENV === 'development';

  return rateLimit({
    windowMs: windowMs || DEFAULTS.READ.windowMs,
    max: isDev ? DEFAULTS.DEVELOPMENT.max : (max || DEFAULTS.READ.max),
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: makeMessage(tipo) },
    handler: (req, res, next, options) => {
      const key = keyGenerator(req);
      // Log informativo con logger central
      if (logger && typeof logger.warn === 'function') {
        logger.warn(`[RATE_LIMIT] key=${key} method=${req.method} path=${req.originalUrl} limit=${options.max} windowMs=${options.windowMs}`);
      } else {
        console.warn(`[RATE_LIMIT] key=${key} method=${req.method} path=${req.originalUrl} limit=${options.max} windowMs=${options.windowMs}`);
      }
      return res.status(options.statusCode || 429).json({ error: makeMessage(tipo), code: 'RATE_LIMIT_EXCEEDED' });
    },
    skip: (req) => {
      // Saltar para IPs locales en desarrollo
      if (isDev && isLocalIp(req.ip)) return true;
      return false;
    }
  });
}

const readRateLimit = createLimiter({ windowMs: DEFAULTS.READ.windowMs, max: DEFAULTS.READ.max, tipo: 'de lectura (GET)' });
const writeRateLimit = createLimiter({ windowMs: DEFAULTS.WRITE.windowMs, max: DEFAULTS.WRITE.max, tipo: 'de escritura (POST/PUT/DELETE)' });
const authRateLimit = createLimiter({ windowMs: DEFAULTS.AUTH.windowMs, max: DEFAULTS.AUTH.max, tipo: 'de autenticación' });

module.exports = {
  readRateLimit,
  writeRateLimit,
  authRateLimit,
  _internal: { keyGenerator, isLocalIp, DEFAULTS }
};
