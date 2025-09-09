const sendSuccess = (res, data, message = 'Operación exitosa', statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const sendError = (res, message = 'Error interno del servidor', statusCode = 500, errors = null) => {
    res.status(statusCode).json({
        success: false,
        message,
        errors
    });
};

const sendValidationError = (res, errors) => {
    res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
    });
};

module.exports = {
    sendSuccess,
    sendError,
    sendValidationError
};