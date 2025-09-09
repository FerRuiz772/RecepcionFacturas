const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const sequelize = require('../config/database');

const InvoiceState = sequelize.define('InvoiceState', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => crypto.randomUUID()
  },
  invoice_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'invoice_id'
  },
  from_state: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'from_state'
  },
  to_state: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'to_state'
  },
  user_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'user_id'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'invoice_states',
  timestamps: false,
  underscored: true,
  freezeTableName: true
});

// Definir asociaciones
InvoiceState.associate = function(models) {
  InvoiceState.belongsTo(models.Invoice, {
    foreignKey: 'invoice_id',
    as: 'invoice'
  });
  
  InvoiceState.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

module.exports = InvoiceState;