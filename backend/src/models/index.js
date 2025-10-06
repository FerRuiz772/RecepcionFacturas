/**
 * Índice de modelos - Configuración central de Sequelize y relaciones
 * 
 * Este archivo centraliza:
 * - Importación de todos los modelos de la aplicación
 * - Definición de relaciones entre entidades (associations)
 * - Exportación unificada para uso en controladores
 * - Configuración de operadores de Sequelize
 * 
 * Estructura de relaciones:
 * 
 * User (Usuario central del sistema)
 * ├── belongsTo Supplier (proveedores pueden tener usuarios)
 * ├── hasMany UserPermission (permisos granulares)
 * ├── hasMany Invoice.assigned_to (facturas asignadas)
 * ├── hasMany InvoiceState (cambios de estado realizados)
 * ├── hasMany SystemLog (acciones del usuario)
 * └── hasMany PasswordResetToken (tokens de reset)
 * 
 * Supplier (Proveedores)
 * ├── hasMany User (usuarios asociados al proveedor)
 * └── hasMany Invoice (facturas del proveedor)
 * 
 * Invoice (Facturas - entidad central del workflow)
 * ├── belongsTo Supplier (proveedor emisor)
 * ├── belongsTo User.assigned_to (contador asignado)
 * ├── hasMany InvoiceState (historial de estados)
 * └── hasOne Payment (información de pago)
 * 
 * Payment (Pagos 1:1 con facturas)
 * └── belongsTo Invoice (factura asociada)
 * 
 * Auditoría y seguridad:
 * - SystemLog: Registra todas las acciones del sistema
 * - InvoiceState: Historial de cambios de estado de facturas
 * - PasswordResetToken: Tokens seguros para reset de contraseñas
 * - UserPermission: Permisos granulares complementarios a roles
 */

const sequelize = require('../config/database');
const { Op } = require('sequelize');

// Importación de todos los modelos del sistema
const User = require('./User');
const Supplier = require('./Supplier');
const Invoice = require('./Invoice');
const InvoiceState = require('./InvoiceState');
const Payment = require('./Payment');
const SystemLog = require('./SystemLog');
const PasswordResetToken = require('./PasswordResetToken')(sequelize);
const UserPermission = require('./UserPermission');
const InvoiceComment = require('./InvoiceComment');

// ========== DEFINICIÓN DE RELACIONES ENTRE ENTIDADES ==========

/**
 * Relaciones Supplier - User
 * Un proveedor puede tener múltiples usuarios asociados
 * Los usuarios pueden estar asociados a un proveedor (opcional)
 */
Supplier.hasMany(User, { foreignKey: 'supplier_id', as: 'users', onDelete: 'SET NULL' });
User.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', allowNull: true });

/**
 * Relaciones User - UserPermission  
 * Sistema de permisos granulares complementario a roles
 * Un usuario puede tener múltiples permisos específicos
 */
User.hasMany(UserPermission, { foreignKey: 'user_id', as: 'userPermissions', onDelete: 'CASCADE' });
UserPermission.belongsTo(User, { foreignKey: 'user_id', as: 'user', allowNull: false });

/**
 * Relaciones User - Invoice (asignación)
 * Las facturas pueden ser asignadas a un contador específico
 * Un usuario puede tener múltiples facturas asignadas
 */
User.hasMany(Invoice, { foreignKey: 'assigned_to', as: 'assignedInvoices', onDelete: 'SET NULL' });
Invoice.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser', allowNull: true });

/**
 * Relaciones Supplier - Invoice
 * Un proveedor puede tener múltiples facturas
 * Cada factura pertenece a un proveedor específico
 */
Supplier.hasMany(Invoice, { foreignKey: 'supplier_id', as: 'invoices', onDelete: 'CASCADE' });
Invoice.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', allowNull: false });

/**
 * Relaciones Invoice - InvoiceState (auditoría de estados)
 * Una factura tiene múltiples cambios de estado a lo largo de su ciclo
 * Cada cambio de estado pertenece a una factura específica
 */
Invoice.hasMany(InvoiceState, { foreignKey: 'invoice_id', as: 'states', onDelete: 'CASCADE' });
InvoiceState.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice', allowNull: false });

/**
 * Relaciones User - InvoiceState (auditoría de usuarios)
 * Un usuario puede realizar múltiples cambios de estado
 * Cada cambio de estado es realizado por un usuario específico
 */
User.hasMany(InvoiceState, { foreignKey: 'user_id', as: 'stateChanges', onDelete: 'CASCADE' });
InvoiceState.belongsTo(User, { foreignKey: 'user_id', as: 'user', allowNull: false });

/**
 * Relaciones Invoice - Payment (1:1)
 * Una factura tiene una única información de pago asociada
 * La información de pago pertenece exclusivamente a una factura
 */
Invoice.hasOne(Payment, { foreignKey: 'invoice_id', as: 'payment', onDelete: 'CASCADE' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'Invoice', allowNull: false });

/**
 * Relaciones Invoice - InvoiceComment (comentarios/chat)
 * Una factura puede tener múltiples comentarios
 * Cada comentario pertenece a una factura específica
 */
Invoice.hasMany(InvoiceComment, { foreignKey: 'invoice_id', as: 'comments', onDelete: 'CASCADE' });
InvoiceComment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice', allowNull: false });

/**
 * Relaciones User - InvoiceComment (autoría de comentarios)
 * Un usuario puede crear múltiples comentarios
 * Cada comentario es creado por un usuario específico
 */
User.hasMany(InvoiceComment, { foreignKey: 'user_id', as: 'comments', onDelete: 'CASCADE' });
InvoiceComment.belongsTo(User, { foreignKey: 'user_id', as: 'user', allowNull: false });

/**
 * Relaciones User - SystemLog (auditoría del sistema)
 * Un usuario puede generar múltiples logs de sistema
 * Los logs pueden no tener usuario asociado (acciones anónimas)
 */
User.hasMany(SystemLog, { foreignKey: 'user_id', as: 'logs', onDelete: 'SET NULL' });
SystemLog.belongsTo(User, { foreignKey: 'user_id', as: 'user', allowNull: true });

/**
 * Relaciones User - PasswordResetToken (seguridad)
 * Un usuario puede tener múltiples tokens de reset (aunque solo uno activo)
 * Cada token pertenece a un usuario específico
 */
User.hasMany(PasswordResetToken, { foreignKey: 'user_id', as: 'passwordResetTokens', onDelete: 'CASCADE' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id', as: 'user', allowNull: false });

// ========== SCOPES PREDEFINIDOS PARA CONSULTAS COMUNES ==========

/**
 * Scopes para User - Filtros comunes de usuarios
 */
User.addScope('active', { where: { is_active: true } });
User.addScope('byRole', (role) => ({ where: { role } }));
User.addScope('contaduria', { where: { role: { [Op.in]: ['admin_contaduria','trabajador_contaduria'] } } });

/**
 * Scopes para Invoice - Filtros y consultas con relaciones
 */
Invoice.addScope('pending', { where: { status: { [Op.notIn]: ['proceso_completado','rechazada'] } } });
Invoice.addScope('byStatus', (status) => ({ where: { status } }));
Invoice.addScope('withDetails', {
    include: [
        { model: Supplier, as: 'supplier', attributes: ['id','business_name','nit'] },
        { model: User, as: 'assignedUser', attributes: ['id','name','email'], required: false },
        { model: Payment, as: 'payment', required: false }
    ]
});
Invoice.addScope('withHistory', {
    include: [{
        model: InvoiceState, as: 'states',
        include: [{ model: User, as: 'user', attributes: ['id','name'] }],
        order: [['timestamp', 'DESC']]
    }]
});

/**
 * Scopes para Supplier - Proveedores con estadísticas
 */
Supplier.addScope('active', { where: { is_active: true } });
Supplier.addScope('withStats', {
    include: [{ model: Invoice, as: 'invoices', attributes: [] }],
    attributes: {
        include: [
            [sequelize.fn('COUNT', sequelize.col('invoices.id')), 'total_invoices'],
            [sequelize.fn('SUM', sequelize.literal('CASE WHEN invoices.status = "proceso_completado" THEN invoices.amount ELSE 0 END')), 'total_paid']
        ]
    },
    group: ['Supplier.id']
});

// ========== MÉTODOS DE NEGOCIO ÚTILES ==========

/**
 * Auto-asignación inteligente de facturas a contadores
 * Distribuye la carga de trabajo entre trabajadores disponibles
 * 
 * @param {number} invoiceId - ID de la factura a asignar
 * @returns {number|null} ID del usuario asignado o null si no hay disponibles
 */
Invoice.autoAssign = async function(invoiceId) {
    // Buscar trabajadores de contaduría activos
    const workers = await User.scope('active').findAll({ where: { role: 'trabajador_contaduria' } });
    
    if (!workers.length) {
        // Si no hay trabajadores, asignar a admin de contaduría
        const admin = await User.scope('active').findOne({ where: { role: 'admin_contaduria' } });
        return admin ? admin.id : null;
    }
    
    // Calcular carga de trabajo actual de cada trabajador
    const workersWithCount = await Promise.all(workers.map(async (w) => {
        const count = await Invoice.count({ 
            where: { 
                assigned_to: w.id, 
                status: { [Op.notIn]: ['proceso_completado','rechazada'] } 
            } 
        });
        return { worker: w, count };
    }));
    
    // Retornar el trabajador con menor carga
    return workersWithCount.reduce((min, c) => c.count < min.count ? c : min).worker.id;
};

/**
 * Valida si una transición de estado es permitida según el workflow
 * 
 * @param {string} fromState - Estado actual
 * @param {string} toState - Estado destino
 * @returns {boolean} true si la transición es válida
 */
Invoice.validateStateTransition = function(fromState, toState) {
    const validTransitions = {
        'factura_subida': ['asignada_contaduria','rechazada'],
        'asignada_contaduria': ['en_proceso','rechazada'],
        'en_proceso': ['contrasena_generada','rechazada'],
        'contrasena_generada': ['retencion_isr_generada','rechazada'],
        'retencion_isr_generada': ['retencion_iva_generada','rechazada'],
        'retencion_iva_generada': ['pago_realizado','rechazada'],
        'pago_realizado': ['proceso_completado','rechazada'],
        'proceso_completado': [],
        'rechazada': ['factura_subida']
    };
    return validTransitions[fromState]?.includes(toState) || false;
};

/**
 * Obtiene los estados válidos siguientes para un estado dado
 * 
 * @param {string} currentState - Estado actual de la factura
 * @returns {string[]} Array de estados válidos siguientes
 */
Invoice.getNextValidStates = function(currentState) {
    const validTransitions = {
        'factura_subida': ['asignada_contaduria','rechazada'],
        'asignada_contaduria': ['en_proceso','rechazada'],
        'en_proceso': ['contrasena_generada','rechazada'],
        'contrasena_generada': ['retencion_isr_generada','rechazada'],
        'retencion_isr_generada': ['retencion_iva_generada','rechazada'],
        'retencion_iva_generada': ['pago_realizado','rechazada'],
        'pago_realizado': ['proceso_completado','rechazada'],
        'proceso_completado': [],
        'rechazada': ['factura_subida']
    };
    return validTransitions[currentState] || [];
};

// ========== UTILIDADES DE BASE DE DATOS ==========

/**
 * Sincroniza todos los modelos con la base de datos
 * Útil para desarrollo y migraciones
 * 
 * @param {boolean} force - Si true, elimina y recrea las tablas
 */
const syncDatabase = async (force = false) => {
    await Supplier.sync({ force });
    await User.sync({ force });
    await Invoice.sync({ force });
    await InvoiceState.sync({ force });
    await Payment.sync({ force });
    await SystemLog.sync({ force });
    await PasswordResetToken.sync({ force });
    await UserPermission.sync({ force });
    await InvoiceComment.sync({ force });
};

// ========== EXPORTACIÓN CENTRALIZADA ==========
module.exports = {
    // Configuración de Sequelize
    sequelize,
    Op,
    
    // Modelos principales
    User,
    Supplier,
    Invoice,
    InvoiceState,
    Payment,
    SystemLog,
    PasswordResetToken,
    UserPermission,
    InvoiceComment,
    
    // Utilidades
    syncDatabase
};
