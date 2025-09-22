const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Modelo de Pago - Maneja los documentos y pasos del proceso de pago de facturas
 * Almacena archivos generados durante el procesamiento (contraseñas, retenciones, comprobantes)
 * Relación 1:1 con Invoice, representa los datos específicos del proceso de pago
 */
const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        comment: 'ID de la factura asociada (relación 1:1)'
    },
    password_generated: {
        type: DataTypes.STRING,
        comment: 'Contraseña generada para proteger documentos sensibles'
    },
    password_file: {
        type: DataTypes.STRING,
        comment: 'Ruta del archivo que contiene la contraseña subido por contaduría'
    },
    isr_retention_file: {
        type: DataTypes.STRING,
        comment: 'Ruta del archivo de retención de ISR generado'
    },
    iva_retention_file: {
        type: DataTypes.STRING,
        comment: 'Ruta del archivo de retención de IVA generado'
    },
    payment_proof_file: {
        type: DataTypes.STRING,
        comment: 'Ruta del comprobante de pago realizado'
    },
    completion_date: {
        type: DataTypes.DATE,
        comment: 'Fecha y hora cuando se completó todo el proceso de pago'
    }
}, {
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = Payment;
