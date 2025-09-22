/**
 * Middleware de logging de peticiones HTTP para PayQuetzal
 * 
 * Registra información detallada de todas las peticiones HTTP para:
 * - Monitoreo de performance (tiempo de respuesta)
 * - Auditoría de acceso (quién accede a qué)
 * - Debugging de problemas (códigos de estado, errores)
 * - Análisis de uso del sistema
 * 
 * Información capturada:
 * - Método HTTP y URL solicitada
 * - Código de estado de respuesta
 * - Tiempo de procesamiento en milisegundos
 * - IP del cliente para geolocalización/seguridad
 * - User-Agent para análisis de dispositivos/navegadores
 * - ID del usuario autenticado (si aplica)
 * 
 * El logging se realiza al finalizar la respuesta para capturar
 * el código de estado correcto y el tiempo total de procesamiento
 */

const logger = require('../utils/logger');

/**
 * Middleware para logging automático de peticiones HTTP
 * Captura métricas de performance y información de auditoría
 * 
 * @param {Express.Request} req - Request object de Express
 * @param {Express.Response} res - Response object de Express  
 * @param {Function} next - Función next de Express
 */
const requestLogger = (req, res, next) => {
    // Registrar tiempo de inicio para calcular duración
    const start = Date.now();
    
    // Capturar IP real considerando proxies y load balancers
    const realIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   req.ip;
    
    // Event listener para cuando la respuesta termine
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Construir objeto de log con información completa
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: realIP,
            userAgent: req.get('User-Agent'),
            userId: req.user?.userId || 'anonymous',
            contentLength: res.get('Content-Length') || 0,
            referer: req.get('Referer') || 'direct'
        };
        
        // Determinar nivel de log basado en código de estado
        if (res.statusCode >= 500) {
            // Errores del servidor - nivel error
            logger.error('HTTP Request - Server Error', logData);
        } else if (res.statusCode >= 400) {
            // Errores del cliente - nivel warning
            logger.warn('HTTP Request - Client Error', logData);
        } else if (duration > 5000) {
            // Respuestas lentas (>5s) - nivel warning
            logger.warn('HTTP Request - Slow Response', logData);
        } else {
            // Respuestas normales - nivel info
            logger.info('HTTP Request', logData);
        }
        
        // Log adicional para requests de upload (debug de archivos grandes)
        if (req.headers['content-type']?.includes('multipart/form-data')) {
            logger.debug('File Upload Request', {
                ...logData,
                contentType: req.headers['content-type'],
                contentLength: req.headers['content-length']
            });
        }
    });
    
    // Continuar con el siguiente middleware
    next();
};

module.exports = requestLogger;