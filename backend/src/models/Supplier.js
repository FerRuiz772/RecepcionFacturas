const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Modelo de Proveedor - Representa a las empresas que suben facturas al sistema
 * Almacena información comercial, fiscal y de contacto de los proveedores
 * Relacionado con usuarios tipo 'proveedor' y con las facturas que suben
 */
const Supplier = sequelize.define('Supplier', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    business_name: { 
        type: DataTypes.STRING, 
        allowNull: false,
        comment: 'Razón social o nombre comercial del proveedor'
    },
    nit: { 
        type: DataTypes.STRING(20), 
        allowNull: false, 
        unique: true,
        comment: 'Número de Identificación Tributaria (NIT) único del proveedor'
    },
    contact_phone: { 
        type: DataTypes.STRING(20),
        comment: 'Teléfono principal de contacto del proveedor'
    },
    address: { 
        type: DataTypes.TEXT,
        comment: 'Dirección física completa del proveedor'
    },
    bank_details: { 
        type: DataTypes.JSON, 
        defaultValue: {},
        comment: 'Información bancaria del proveedor (cuenta, banco, etc.) en formato JSON'
    },
    tipo_proveedor: {
        type: DataTypes.ENUM(
            'definitiva',
            'pagos_trimestrales',
            'pequeno_contribuyente',
            'pagos_trimestrales_retencion'
        ),
        allowNull: false,
        defaultValue: 'definitiva',
        comment: 'Tipo fiscal del proveedor que determina qué documentos debe subir en sus facturas'
    },
    is_active: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true,
        comment: 'Indica si el proveedor está activo y puede operar en el sistema'
    }
}, {
    tableName: 'suppliers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = Supplier;
