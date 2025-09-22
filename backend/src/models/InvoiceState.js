/**
 * Modelo InvoiceState - Historial de cambios de estado de facturas
 * 
 * Registra todas las transiciones de estado de las facturas para auditoría
 * Permite rastrear el flujo completo de una factura desde creación hasta completado
 * Incluye información del usuario que realizó el cambio y notas explicativas
 * 
 * Relaciones:
 * - Pertenece a Invoice (invoice_id)
 * - Pertenece a User (user_id) - usuario que realizó el cambio
 * 
 * Estados típicos del workflow:
 * - factura_subida → asignada_contaduria
 * - asignada_contaduria → en_proceso  
 * - en_proceso → contrasena_generada
 * - contrasena_generada → retencion_isr_generada
 * - retencion_isr_generada → retencion_iva_generada
 * - retencion_iva_generada → pago_realizado
 * - pago_realizado → proceso_completado
 * - cualquier_estado → rechazada
 */

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
        field: 'invoice_id',
        comment: 'ID de la factura que cambió de estado'
    },
    from_state: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'from_state',
        comment: 'Estado anterior (null para el primer estado)'
    },
    to_state: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'to_state',
        comment: 'Estado al que cambió la factura'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        comment: 'ID del usuario que realizó el cambio de estado'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas explicativas del cambio (especialmente útil para rechazos)'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        comment: 'Momento exacto del cambio de estado'
    }
}, {
    tableName: 'invoice_states',
    timestamps: false, // Manejamos timestamp manualmente
    underscored: true,
    freezeTableName: true,
    comment: 'Historial de cambios de estado de facturas para auditoría y seguimiento'
});

module.exports = InvoiceState;