/**
 * Middleware de manejo centralizado de errores para la aplicación PayQuetzal
 * 
 * Captura y procesa todos los errores no manejados de la aplicación,
 * proporcionando respuestas consistentes y logging centralizado
 * 
 * Tipos de errores manejados:
 * - Errores de validación de Sequelize (campos requeridos, formatos, etc.)
 * - Errores de restricciones únicas (emails, NITs duplicados, etc.)
 * - Errores de claves foráneas (referencias inexistentes)
 * - Errores de JWT (tokens inválidos o expirados)
 * - Errores genéricos del servidor
 * 
 * Características:
 * - Logging automático de stack traces para debugging
 * - Respuestas estructuradas con códigos HTTP apropiados
 * - Ocultación de detalles sensibles en producción
 * - Mensajes user-friendly para el frontend
 * 
 * Debe ser el último middleware en el stack de Express
 */

const logger = require('../utils/logger');

/**
 * Middleware de manejo de errores centralizado
 * Procesa errores de toda la aplicación y retorna respuestas apropiadas
 * 
 * @param {Error} err - Error capturado
 * @param {Express.Request} req - Request object de Express
 * @param {Express.Response} res - Response object de Express
 * @param {Function} next - Función next de Express (no usada, pero requerida)
 */
const errorHandler = (err, req, res, next) => {
    // Log completo del error para debugging
    logger.error('Error capturado por errorHandler:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Error de validación de Sequelize (campos requeridos, tipos incorrectos, etc.)
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Error de validación',
            details: err.errors.map(e => ({
                field: e.path,
                message: e.message,
                value: e.value
            }))
        });
    }

    // Error de restricción única (email duplicado, NIT duplicado, etc.)
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            error: 'El recurso ya existe',
            details: err.errors.map(e => ({
                field: e.path,
                message: `El valor '${e.value}' ya está en uso`,
                constraint: e.type
            }))
        });
    }

    // Error de clave foránea (referencia a registro inexistente)
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            error: 'Error de referencia: el recurso relacionado no existe',
            details: {
                table: err.table,
                field: err.fields?.[0],
                value: err.value
            }
        });
    }

    // Error de JWT malformado o firma inválida
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token de autenticación inválido',
            details: 'El token proporcionado no es válido'
        });
    }

    // Error de JWT expirado
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token de autenticación expirado',
            details: 'La sesión ha expirado, por favor inicie sesión nuevamente',
            expiredAt: err.expiredAt
        });
    }

    // Error de Multer (upload de archivos)
    if (err.name === 'MulterError') {
        let message = 'Error en el upload de archivo';
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'El archivo es demasiado grande (máximo 10MB)';
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            message = 'Demasiados archivos (máximo 5)';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Campo de archivo inesperado';
        }
        
        return res.status(400).json({
            error: message,
            code: err.code
        });
    }

    // Error de acceso denegado (permisos)
    if (err.statusCode === 403 || err.status === 403) {
        return res.status(403).json({
            error: 'Acceso denegado',
            details: err.message || 'No tienes permisos para realizar esta acción'
        });
    }

    // Error genérico del servidor
    const statusCode = err.statusCode || err.status || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(statusCode).json({
        error: statusCode === 500 ? 'Error interno del servidor' : err.message,
        ...(isDevelopment && { 
            stack: err.stack,
            details: err.details 
        })
    });
};

module.exports = errorHandler;