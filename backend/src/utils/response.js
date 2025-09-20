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

// Función helper para crear respuestas consistentes
const createResponse = (success, message, data = null, errors = null) => {
    const response = {
        success,
        message
    };
    
    if (data !== null) {
        response.data = data;
    }
    
    if (errors !== null) {
        response.errors = errors;
    }
    
    return response;
};

module.exports = {
    sendSuccess,
    sendError,
    sendValidationError,
    createResponse
};