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

const app = express();

// Inicializar base de datos
initializeDatabase().then(connected => {
    if (!connected) {
        logger.error('No se pudo conectar a la base de datos. Cerrando aplicación.');
        process.exit(1);
    } else {
        // Inicializar usuarios después de conectar a la DB
        initializeUsers();
    }
});

// Función para inicializar usuarios con contraseñas hasheadas
const initializeUsers = async () => {
    try {
        const { User } = require('./src/models');
        
        const usersToCreate = [
            { 
                email: 'admin@recepcionfacturas.com', 
                password: 'admin123', 
                name: 'Super Administrador', 
                role: 'super_admin' 
            },
            { 
                email: 'contaduria@recepcionfacturas.com', 
                password: 'contaduria123', 
                name: 'Admin Contaduría', 
                role: 'admin_contaduria' 
            },
            { 
                email: 'trabajador@recepcionfacturas.com', 
                password: 'trabajador123', 
                name: 'Trabajador Contaduría', 
                role: 'trabajador_contaduria' 
            },
            { 
                email: 'proveedor@recepcionfacturas.com', 
                password: 'proveedor123', 
                name: 'Usuario Proveedor', 
                role: 'proveedor', 
                supplier_id: 1 
            }
        ];

        for (const userData of usersToCreate) {
            const existingUser = await User.findOne({ where: { email: userData.email } });
            
            if (!existingUser) {
                const hashedPassword = await bcrypt.hash(userData.password, 12);
                await User.create({
                    email: userData.email,
                    password_hash: hashedPassword,
                    name: userData.name,
                    role: userData.role,
                    supplier_id: userData.supplier_id || null,
                    is_active: true
                });
                console.log(`👤 Usuario creado: ${userData.email} / ${userData.password}`);
            }
        }
        
        console.log('✅ Inicialización de usuarios completada');
        console.log('');
        console.log('🔑 Credenciales disponibles:');
        console.log('👤 Super Admin: admin@recepcionfacturas.com / admin123');
        console.log('👤 Admin Contaduría: contaduria@recepcionfacturas.com / contaduria123');
        console.log('👤 Trabajador: trabajador@recepcionfacturas.com / trabajador123');
        console.log('👤 Proveedor: proveedor@recepcionfacturas.com / proveedor123');
        console.log('');
        
    } catch (error) {
        console.log('⚠️ Error inicializando usuarios:', error.message);
    }
};

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX),
    message: 'Demasiadas peticiones, intente nuevamente más tarde'
});
app.use('/api/', limiter);

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Debug middleware para ver las peticiones
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/invoices', require('./src/routes/invoices'));
app.use('/api/suppliers', require('./src/routes/suppliers'));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Ruta de prueba para verificar que el servidor funciona
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Backend funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Error handler (debe ir al final)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled Promise Rejection:', err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 API disponible en: http://localhost:${PORT}`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

module.exports = app;