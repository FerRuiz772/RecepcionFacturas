const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Modelo de Factura - Núcleo del sistema de gestión de pagos
 * Maneja el flujo completo desde la subida inicial hasta la finalización del proceso
 * Incluye estados de workflow, archivos asociados y datos de procesamiento
 */
const Invoice = sequelize.define('Invoice', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    number: { 
        type: DataTypes.STRING(100), 
        allowNull: false, 
        unique: true,
        comment: 'Número único de la factura proporcionado por el proveedor'
    },
    supplier_id: { 
        type: DataTypes.INTEGER, 
        allowNull: false,
        comment: 'ID del proveedor que subió la factura'
    },
    assigned_to: { 
        type: DataTypes.INTEGER, 
        allowNull: true,
        comment: 'ID del usuario de contaduría asignado para procesar la factura'
    },
    amount: { 
        type: DataTypes.DECIMAL(15, 2), 
        allowNull: false,
        validate: {
            isDecimal: true,
            min: {
                args: [0],
                msg: "El monto no puede ser negativo"
            }
        },
        comment: 'Monto total de la factura en quetzales'
    },
    description: { 
        type: DataTypes.TEXT,
        comment: 'Descripción detallada de los productos/servicios facturados'
    },
    status: {
        type: DataTypes.ENUM(
            'factura_subida',           // Factura recién subida por proveedor
            'asignada_contaduria',      // Asignada a trabajador de contaduría
            'en_proceso',               // En proceso de revisión/validación
            'contrasena_generada',      // Contraseña para documentos generada
            'retencion_isr_generada',   // Retención ISR completada
            'retencion_iva_generada',   // Retención IVA completada
            'pago_realizado',           // Pago ejecutado
            'proceso_completado',       // Proceso totalmente finalizado
            'rechazada'                 // Factura rechazada por algún motivo
        ),
        defaultValue: 'factura_subida',
        comment: 'Estado actual de la factura en el workflow de procesamiento'
    },
    priority: { 
        type: DataTypes.ENUM('baja','media','alta','urgente'), 
        defaultValue: 'media',
        comment: 'Prioridad de procesamiento de la factura'
    },
    due_date: { 
        type: DataTypes.DATE,
        comment: 'Fecha límite para el procesamiento de la factura'
    },
    uploaded_files: { 
        type: DataTypes.JSON, 
        defaultValue: [],
        comment: 'Array con información de archivos subidos (factura, documentos adicionales)'
    },
    processing_data: { 
        type: DataTypes.JSON, 
        defaultValue: {},
        comment: 'Datos adicionales del procesamiento (observaciones, pasos completados, etc.)'
    }
}, {
    tableName: 'invoices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = Invoice;
