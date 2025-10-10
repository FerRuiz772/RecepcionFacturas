/**
 * Servidor principal de la aplicación PayQuetzal
 * Configura Express con middleware de seguridad, CORS, rate limiting y rutas
 * Inicializa conexión a base de datos y manejo de errores centralizado
 * 
 * Características principales:
 * - Autenticación JWT
 * - Upload de archivos con multer
 * - Rate limiting configurable
 * - Logs de peticiones y errores
 * - CORS configurado para frontend
 * - Compresión gzip
 * - Helmet para seguridad
 */

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
const emailService = require('./src/utils/emailService');
const whatsappService = require('./src/utils/whatsappService');
const { initializeCommentNotificationService } = require('./src/utils/commentNotificationService');

const app = express();

// Confiar en el primer proxy (Apache) para que req.ip refleje X-Forwarded-For
app.set('trust proxy', 1);

// Validar variables de entorno críticas para evitar errores silenciosos en runtime
const requiredEnv = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = requiredEnv.filter(k => !process.env[k]);
if (missing.length) {
    console.error('Faltan variables de entorno críticas:', missing.join(', '));
    // Salir con código de error para que Docker / orchestrator lo detecte
    process.exit(1);
}

// Inicializar conexión a base de datos MySQL
initializeDatabase().then(connected => {
    if (!connected) {
        logger.error('No se pudo conectar a la base de datos. Cerrando aplicación.');
        process.exit(1);
    } else {
        console.log('✅ Base de datos conectada correctamente');
    }
});

// Middleware de seguridad con Helmet (configurado para permitir iframes del frontend)
app.use(helmet({
    frameguard: false, // Permitir iframes para integración con frontend
    contentSecurityPolicy: {
        directives: {
            frameAncestors: ["'self'", "http://localhost:8080", "https://localhost:8080"]
        }
    }
}));

// Configuración de CORS para permitir peticiones del frontend
if (process.env.NODE_ENV === 'development') {
    // En desarrollo permitimos cualquier origin y devolvemos el origin solicitado
    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        // Allow common request headers including cache control which some browsers add
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma', 'Expires']
    }));
} else {
    const allowedOrigin = process.env.FRONTEND_URL || '';
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigin && origin === allowedOrigin) return callback(null, true);
            return callback(new Error(`CORS policy: origin not allowed: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        // Allow common request headers including cache control which some browsers add
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma', 'Expires']
    }));
}

// Nota: eliminamos el rate limiting global para aplicar limiters más selectivos por ruta
// (lectura, escritura, autenticación) y para soportar rate limiting por userId cuando exista.

// Middleware general para procesamiento de peticiones
app.use(compression()); // Compresión gzip para mejorar performance
app.use(morgan('combined')); // Logging detallado de peticiones HTTP
app.use(express.json({ limit: '10mb' })); // Parser JSON con límite de 10MB para archivos
app.use(express.urlencoded({ extended: true })); // Parser URL-encoded para formularios
app.use(requestLogger); // Logger personalizado para tracking de requests

// Middleware de debug para monitoreo de peticiones en desarrollo
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

/**
 * Configuración de rutas de la API
 * Cada ruta maneja un módulo específico del sistema
 */
app.use('/api/auth', require('./src/routes/auth')); // Autenticación y manejo de sesiones
app.use('/api/users', require('./src/routes/users')); // Gestión de usuarios y permisos
app.use('/api/invoices', require('./src/routes/invoices')); // Gestión de facturas y documentos
app.use('/api/suppliers', require('./src/routes/suppliers')); // Gestión de proveedores
app.use('/api/dashboard', require('./src/routes/dashboard')); // Métricas y dashboard principal
app.use('/api/whatsapp', require('./src/routes/whatsapp')); // WhatsApp QR y estado

/**
 * Health check endpoint para monitoreo de estado del servidor
 * Utilizado por sistemas de monitoreo y load balancers
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

/**
 * Ruta de prueba para verificar conectividad básica del API
 * Útil para troubleshooting y verificación de deploy
 */
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Backend funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Middleware de manejo de errores centralizado (debe ir al final de todo)
app.use(errorHandler);

/**
 * Manejo global de promesas rechazadas no capturadas
 * Previene crashes del servidor por errores asincrónicos no manejados
 */
process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled Promise Rejection:', err);
});

/**
 * Inicialización del servidor HTTP
 * Configuración del puerto y logging de inicio
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 API disponible en: http://localhost:${PORT}`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
    
    // Inicializar servicio de notificaciones de comentarios
    initializeCommentNotificationService();
    
    // Verificar configuración SMTP para facilitar debugging de envios de email
    try {
        const ok = await emailService.verifyConfiguration();
        console.log(`📧 Verificación SMTP: ${ok ? 'OK' : 'FAIL'}`);
    } catch (err) {
        console.error('❌ Error verificando SMTP en el arranque:', err);
    }
    
    // AÑADIDO: Inicializar WhatsApp
    try {
        await whatsappService.initialize();
        console.log('✅ WhatsApp conectado y listo');
    } catch (err) {
        console.error('❌ Error inicializando WhatsApp en el arranque:', err);
        console.error('⚠️ El sistema continuará sin WhatsApp');
    }
});

module.exports = app;