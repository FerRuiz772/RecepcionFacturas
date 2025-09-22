const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Configuración de conexión a base de datos MySQL con Sequelize
 * Utiliza variables de entorno para configuración flexible entre ambientes
 * Incluye configuración de charset UTF8MB4 para soporte completo de Unicode
 * Pool de conexiones configurado para optimizar rendimiento
 */
const sequelize = new Sequelize(
    process.env.DB_NAME || 'recepcion_facturas',     // Nombre de la base de datos
    process.env.DB_USER || 'admin',                  // Usuario de la base de datos
    process.env.DB_PASSWORD || 'admin123',           // Contraseña de la base de datos
    {
        host: process.env.DB_HOST || 'localhost',     // Host del servidor MySQL
        port: process.env.DB_PORT || 3306,           // Puerto del servidor MySQL
        dialect: 'mysql',                            // Dialecto de base de datos
        dialectOptions: {
            charset: 'utf8mb4',                       // Soporte completo Unicode (emojis, etc.)
        },
        define: {
            charset: 'utf8mb4',                       // Charset por defecto para tablas
            collate: 'utf8mb4_unicode_ci'            // Collation para ordenamiento correcto
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false, // Logs SQL solo en desarrollo
        pool: {
            max: 5,          // Máximo 5 conexiones simultáneas
            min: 0,          // Mínimo 0 conexiones en pool
            acquire: 30000,  // Tiempo máximo para obtener conexión (30s)
            idle: 10000      // Tiempo máximo de inactividad antes de cerrar (10s)
        },
        timezone: '-06:00'   // Zona horaria Guatemala (UTC-6)
    }
);

module.exports = sequelize;