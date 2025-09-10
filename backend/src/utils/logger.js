const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Formato personalizado para los logs
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
            return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
);

// Configuración del logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'recepcion-facturas' },
    transports: [
        // Logs de error
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        
        // Logs combinados
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        
        // Logs de acceso/requests
        new winston.transports.File({
            filename: path.join(logDir, 'access.log'),
            level: 'http',
            maxsize: 5242880, // 5MB
            maxFiles: 3,
            tailable: true
        })
    ]
});

// En desarrollo, también mostrar logs en consola
if (process.env.NODE_ENV === 'development') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Función para log de autenticación
logger.logAuth = (action, user, ip, success = true) => {
    const level = success ? 'info' : 'warn';
    const message = `AUTH: ${action} - Usuario: ${user?.email || 'unknown'} - IP: ${ip} - ${success ? 'EXITOSO' : 'FALLIDO'}`;
    logger[level](message);
};

// Función para log de operaciones de facturas
logger.logInvoice = (action, invoiceId, userId, details = {}) => {
    const message = `INVOICE: ${action} - ID: ${invoiceId} - Usuario: ${userId} - Detalles: ${JSON.stringify(details)}`;
    logger.info(message);
};

// Función para log de errores críticos
logger.logCritical = (message, error, context = {}) => {
    const errorMessage = `CRITICO: ${message} - Contexto: ${JSON.stringify(context)}`;
    if (error && error.stack) {
        logger.error(errorMessage, { stack: error.stack });
    } else {
        logger.error(errorMessage);
    }
};

// Función para log de performance
logger.logPerformance = (operation, duration, details = {}) => {
    const message = `PERFORMANCE: ${operation} - Duración: ${duration}ms - Detalles: ${JSON.stringify(details)}`;
    if (duration > 1000) {
        logger.warn(message);
    } else {
        logger.info(message);
    }
};

// Función para log de archivos
logger.logFile = (action, filename, userId, size = null) => {
    const sizeInfo = size ? ` - Tamaño: ${(size / 1024 / 1024).toFixed(2)}MB` : '';
    const message = `FILE: ${action} - Archivo: ${filename} - Usuario: ${userId}${sizeInfo}`;
    logger.info(message);
};

// Función para log de sistema
logger.logSystem = (event, details = {}) => {
    const message = `SYSTEM: ${event} - Detalles: ${JSON.stringify(details)}`;
    logger.info(message);
};

module.exports = logger;