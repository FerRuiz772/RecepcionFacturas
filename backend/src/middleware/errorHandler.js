const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    // Error de validación de Sequelize
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Error de validación',
            details: err.errors.map(e => ({
                field: e.path,
                message: e.message
            }))
        });
    }

    // Error de clave única
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            error: 'El recurso ya existe',
            details: err.errors.map(e => ({
                field: e.path,
                message: e.message
            }))
        });
    }

    // Error de referencia foránea
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            error: 'Error de referencia: el recurso relacionado no existe'
        });
    }

    // Error de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token inválido'
        });
    }

    // Error de JWT expirado
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expirado'
        });
    }

    // Error por defecto
    res.status(500).json({
        error: 'Error interno del servidor'
    });
};

module.exports = errorHandler;