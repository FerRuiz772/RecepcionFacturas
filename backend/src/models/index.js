const sequelize = require('../config/database');
const User = require('./User');
const Supplier = require('./Supplier');
const Invoice = require('./Invoice');
const InvoiceState = require('./InvoiceState');
const Payment = require('./Payment');
const SystemLog = require('./SystemLog');

// ========== ASOCIACIONES PRINCIPALES ==========

// Usuario - Proveedor (Muchos usuarios pueden pertenecer a un proveedor)
Supplier.hasMany(User, { 
  foreignKey: 'supplier_id', 
  as: 'users',
  onDelete: 'SET NULL'
});
User.belongsTo(Supplier, { 
  foreignKey: 'supplier_id', 
  as: 'supplier',
  allowNull: true
});

// Usuario - Facturas Asignadas (Un usuario puede tener muchas facturas asignadas)
User.hasMany(Invoice, { 
  foreignKey: 'assigned_to', 
  as: 'assignedInvoices',
  onDelete: 'SET NULL'
});
Invoice.belongsTo(User, { 
  foreignKey: 'assigned_to', 
  as: 'assignedUser',
  allowNull: true
});

// Proveedor - Facturas (Un proveedor puede tener muchas facturas)
Supplier.hasMany(Invoice, { 
  foreignKey: 'supplier_id',
  as: 'invoices',
  onDelete: 'CASCADE'
});
Invoice.belongsTo(Supplier, { 
  foreignKey: 'supplier_id',
  as: 'Supplier',
  allowNull: false
});

// ========== ASOCIACIONES DE AUDITORÍA ==========

// Factura - Estados (Una factura puede tener muchos cambios de estado)
Invoice.hasMany(InvoiceState, { 
  foreignKey: 'invoice_id', 
  as: 'states',
  onDelete: 'CASCADE'
});
InvoiceState.belongsTo(Invoice, { 
  foreignKey: 'invoice_id',
  as: 'invoice',
  allowNull: false
});

// Usuario - Estados (Un usuario puede hacer muchos cambios de estado)
User.hasMany(InvoiceState, { 
  foreignKey: 'user_id', 
  as: 'stateChanges',
  onDelete: 'CASCADE'
});
InvoiceState.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  allowNull: false
});

// ========== ASOCIACIONES DE PAGOS ==========

// Factura - Pago (Una factura tiene un pago)
Invoice.hasOne(Payment, { 
  foreignKey: 'invoice_id',
  as: 'payment',
  onDelete: 'CASCADE'
});
Payment.belongsTo(Invoice, { 
  foreignKey: 'invoice_id',
  as: 'Invoice',
  allowNull: false
});

// ========== ASOCIACIONES DE LOGS ==========

// Usuario - Logs (Un usuario puede generar muchos logs)
User.hasMany(SystemLog, { 
  foreignKey: 'user_id', 
  as: 'logs',
  onDelete: 'SET NULL'
});
SystemLog.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  allowNull: true
});

// ========== HOOKS PARA AUDITORÍA AUTOMÁTICA ==========

// Hook para crear logs automáticamente en cambios importantes
const createAuditLog = async (instance, action, userId = null, details = {}) => {
  try {
    await SystemLog.create({
      user_id: userId,
      action: action,
      entity_type: instance.constructor.name,
      entity_id: instance.id,
      details: {
        ...details,
        changes: instance.changed() || [],
        previous: instance._previousDataValues || {}
      }
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

// Hooks para Invoice
Invoice.afterCreate((invoice, options) => {
  const userId = options.userId || options.transaction?.userId;
  createAuditLog(invoice, 'INVOICE_CREATED', userId, {
    number: invoice.number,
    amount: invoice.amount,
    supplier_id: invoice.supplier_id
  });
});

Invoice.afterUpdate((invoice, options) => {
  const userId = options.userId || options.transaction?.userId;
  createAuditLog(invoice, 'INVOICE_UPDATED', userId, {
    number: invoice.number,
    status: invoice.status
  });
});

// Hooks para Payment
Payment.afterCreate((payment, options) => {
  const userId = options.userId || options.transaction?.userId;
  createAuditLog(payment, 'PAYMENT_CREATED', userId, {
    invoice_id: payment.invoice_id,
    has_password: !!payment.password_generated
  });
});

Payment.afterUpdate((payment, options) => {
  const userId = options.userId || options.transaction?.userId;
  createAuditLog(payment, 'PAYMENT_UPDATED', userId, {
    invoice_id: payment.invoice_id,
    files_uploaded: {
      isr: !!payment.isr_retention_file,
      iva: !!payment.iva_retention_file,
      proof: !!payment.payment_proof_file
    }
  });
});

// ========== SCOPES ÚTILES ==========

// Scopes para User
User.addScope('active', {
  where: { is_active: true }
});

User.addScope('byRole', (role) => ({
  where: { role: role }
}));

User.addScope('contaduria', {
  where: {
    role: ['admin_contaduria', 'trabajador_contaduria']
  }
});

// Scopes para Invoice
Invoice.addScope('pending', {
  where: {
    status: {
      [sequelize.Sequelize.Op.notIn]: ['proceso_completado', 'rechazada']
    }
  }
});

Invoice.addScope('byStatus', (status) => ({
  where: { status: status }
}));

Invoice.addScope('withDetails', {
  include: [
    {
      model: Supplier,
      as: 'Supplier',
      attributes: ['id', 'business_name', 'nit']
    },
    {
      model: User,
      as: 'assignedUser',
      attributes: ['id', 'name', 'email'],
      required: false
    },
    {
      model: Payment,
      as: 'payment',
      required: false
    }
  ]
});

Invoice.addScope('withHistory', {
  include: [
    {
      model: InvoiceState,
      as: 'states',
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }],
      order: [['timestamp', 'DESC']]
    }
  ]
});

// Scopes para Supplier
Supplier.addScope('active', {
  where: { is_active: true }
});

Supplier.addScope('withStats', {
  include: [{
    model: Invoice,
    as: 'invoices',
    attributes: []
  }],
  attributes: {
    include: [
      [
        sequelize.fn('COUNT', sequelize.col('invoices.id')),
        'total_invoices'
      ],
      [
        sequelize.fn('SUM', 
          sequelize.literal('CASE WHEN invoices.status = "proceso_completado" THEN invoices.amount ELSE 0 END')
        ),
        'total_paid'
      ]
    ]
  },
  group: ['Supplier.id']
});

// ========== MÉTODOS DE CLASE ÚTILES ==========

// Método para obtener estadísticas del dashboard
Invoice.getDashboardStats = async function(userId = null, role = null) {
  const whereClause = {};
  
  // Filtrar por usuario si es trabajador
  if (role === 'trabajador_contaduria' && userId) {
    whereClause.assigned_to = userId;
  }
  
  // Filtrar por proveedor si es proveedor
  if (role === 'proveedor' && userId) {
    const user = await User.findByPk(userId);
    if (user && user.supplier_id) {
      whereClause.supplier_id = user.supplier_id;
    }
  }

  const stats = await Invoice.findAll({
    where: whereClause,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
    ],
    group: ['status'],
    raw: true
  });

  return stats;
};

// Método para auto-asignar facturas
Invoice.autoAssign = async function(invoiceId) {
  const workers = await User.scope('active').findAll({
    where: { role: 'trabajador_contaduria' }
  });

  if (workers.length === 0) {
    // Asignar a admin si no hay trabajadores
    const admin = await User.scope('active').findOne({
      where: { role: 'admin_contaduria' }
    });
    return admin ? admin.id : null;
  }

  // Contar facturas asignadas por trabajador
  const workersWithCount = await Promise.all(
    workers.map(async (worker) => {
      const count = await Invoice.count({
        where: { 
          assigned_to: worker.id,
          status: {
            [sequelize.Sequelize.Op.notIn]: ['proceso_completado', 'rechazada']
          }
        }
      });
      return { worker, count };
    })
  );

  // Seleccionar el trabajador con menos facturas
  const selectedWorker = workersWithCount.reduce((min, current) => 
    current.count < min.count ? current : min
  ).worker;

  return selectedWorker.id;
};

module.exports = {
  sequelize,
  User,
  Supplier,
  Invoice,
  InvoiceState,
  Payment,
  SystemLog
};