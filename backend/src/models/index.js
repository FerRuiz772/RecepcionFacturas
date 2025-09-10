const sequelize = require('../config/database');
const { Op } = require('sequelize');

const User = require('./User');
const Supplier = require('./Supplier');
const Invoice = require('./Invoice');
const InvoiceState = require('./InvoiceState');
const Payment = require('./Payment');
const SystemLog = require('./SystemLog');

// ========== RELACIONES ==========

// Supplier - Users
Supplier.hasMany(User, { foreignKey: 'supplier_id', as: 'users', onDelete: 'SET NULL' });
User.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', allowNull: true });

// User - Assigned Invoices
User.hasMany(Invoice, { foreignKey: 'assigned_to', as: 'assignedInvoices', onDelete: 'SET NULL' });
Invoice.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser', allowNull: true });

// Supplier - Invoices
Supplier.hasMany(Invoice, { foreignKey: 'supplier_id', as: 'invoices', onDelete: 'CASCADE' });
Invoice.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', allowNull: false });

// Invoice - InvoiceStates
Invoice.hasMany(InvoiceState, { foreignKey: 'invoice_id', as: 'states', onDelete: 'CASCADE' });
InvoiceState.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice', allowNull: false });

// User - InvoiceStates
User.hasMany(InvoiceState, { foreignKey: 'user_id', as: 'stateChanges', onDelete: 'CASCADE' });
InvoiceState.belongsTo(User, { foreignKey: 'user_id', as: 'user', allowNull: false });

// Invoice - Payment
Invoice.hasOne(Payment, { foreignKey: 'invoice_id', as: 'payment', onDelete: 'CASCADE' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'Invoice', allowNull: false });

// User - SystemLog
User.hasMany(SystemLog, { foreignKey: 'user_id', as: 'logs', onDelete: 'SET NULL' });
SystemLog.belongsTo(User, { foreignKey: 'user_id', as: 'user', allowNull: true });

// ========== SCOPES ==========

// User
User.addScope('active', { where: { is_active: true } });
User.addScope('byRole', (role) => ({ where: { role } }));
User.addScope('contaduria', { where: { role: { [Op.in]: ['admin_contaduria','trabajador_contaduria'] } } });

// Invoice
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

// Supplier
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

// ========== MÉTODOS ÚTILES ==========

// Auto-asignación de facturas
Invoice.autoAssign = async function(invoiceId) {
    const workers = await User.scope('active').findAll({ where: { role: 'trabajador_contaduria' } });
    if (!workers.length) {
        const admin = await User.scope('active').findOne({ where: { role: 'admin_contaduria' } });
        return admin ? admin.id : null;
    }
    const workersWithCount = await Promise.all(workers.map(async (w) => {
        const count = await Invoice.count({ where: { assigned_to: w.id, status: { [Op.notIn]: ['proceso_completado','rechazada'] } } });
        return { worker: w, count };
    }));
    return workersWithCount.reduce((min,c) => c.count < min.count ? c : min).worker.id;
};

// Validación de transición de estado
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

// ========== EXPORTACIÓN ==========
const syncDatabase = async (force = false) => {
    await Supplier.sync({ force });
    await User.sync({ force });
    await Invoice.sync({ force });
    await InvoiceState.sync({ force });
    await Payment.sync({ force });
    await SystemLog.sync({ force });
};

module.exports = {
    sequelize,
    Op,
    User,
    Supplier,
    Invoice,
    InvoiceState,
    Payment,
    SystemLog,
    syncDatabase
};
