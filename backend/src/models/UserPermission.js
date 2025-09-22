/**
 * Modelo UserPermission - Sistema de permisos granulares por usuario
 * 
 * Implementa control de acceso fino complementando el sistema de roles
 * Permite otorgar o revocar permisos específicos independientemente del rol base
 * 
 * Estructura de permisos:
 * - Formato: [módulo].[acción] (ej: facturas.ver, usuarios.crear)
 * - Módulos: facturas, usuarios, proveedores, dashboard
 * - Acciones: ver, crear, editar, eliminar, asignar, aprobar
 * 
 * Casos de uso:
 * - Trabajador que necesita permisos adicionales temporalmente
 * - Restricción específica para un usuario sin cambiar su rol
 * - Permisos especiales para usuarios de proveedores
 * 
 * El campo 'granted' permite:
 * - true: Conceder permiso explícito (override del rol)
 * - false: Revocar permiso específico (restrict del rol)
 * 
 * Relaciones:
 * - Pertenece a User (user_id) con eliminación en cascada
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserPermission = sequelize.define('UserPermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'ID del usuario propietario del permiso (eliminación en cascada)'
  },
  permission_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Clave del permiso en formato módulo.acción (ej: facturas.ver, usuarios.crear)'
  },
  granted: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'true = permiso concedido, false = permiso revocado (override del rol base)'
  }
}, {
  tableName: 'user_permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'permission_key'],
      name: 'unique_user_permission',
      comment: 'Previene permisos duplicados para el mismo usuario y acción'
    },
    {
      fields: ['user_id'],
      name: 'idx_user_permissions_user_id',
      comment: 'Índice para consultar todos los permisos de un usuario'
    },
    {
      fields: ['permission_key'],
      name: 'idx_user_permissions_permission_key',
      comment: 'Índice para consultar usuarios con un permiso específico'
    }
  ],
  comment: 'Sistema de permisos granulares que complementa los roles base del sistema'
});

module.exports = UserPermission;