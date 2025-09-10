const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    password_generated: {
        type: DataTypes.STRING
    },
    isr_retention_file: {
        type: DataTypes.STRING
    },
    iva_retention_file: {
        type: DataTypes.STRING
    },
    payment_proof_file: {
        type: DataTypes.STRING
    },
    completion_date: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Payment;
