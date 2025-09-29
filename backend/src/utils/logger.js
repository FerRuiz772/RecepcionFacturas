/**
 * Sistema de logging centralizado para PayQuetzal
 * 
 * Proporciona logging estructurado usando Winston con múltiples niveles y destinos
 * Organiza logs por tipo y criticidad para facilitar debugging y monitoreo
 * 
 * Características principales:
 * - Logs rotativos con límite de tamaño y cantidad de archivos
 * - Separación por tipo: errores, acceso, eventos generales
 * - Funciones especializadas para diferentes tipos de eventos
 * - Formato consistente con timestamps y niveles
 * - Output a consola en desarrollo, archivos en producción
 * 
 * Archivos de log generados:
 * - error.log: Solo errores y eventos críticos
 * - combined.log: Todos los eventos del sistema
 * - access.log: Peticiones HTTP y eventos de acceso
 * 
 * Niveles soportados: error, warn, info, http, verbose, debug, silly
 * 
 * Funciones especializadas:
 * - logAuth: Eventos de autenticación (login/logout)
 * - logInvoice: Operaciones con facturas
 * - logCritical: Errores críticos del sistema
 * - logPerformance: Métricas de rendimiento
 * - logFile: Operaciones con archivos
 * - logSystem: Eventos generales del sistema
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logDir = path.join(__dirname, '../../logs');
let useFileLogs = true;
try {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
        console.log('📁 Directorio de logs creado:', logDir);
    }
} catch (err) {
    // Si no se puede crear el directorio (p. ej. EACCES en contenedores con volumen montado),
    // no detener la aplicación. Hacer fallback a logging por consola únicamente.
    useFileLogs = false;
    console.warn('⚠️ No se pudo crear el directorio de logs, usando solo consola. Error:', err.message);
}

/**
 * Formato personalizado para logs con timestamp y manejo de stack traces
 * Proporciona formato consistente y legible para todos los tipos de log
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }), // Captura stack traces automáticamente
    winston.format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
            // Para errores con stack trace, incluir información completa
            return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
);

/**
 * Configuración principal del logger con múltiples transportes
 * Organiza logs por criticidad y tipo para análisis eficiente
 */
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info', // Nivel configurable por entorno
    format: logFormat,
    defaultMeta: { service: 'payquetzal-backend' },
    transports: []
});

// Agregar transportes condicionalmente: archivos si están disponibles, y consola en desarrollo
if (useFileLogs) {
    logger.add(new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5,
        tailable: true
    }));

    logger.add(new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880,
        maxFiles: 5,
        tailable: true
    }));

    logger.add(new winston.transports.File({
        filename: path.join(logDir, 'access.log'),
        level: 'http',
        maxsize: 5242880,
        maxFiles: 3,
        tailable: true
    }));
} else {
    // Si no podemos escribir archivos, asegurarnos de que haya al menos salida por consola
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// En desarrollo, agregar output a consola con colores para mejor legibilidad
if (process.env.NODE_ENV === 'development') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(), // Colores por nivel de log
            winston.format.simple() // Formato simplificado para consola
        )
    }));
    console.log('🔧 Logger configurado para desarrollo con output a consola');
}

// ========== FUNCIONES ESPECIALIZADAS DE LOGGING ==========

/**
 * Registra eventos de autenticación con contexto de seguridad
 * Útil para detectar intentos de acceso no autorizado
 * 
 * @param {string} action - Tipo de acción (login, logout, register, etc.)
 * @param {Object} user - Datos del usuario involucrado
 * @param {string} ip - Dirección IP del cliente
 * @param {boolean} success - Si la operación fue exitosa
 */
logger.logAuth = (action, user, ip, success = true) => {
    const level = success ? 'info' : 'warn';
    const message = `AUTH: ${action} - Usuario: ${user?.email || 'unknown'} - IP: ${ip} - ${success ? 'EXITOSO' : 'FALLIDO'}`;
    logger[level](message);
};

/**
 * Registra operaciones específicas con facturas
 * Mantiene auditoría completa del workflow de facturas
 * 
 * @param {string} action - Acción realizada (create, update, delete, status_change, etc.)
 * @param {number} invoiceId - ID de la factura afectada
 * @param {number} userId - ID del usuario que realizó la acción
 * @param {Object} details - Información adicional contextual
 */
logger.logInvoice = (action, invoiceId, userId, details = {}) => {
    const message = `INVOICE: ${action} - ID: ${invoiceId} - Usuario: ${userId} - Detalles: ${JSON.stringify(details)}`;
    logger.info(message);
};

/**
 * Registra errores críticos que requieren atención inmediata
 * Incluye contexto adicional para debugging rápido
 * 
 * @param {string} message - Descripción del error crítico
 * @param {Error} error - Objeto de error con stack trace
 * @param {Object} context - Información adicional del contexto
 */
logger.logCritical = (message, error, context = {}) => {
    const errorMessage = `CRITICO: ${message} - Contexto: ${JSON.stringify(context)}`;
    if (error && error.stack) {
        logger.error(errorMessage, { stack: error.stack });
    } else {
        logger.error(errorMessage);
    }
};

/**
 * Registra métricas de rendimiento para optimización
 * Alerta sobre operaciones lentas que requieren atención
 * 
 * @param {string} operation - Nombre de la operación medida
 * @param {number} duration - Tiempo de ejecución en milisegundos
 * @param {Object} details - Detalles adicionales de la operación
 */
logger.logPerformance = (operation, duration, details = {}) => {
    const message = `PERFORMANCE: ${operation} - Duración: ${duration}ms - Detalles: ${JSON.stringify(details)}`;
    if (duration > 1000) {
        // Operaciones que toman más de 1 segundo se marcan como warnings
        logger.warn(message);
    } else {
        logger.info(message);
    }
};

/**
 * Registra operaciones con archivos para auditoría
 * Importante para tracking de uploads, descargas y manipulación de documentos
 * 
 * @param {string} action - Acción realizada (upload, download, delete, etc.)
 * @param {string} filename - Nombre del archivo involucrado
 * @param {number} userId - ID del usuario que realizó la acción
 * @param {number} size - Tamaño del archivo en bytes (opcional)
 */
logger.logFile = (action, filename, userId, size = null) => {
    const sizeInfo = size ? ` - Tamaño: ${(size / 1024 / 1024).toFixed(2)}MB` : '';
    const message = `FILE: ${action} - Archivo: ${filename} - Usuario: ${userId}${sizeInfo}`;
    logger.info(message);
};

/**
 * Registra eventos generales del sistema
 * Para eventos que no encajan en otras categorías específicas
 * 
 * @param {string} event - Tipo de evento del sistema
 * @param {Object} details - Detalles específicos del evento
 */
logger.logSystem = (event, details = {}) => {
    const message = `SYSTEM: ${event} - Detalles: ${JSON.stringify(details)}`;
    logger.info(message);
};

// Log de inicialización del sistema
logger.logSystem('Logger inicializado', {
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    logDirectory: logDir
});

module.exports = logger;