const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    number: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    assigned_to: { type: DataTypes.INTEGER, allowNull: true },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    description: { type: DataTypes.TEXT },
    status: {
        type: DataTypes.ENUM(
            'factura_subida','asignada_contaduria','en_proceso',
            'contrasena_generada','retencion_isr_generada','retencion_iva_generada',
            'pago_realizado','proceso_completado','rechazada'
        ),
        defaultValue: 'factura_subida'
    },
    priority: { type: DataTypes.ENUM('baja','media','alta','urgente'), defaultValue: 'media' },
    due_date: { type: DataTypes.DATE },
    uploaded_files: { type: DataTypes.JSON, defaultValue: [] },
    processing_data: { type: DataTypes.JSON, defaultValue: {} }
}, {
    tableName: 'invoices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Invoice;
