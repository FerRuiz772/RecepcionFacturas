const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { initializeDatabase } = require('./src/utils/database');
const errorHandler = require('./src/middleware/errorHandler');
const requestLogger = require('./src/middleware/requestLogger');
const logger = require('./src/utils/logger');
const bcrypt = require('bcrypt');

const app = express();

// Inicializar base de datos
initializeDatabase().then(connected => {
    if (!connected) {
        logger.error('No se pudo conectar a la base de datos. Cerrando aplicación.');
        process.exit(1);
    } else {
        console.log('✅ Base de datos conectada correctamente');
    }
});



// Security middleware
app.use(helmet({
    frameguard: false, // Permitir iframes
    contentSecurityPolicy: {
        directives: {
            frameAncestors: ["'self'", "http://localhost:8080", "https://localhost:8080"]
        }
    }
}));
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Rate limiting
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW) || 15; // 15 minutos por defecto
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'development' ? 1000 : 100); // 1000 en dev, 100 en prod

const limiter = rateLimit({
    windowMs: windowMs * 60 * 1000, // Convertir minutos a milisegundos
    max: maxRequests,
    message: 'Demasiadas peticiones, intente nuevamente más tarde',
    skip: (req) => {
        // Saltar rate limiting para IPs locales en desarrollo
        const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip.startsWith('192.168.') || req.ip.startsWith('::ffff:192.168.')
        return process.env.NODE_ENV === 'development' && isLocal
    }
});
app.use('/api/', limiter);

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Debug middleware para ver las peticiones
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/invoices', require('./src/routes/invoices'));
app.use('/api/suppliers', require('./src/routes/suppliers'));
app.use('/api/dashboard', require('./src/routes/dashboard'));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Ruta de prueba para verificar que el servidor funciona
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Backend funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Error handler (debe ir al final)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled Promise Rejection:', err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 API disponible en: http://localhost:${PORT}`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

module.exports = app;