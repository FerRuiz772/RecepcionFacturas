/**
 * Modelo SystemLog - Registro de auditoría del sistema
 * 
 * Registra todas las acciones importantes del sistema para auditoría y debugging
 * Permite rastrear qué usuario hizo qué acción, cuándo y desde dónde
 * 
 * Tipos de acciones registradas:
 * - Autenticación: login, logout, password_reset
 * - Facturas: create, update, delete, status_change, file_upload
 * - Usuarios: create, update, delete, permission_change
 * - Proveedores: create, update, delete
 * - Seguridad: failed_login, suspicious_activity
 * 
 * Información capturada:
 * - Usuario que realizó la acción (si está autenticado)
 * - Tipo y entidad afectada para referencia cruzada
 * - Información técnica: IP, User-Agent para seguridad
 * - Detalles adicionales en JSON para contexto específico
 * 
 * Relaciones:
 * - Pertenece a User (user_id) - puede ser null para acciones anónimas
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemLog = sequelize.define('SystemLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID del usuario que realizó la acción (null para acciones anónimas)'
    },
    action: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Tipo de acción realizada (login, create_invoice, update_user, etc.)'
    },
    entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Tipo de entidad afectada (invoice, user, supplier, etc.)'
    },
    entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID de la entidad específica afectada'
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Dirección IP del cliente (soporta IPv4 e IPv6)'
    },
    user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'User-Agent del navegador para análisis de seguridad'
    },
    details: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Detalles adicionales específicos de la acción en formato JSON'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Momento exacto cuando se realizó la acción'
    }
}, {
    tableName: 'system_logs',
    timestamps: false, // Manejamos timestamp manualmente
    comment: 'Registro de auditoría completo de acciones del sistema',
    indexes: [
        {
            fields: ['user_id'],
            comment: 'Índice para consultar logs por usuario'
        },
        {
            fields: ['action'],
            comment: 'Índice para filtrar por tipo de acción'
        },
        {
            fields: ['entity_type', 'entity_id'],
            comment: 'Índice compuesto para consultar logs de entidades específicas'
        },
        {
            fields: ['timestamp'],
            comment: 'Índice para consultas cronológicas y limpieza por fecha'
        }
    ]
});

module.exports = SystemLog;