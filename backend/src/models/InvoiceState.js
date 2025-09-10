const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceState = sequelize.define('InvoiceState', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    invoice_id: {
        type: DataTypes.INTEGER,
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
        type: DataTypes.INTEGER,
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

module.exports = InvoiceState;