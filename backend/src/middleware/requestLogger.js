const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.userId
        };
        
        logger.info('HTTP Request', logData);
    });
    
    next();
};

module.exports = requestLogger;